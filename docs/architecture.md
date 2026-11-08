# Decision and History Data Flow

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
