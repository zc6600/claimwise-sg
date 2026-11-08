# ClaimWise SG · Terraform Infrastructure

Terraform is the source of truth for ClaimWise SG infrastructure. Application code is released separately by `.github/workflows/deploy.yml`; infrastructure changes are applied by `.github/workflows/terraform.yml`.

## State

State lives in the private, versioned GCS bucket `gs://claimwise-sg-tfstate` (prefix `terraform/state`), configured in `backend.tf`. Commit `.terraform.lock.hcl` whenever provider versions change.

## Managed Resources

1. **APIs**: Identity Toolkit, Firebase, Firestore, Firebase Rules, Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Cloud Scheduler, IAM, IAM Credentials, and STS.
2. **Data and identity**: Native Firestore `(default)` in `asia-southeast1`; `firestore.rules` published through a ruleset and the `cloud.firestore` release; Firebase project and `ClaimWiseWeb` web app; Identity Platform authorized domains and the Google sign-in provider.
3. **Runtime**: Cloud Run v2 service `claimwise-sg` (0–10 instances, 1 vCPU, 1 GiB, port 3000, CPU boost at startup) with public invoker access, reminder settings, and secrets mounted from Secret Manager.
4. **Reminders**: Firestore and secret access for the runtime account; the `reminder-scheduler` account and the daily 09:00 SGT dispatch job.
5. **Continuous deployment**: Workload Identity pool `github`, restricted to `main` of `zc6600/claimwise-sg`; the `github-deployer` account with source-deploy roles and the `github-terraform` account that applies this configuration.

The public hostname `claimwise.zc6600.wiki` is served by a Cloudflare Worker defined in `infra/cloudflare` and deployed with Wrangler, outside Terraform.

## Boundaries

- **Image and build metadata** are ignored, because each release builds a new image.
- **Secret values** (`RESEND_API_KEY`, `REMINDER_TOKEN_SECRET`) are created outside Terraform; only their access bindings are managed here.
- **Google OAuth client secret** is maintained in the Google Cloud console. `google_client_secret` is read only when the provider is first created.

## Credentials

Application Default Credentials locally; Workload Identity as `github-terraform` in CI.

## Continuous Delivery

`.github/workflows/terraform.yml` checks formatting and validates on pull requests that touch `infra/`. After a merge to `main`, it plans and applies in the `infrastructure` environment, which requires reviewer approval before the job starts.

## Usage

```bash
cd infra/terraform
terraform init
terraform plan    # Expect "No changes" when production matches the code
terraform apply
```

All variables default to production values. Override them with `-var` or a local `terraform.tfvars`, which is git-ignored.
