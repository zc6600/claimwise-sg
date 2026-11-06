# Deployment & Infrastructure Guide

This guide covers local builds, Firebase configuration, Google Cloud Run deployment, Terraform provisioning, and static policy PDF hosting for **ClaimWise SG**.

---

## 1. Local Build & Verification

```bash
# 1. Install dependencies
npm install

# 2. Run the deterministic test suite (24 tests)
npm test

# 3. Build optimized production assets
npm run build

# 4. Start the local production server
npm run start -- -p 3000
```

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

---

## 4. Infrastructure as Code (Terraform)

The [`infra/terraform`](../infra/terraform) directory provisions the required GCP and Firebase resources:
- Google Cloud APIs (Identity Toolkit, Cloud Firestore, Firebase)
- Native Firestore database in `asia-southeast1`
- Identity Platform authentication configuration

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
