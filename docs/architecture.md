# ClaimWise SG Architecture

## 1. Decision Calculation and Persistence

The home estimator and calculator send inputs to `POST /api/decision`, where the deterministic decision engine calculates the multi-year actuarial comparison. The home estimator debounces input changes by 500 ms before requesting an estimate. The full calculator requests a decision when the user submits or explicitly recalculates a comparison.

### Authentication & Token Verification
For a signed-in user, the calculator passes the Firebase ID token in the `Authorization: Bearer <token>` header and sets `persist: true`. The server-side storage module (`lib/server-calculation-storage.js`) enforces strict pre-flight token claims verification:
1. Validates payload length (max 8,192 bytes) and standard 3-part JWT base64url structure.
2. Asserts token expiration (`claims.exp * 1000 > Date.now()`).
3. Asserts audience (`claims.aud === projectId`) and issuer (`claims.iss === https://securetoken.google.com/${projectId}`).
4. Validates user ID formatting via regex (`/^[A-Za-z0-9_-]{1,128}$/`).

The calculation record is committed via the Google Cloud Firestore REST API scoped directly to `users/{userId}/calculations/{calcId}`. Google Cloud Firestore cryptographically validates the token signature and enforces declarative access control defined in `firestore.rules`.

### Guest Storage & Cloud Synchronization
- **Guests**: Users without an active session save calculation records directly to browser `localStorage` (`claimwise_local_history`, capped at 20 recent records).
- **Offline / Cloud Fallback**: If Firestore is unavailable or offline, signed-in users seamlessly fall back to browser local storage so no calculation data is discarded.
- **Guest-to-Cloud Auto-Sync**: When a guest subsequently logs in or registers, `syncLocalCalculationsToCloud(user)` reads pending browser history and migrates records to the user's Firestore subcollection.

## 2. Parameter Sharing & Link Reproduction

The calculator supports full-fidelity state sharing via URL query parameters:
- **Full Serialization**: All 14 decision parameters (`insurer`, `repairCost`, `currentPremium`, `currentNcd`, `excess`, `horizonYears`, `liability`, `workshopType`, `repairType`, `ncdProtector`, `youngDriverInvolved`, `thirdPartyClaim`, `baseGrowthRate`, `discountRate`) are encoded into the URL.
- **Dirty State Resolution**: When users modify inputs without submitting, the share action automatically captures the active form state (`isDirty ? inputs : (submittedInputs || inputs)`).
- **Auto-Calculation on Load**: When receiving a shared URL, parameters are validated and loaded once auth loading settles, immediately executing the comparison to reproduce identical recommendations and metrics for the receiver.

## 3. History Access and Result Semantics

History subscriptions and deletions use the Firebase Web SDK in the client (`components/CalculationHistory.jsx`). The history badge reflects realtime snapshot metadata, including initial cache state, pending writes, confirmed server state, and browser fallback.

- **Saved Result Viewing**: Opening a historical record with a stored `decision` object displays that exact snapshot without recalculating it.
- **Recalculation**: Clicking **Recalculate & save** sends the saved inputs to the current decision engine and saves the refreshed output as a new comparison record.

## 4. Infrastructure and Release Pipeline

Infrastructure is declared in `infra/terraform`, with state in the private, versioned bucket `gs://claimwise-sg-tfstate`:
- **GCP APIs**: Identity Toolkit, Firebase, Firestore, Firebase Rules, Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Cloud Scheduler, IAM, IAM Credentials, and STS.
- **Database & Security Rules**: Native Firestore database in `asia-southeast1` (Singapore) linked to `firestore.rules` via `google_firebaserules_ruleset` and `google_firebaserules_release`.
- **Identity & Auth**: Identity Platform authorized domains and the Google Sign-In IdP.
- **Serverless Runtime**: Cloud Run v2 service (0–10 instances, port 3000) with reminder settings and secrets mounted from Secret Manager.
- **Reminder Dispatch**: A Cloud Scheduler job calls `POST /api/reminders/dispatch` daily at 09:00 Singapore time with an OIDC token for the `reminder-scheduler` account.
- **Continuous Deployment**: A Workload Identity pool lets GitHub Actions on `main` impersonate `github-deployer`, which may only build from source and roll out revisions.

Terraform owns runtime configuration but ignores the container image. Each merge to `main` triggers `.github/workflows/deploy.yml`, which runs the tests, deploys the source with `gcloud run deploy`, and smoke-tests the live service.

## 5. Car Decision Tools

The four tools under `/tools` are client components (`components/tools/`) that call pure, deterministic functions in `src/car-decisions/`. They make no API requests and store nothing on the server.

