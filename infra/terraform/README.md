# ClaimWise SG · Cloud Infrastructure as Code (Terraform)

This directory contains the 100% declarative **Infrastructure as Code (IaC)** configuration for ClaimWise SG using Terraform and the official Google Cloud / Google-Beta provider.

---

## 🏛️ Architecture Overview

The IaC manifests declare and orchestrate:
1. **Google Identity Platform (GCIP)**:
   - Enables `identitytoolkit.googleapis.com` & `firebase.googleapis.com`.
   - Provisions Google Sign-In IdP provider with OAuth Client ID and Secret.
   - Configures Authorized Redirection Domains (`localhost`, `127.0.0.1`, `claimwise-sg.firebaseapp.com`, `claimwise-sg.web.app`).
2. **Firebase Project Association**:
   - Links the GCP project (`claimwise-sg`) to Firebase services.
   - Provisions the Web Client Application (`ClaimWiseWeb`).

---

## 🚀 Usage

### 1. Prerequisites
- [Terraform](https://developer.hashicorp.com/terraform/install) `>= 1.5.0`
- Authenticated Google Cloud CLI:
  ```bash
  gcloud auth application-default login
  ```

### 2. Configure Variables
Copy `terraform.tfvars.example` to `terraform.tfvars`:
```bash
cp terraform.tfvars.example terraform.tfvars
```
Fill in `google_client_secret` with your actual secret.

### 3. Initialize & Deploy
```bash
terraform init
terraform plan
terraform apply
```

### 4. Importing Existing Resources
Since we already provisioned these resources via CLI, you can import them into Terraform state anytime:
```bash
terraform import google_project_service.identity_toolkit claimwise-sg/identitytoolkit.googleapis.com
terraform import google_identity_platform_default_supported_idp_config.google_signin projects/claimwise-sg/defaultSupportedIdpConfigs/google.com
terraform import google_firebase_web_app.web_client projects/claimwise-sg/webApps/1:721110976915:web:a6a137a0037af6852e0066
```
