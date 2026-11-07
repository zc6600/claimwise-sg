# Deployment & Infrastructure Guide

This guide covers local development setup on any machine, environment configuration, Firebase authentication, Google Cloud Run serverless deployment, Terraform IaC provisioning, and troubleshooting for **ClaimWise SG**.

---

## Production Deployment Reference

ClaimWise SG is deployed in production on Google Cloud Platform and Firebase:

| Component | Target URL / Resource | Configuration |
| :--- | :--- | :--- |
| **Live Application** | **[https://claimwise-sg-721110976915.asia-southeast1.run.app](https://claimwise-sg-721110976915.asia-southeast1.run.app)** | Google Cloud Run v2 (managed serverless container) |
| **Firebase Web App Mirror** | **[https://claimwise-sg.web.app](https://claimwise-sg.web.app)** · [https://claimwise-sg.firebaseapp.com](https://claimwise-sg.firebaseapp.com) | Edge-cached Firebase Hosting distribution |
| **GCP Project** | `claimwise-sg` | Google Cloud project hosting Cloud Run and Firebase |
| **Region** | `asia-southeast1` (Singapore) | Co-located in Singapore for minimal network latency |
| **Database** | Google Cloud Firestore | Native mode in `asia-southeast1` with user-scoped `firestore.rules` |
| **Authentication** | Google Identity Platform / Firebase Auth | Authorized domains: `localhost:3000`, `claimwise-sg.firebaseapp.com`, `claimwise-sg.web.app`, `claimwise-sg-721110976915.asia-southeast1.run.app` |
| **Health Check** | [`/api/health`](https://claimwise-sg-721110976915.asia-southeast1.run.app/api/health) | Uptime and service status monitor |

---

## 1. Quick Setup on Any Machine (New Environment & Collaborator Setup)

ClaimWise SG is engineered with a **zero local database footprint**:
- The actuarial decision engine runs as pure ECMAScript modules (`src/decision-engine.mjs`) on the server and client.
- You do **not** need to install PostgreSQL, MySQL, Redis, or Docker just to run and test the application locally.
- In guest mode, calculation comparisons persist in browser `localStorage`.
- [`lib/firebase-config.js`](../lib/firebase-config.js) contains public demo project fallbacks, allowing the app and Google OAuth (`localhost:3000` is pre-authorized) to function immediately without creating `.env.local`.

### Prerequisites
* **Node.js**: `>= 20.0.0` (Run `node -v` to check; required for native `node:test` and React 19 / Next.js 15).
* **Git**: To clone the repository.

### Step-by-Step Local Run
```bash
# 1. Clone repository
git clone https://github.com/zc6600/claimwise-sg.git
cd claimwise-sg

# 2. Install dependencies (Next.js 15, React 19, Firebase SDK)
npm install

# 3. Run the deterministic test suite (52 tests, 0 failures required)
npm test

# 4. Start local development server (or npm run build && npm run start for production)
npm run dev
```

Open `http://localhost:3000` in your browser.

### Key Local Routes
- **Home & Quick Estimator**: `http://localhost:3000`
- **Full Decision Calculator**: `http://localhost:3000/calculator`
- **Insurer Rules & NCD Schedule**: `http://localhost:3000/rules`
- **Methodology**: `http://localhost:3000/how-it-works`
- **Health Check**: `http://localhost:3000/api/health`
- **Clause PDF Preview**: `http://localhost:3000/api/clause-preview?id=workshop_surcharge&insurer=etiqa`

---

## 2. Environment Configuration & Firebase

Copy `.env.example` to `.env.local` and supply your Firebase web app configuration:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=claimwise-sg.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=claimwise-sg
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=claimwise-sg.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Deploying Firestore Security Rules
Calculation history is stored in Google Cloud Firestore (`asia-southeast1`) under user-isolated security rules defined in [`firestore.rules`](../firestore.rules):

```bash
firebase deploy --only firestore:rules --project claimwise-sg
```

---

## 3. Google Cloud Run Deployment

To deploy ClaimWise SG as a serverless container on Google Cloud Run in Singapore (`asia-southeast1`):

```bash
gcloud config set project claimwise-sg

gcloud run deploy claimwise-sg \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### Production Service Verification
After deployment completes, Cloud Run outputs the live HTTPS endpoint:
```text
Service URL: https://claimwise-sg-721110976915.asia-southeast1.run.app
```

Verify service health via curl:
```bash
curl -s https://claimwise-sg-721110976915.asia-southeast1.run.app/api/health | jq .
```
Expected response:
```json
{
  "ok": true,
  "service": "claimwise-sg-api",
  "status": "ready",
  "framework": "nextjs",
  "rulesStore": "versioned-code-config",
  "persistence": "authenticated-firestore",
  "timestamp": "2026-11-07T08:00:00.000Z"
}
```

---

## 4. Infrastructure as Code (Terraform)

The [`infra/terraform`](../infra/terraform) directory provisions the required GCP and Firebase resources:
- Google Cloud APIs (Identity Toolkit, Cloud Firestore, Firebase, Firebase Security Rules, Cloud Run v2)
- Native Firestore database in `asia-southeast1` (Singapore)
- Declarative Firestore Security Rules deployment (`firestore.rules` via `google_firebaserules_ruleset` and `google_firebaserules_release`)
- Identity Platform authentication configuration, authorized domains, and Google OAuth 2.0 provider
- Serverless Cloud Run v2 service with auto-scaling (0–10 instances) and public HTTPS access

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

---

## 5. Official Insurer Policy PDF Hosting

ClaimWise SG hosts public policy wording PDFs in `public/policies/` so they can be embedded same-origin without external CORS or `X-Frame-Options` restrictions:

| Insurer / Body | Local File | Pages |
| :--- | :--- | :---: |
| **Etiqa Insurance** | [`public/policies/etiqa_tiq_motor_policy.pdf`](../public/policies/etiqa_tiq_motor_policy.pdf) | 24 |
| **Income Insurance** | [`public/policies/income_drivo_policy.pdf`](../public/policies/income_drivo_policy.pdf) | 10 |
| **MSIG Insurance** | [`public/policies/msig_motormax_policy.pdf`](../public/policies/msig_motormax_policy.pdf) | 20 |
| **GIA Singapore** | [`public/policies/gia_motor_claims_framework.pdf`](../public/policies/gia_motor_claims_framework.pdf) | 5 |

### Page-Anchored Preview Architecture
- Page mappings are maintained in [`lib/clause-documents.js`](../lib/clause-documents.js) using 1-based physical PDF page numbers (`#page=N&view=FitH`).
- In the calculator results panel, [`components/PolicySourcePreview.jsx`](../components/PolicySourcePreview.jsx) lets users hover or click any clause row to inspect the matching PDF page, toggle between **Official PDF** and **Clause summary** views, pin a clause open (`📌 Pin`), or export a formatted summary via **Print / PDF**.

---

## 6. Troubleshooting & Common Pitfalls

### 1. `node -v` Version Mismatch
* **Symptom**: `npm test` fails with unrecognized `--test` flag or syntax error on native ESM modules.
* **Cause**: Node.js version is below `v20.0.0` (e.g. Node 16 or 18).
* **Fix**: Install or switch to Node 20 or Node 22 via `nvm`:
  ```bash
  nvm install 20
  nvm use 20
  ```

### 2. Google Sign-In Fails with `auth/unauthorized-domain`
* **Symptom**: Clicking "Sign in with Google" prompts an error: *"This domain is not yet authorized in Firebase Authentication."*
* **Cause**: Deploying to a new custom domain, preview branch URL, or newly deployed Cloud Run service URL that has not been whitelisted in Google Identity Platform.
* **Fix**:
  1. Open [Firebase Console](https://console.firebase.google.com/) -> Select your project -> **Authentication** -> **Settings** -> **Authorized domains**.
  2. Click **Add domain** and enter your new hostname (e.g. `your-app-xxxx.asia-southeast1.run.app`).
  3. Alternatively, update `authorized_domains` in `infra/terraform/variables.tf` and run `terraform apply`.

### 3. Firestore Permission Denied on Cloud Save
* **Symptom**: Calculator displays *"Saved in browser (cloud unavailable)"* instead of *"Saved to cloud"*.
* **Cause**: `firestore.rules` has not been published to your target GCP/Firebase project.
* **Fix**:
  ```bash
  firebase deploy --only firestore:rules --project <YOUR_PROJECT_ID>
  # Or via Terraform:
  cd infra/terraform && terraform apply
  ```