| Tool | Module | Decision rule |
| --- | --- | --- |
| NCD Protector (`/tools/ncd-protector`) | `ncd-protector.mjs` | Reuses `calculateDecision` to price the five-year renewal-premium loss of one at-fault claim with and without the rider. Break-even probability = rider cost ÷ loss avoided; a 0.25-point band around it is reported as neutral. |
| Quote comparison (`/tools/quote-compare`) | `quote-comparison.mjs` | Ranks 2–4 quotes by premium + claim probability × min(repair cost, excess + workshop surcharge). NCD effects are excluded because a claim affects every quote equally. |
| COE renewal (`/tools/coe-renewal`) | `coe-renewal.mjs` | Compares 5-year renewal, 10-year renewal, and replacement by equivalent annual cost. The deregistration value (PARF by registration cohort, pro-rated COE rebate, scrap value) is an opportunity cost of both renewals. Road tax gains 10% per year of age past 10, up to 50%. |
| Loan settlement (`/tools/loan-prepayment`) | `loan-prepayment.mjs` | Settlement = remaining instalments − Rule of 78 rebate + rebate fee + penalty + admin fee, compared with the present value of continuing at the alternative return; a bisection search reports the break-even return. |

Shared helpers in `shared.mjs` bound every input, so malformed values fall back to safe defaults instead of producing `NaN`.

## 6. My Car

`/my-car` stores one car per viewer: a label, insurance renewal, COE expiry, and loan review dates, plus premium, NCD, and excess. Registration numbers are not collected. `src/my-car.mjs` normalises records and ranks upcoming decisions by urgency.

- **Storage**: Every save writes a browser copy (`claimwise_my_car`) tagged with the owner's UID. Signed-in users also write `users/{uid}/vehicles/primary` through the Firebase Web SDK. `firestore.rules` permits only the `primary` document, only for its owner, and only with whitelisted, range-checked fields.
- **Reconciliation** (`components/my-car/useMyCar.js`): After sign-in, the account copy wins. Details entered while signed out are uploaded only when the account has none. A copy saved by another account is never shown or adopted, so shared browsers do not mix data.
- **Prefill**: The NCD Protector and quote comparison tools read the saved premium, NCD, and excess.

## 7. Email Reminders

Reminders are optional, double opt-in emails sent before insurance renewal (45 days), COE expiry (365 and 90 days), and loan review (30 days). Each email links to the matching tool.

### Request Flow

| Route | Purpose |
| --- | --- |
| `POST /api/reminders` | Starts sign-up and sends a confirmation email |
| `POST /api/reminders/confirm` | Activates a subscription from a confirmation token |
| `POST /api/reminders/manage` | Reads or updates dates from a manage token; clearing all dates deletes the subscription |
| `POST /api/reminders/unsubscribe` | Deletes the subscription; also serves one-click `List-Unsubscribe` |
| `GET /api/reminders/unsubscribe` | Redirects to the manage page, because mail scanners prefetch links |
| `POST /api/reminders/dispatch` | Daily delivery; accepts only a Google ID token for the scheduler account and dispatch audience |

`lib/reminders/runtime.js` returns no service until `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`, `REMINDER_SITE_URL`, and a `REMINDER_TOKEN_SECRET` of at least 32 characters are set; the routes then respond with 503.

### Privacy and Abuse Controls

- **Identifiers**: The subscription ID is an HMAC of the normalised email, so addresses never appear in document paths. Confirmation tokens (valid for about seven days) and manage tokens are HMAC-signed and compared in constant time.
- **No enumeration**: Sign-up responses never reveal whether an address is subscribed. An existing active subscriber receives a manage link instead of a new confirmation.
- **Rate limits**: Ten sign-ups per client per hour per instance, a 24-hour resend cooldown per address, and a shared daily cap of 200 sign-up emails stored in Firestore. A hidden form field silently discards automated submissions.
- **Storage**: `reminderSubscriptions` is written only by the server through the Firestore REST API with the Cloud Run service account; client access is denied by the default rule. Unsubscribing, clearing all dates, or receiving the final reminder deletes the record, including the address.

### Dispatch

Cloud Scheduler calls the dispatch route at 09:00 Singapore time. Each run deletes unconfirmed subscriptions past expiry and yesterday's quota record, then processes up to 200 due subscriptions ordered by `nextReminderDate`:

1. **Send first, record after**: A reminder key is stored only after Resend accepts the email. Resend idempotency keys (`{subscriptionId}:{reminderKey}`) suppress duplicates from overlapping runs or failed writes.
2. **Optimistic concurrency**: Writes use the document's `updateTime` precondition; a conflict skips the record without data loss.
3. **Failure isolation**: A failed delivery moves `nextReminderDate` to tomorrow so repeated failures cannot crowd out other due records.
4. **Yearly renewals**: Insurance renewal repeats each year; the 12 most recent reminder keys are kept to prevent repeats.
