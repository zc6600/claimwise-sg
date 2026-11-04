# 🇸🇬 ClaimWise SG · Cloud Deployment & Access Guide

This guide details all methods for deploying and accessing the ClaimWise SG motor insurance decision support SaaS.

---

## 1. Local Production Deployment (Active)

The production bundle is currently built and actively serving on **port 3000**.

### Running the Production Server
```bash
# 1. Ensure dependencies are installed
npm install

# 2. Build production assets
npm run build

# 3. Start production server
npm run start -- -p 3000
```

### Access URLs
- **Web App**: `http://localhost:3000`
- **Calculator**: `http://localhost:3000/calculator`
- **Health Check**: `http://localhost:3000/api/health`
- **Clause Preview (Iframe)**: `http://localhost:3000/api/clause-preview?id=workshop_surcharge&insurer=etiqa`

---

## 2. Firebase Cloud Database Deployment

ClaimWise SG uses Google Cloud Firestore in Singapore (`asia-southeast1`) for calculation record persistence.

### Deploying Firestore Rules
The project is configured with `.firebaserc` targeting the active project `claimwise-sg`.

```bash
firebase deploy --only firestore:rules --project claimwise-sg
```

### Environment Configuration (`.env.local`)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCz7WYNRb0Nm6WCqfTUlaa3qmCFnarFpOY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=claimwise-sg.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=claimwise-sg
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=claimwise-sg.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=721110976915
NEXT_PUBLIC_FIREBASE_APP_ID=1:721110976915:web:a6a137a0037af6852e0066
```

---

## 3. Serverless Cloud Run Deployment (GCP)

To deploy ClaimWise SG as a containerized microservice on Google Cloud Run in Singapore (`asia-southeast1`):

```bash
# 1. Set your GCP project
gcloud config set project claimwise-sg

# 2. Build and deploy container directly using Cloud Build and Cloud Run
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

Cloud Run will provide a secure HTTPS endpoint (e.g. `https://claimwise-sg-xxxx-as.a.run.app`).

---

## 4. Vercel Serverless Edge Deployment

Next.js 15 App Router is natively optimized for Vercel:

```bash
# Deploy to Vercel production
npx vercel --prod
```

Configure the environment variables (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, Firebase vars) in the Vercel Project Dashboard.

---

## 5. Infrastructure as Code (Terraform)

The [`infra/terraform`](../infra/terraform) folder contains complete Terraform configurations for GCP:
- Google Cloud Project APIs (Identity Toolkit, Firestore, Firebase)
- Native Firestore database in `asia-southeast1`
- Google Identity Platform Authorized Domains

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

---

## 6. Official Insurer Policy PDF Wording & Iframe Hover System (Solution 2)

ClaimWise SG self-hosts public source documents from insurer and GIA websites in `public/policies/`:

| Insurer / Body | Official source document | Pages |
| :--- | :--- | :---: |
| **Etiqa Insurance** | [`etiqa_tiq_motor_policy.pdf`](../public/policies/etiqa_tiq_motor_policy.pdf) ([official source](https://www.etiqa.com.sg/wp-content/uploads/2026/02/Private-Car-Insurance-Policy-Wording-v19.pdf)) | 24 |
| **Income Insurance** | [`income_drivo_policy.pdf`](../public/policies/income_drivo_policy.pdf) ([official source](https://assets-au-01.kc-usercontent.com/8acbd32f-b7e0-0294-6b7d-a2bc72d6b30c/ad09ba9c-acc3-4c91-89af-406a36f7f717/GPC%20Policy%20092026%20V1.pdf)) | 10 |
| **MSIG Insurance** | [`msig_motormax_policy.pdf`](../public/policies/msig_motormax_policy.pdf) ([official source](https://www.msig.com.sg/sites/msig_sg/files/downloads/MotorMax_Policy.pdf)) | 20 |
| **GIA Singapore** | [`gia_motor_claims_framework.pdf`](../public/policies/gia_motor_claims_framework.pdf) ([official source](https://gia.org.sg/images/pdf-files/MCF_Brochure.pdf)) | 5 |

The PDFs are downloaded from official public webpages. The Income document is the current Drivo policy conditions, not the legacy Drivesafe product. Page references shown in the UI are navigation aids and must be checked against the policy version and the customer's schedule; they do not establish that a particular excess or endorsement applies.

### Native RFC 3778 PDF Page Anchoring in `<iframe>`
Modern desktop and mobile browsers natively interpret URL fragment parameters:
```html
<iframe src="/policies/etiqa_tiq_motor_policy.pdf#page=5&view=FitH" />
```
- **Same-Origin Hosting**: Eliminates `X-Frame-Options` and CORS blocks common on external insurer sites.
- **Hover & Pin Preview**: In calculator results, hover over, focus, or click a clause row in `PolicySourcePreview` to open the official PDF at its mapped page (`Official PDF` vs. `Clause summary` modes), pin the active clause (`📌 Pin`), or open the full PDF tab (`Full tab ↗`).
- **Printable PDF Report**: Clicking `Print / PDF` formats the results with a parameter summary header, auto-expanded year-by-year renewal table, and full clause audit trail for clean A4/Letter PDF export.
- **Source Accuracy**: Page labels describe the section visible in the downloaded source. Where an excess or optional benefit depends on an individual policy schedule or rider, the preview says so; it does not invent a matching clause.

