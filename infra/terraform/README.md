# ClaimWise SG · Terraform Infrastructure as Code

This directory defines the declarative **Infrastructure as Code (IaC)** configuration for ClaimWise SG using Terraform (`google` and `google-beta` providers).

---

## Provisioned Resources

1. **Google Cloud APIs**:
   - `identitytoolkit.googleapis.com` (Identity Platform / Firebase Auth)
   - `firebase.googleapis.com` (Firebase Management)
   - `firestore.googleapis.com` (Cloud Firestore)
   - `run.googleapis.com` (Cloud Run v2)
2. **Database & Identity**:
   - Native Cloud Firestore database `(default)` in `asia-southeast1` (Singapore).
   - Firebase Project binding and Web App registration (`ClaimWiseWeb`).
   - Identity Platform authorized domains and Google OAuth 2.0 Sign-In provider.
3. **Serverless Application Runtime**:
   - `google_cloud_run_v2_service.claimwise_app` (`asia-southeast1`, `0–10` auto-scaling instances, `1 vCPU`, `1 GiB` memory, port `3000`).
   - `google_cloud_run_v2_service_iam_member.public_access` (`roles/run.invoker` for `allUsers`).

---

## Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Populate google_client_id, google_client_secret, and optional container_image

terraform init
terraform plan
terraform apply
```
