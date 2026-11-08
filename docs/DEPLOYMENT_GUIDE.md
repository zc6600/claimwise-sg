# Deployment Guide

How to run ClaimWise SG locally, how releases reach production, and how the Google Cloud infrastructure is managed. For system design, see [architecture.md](architecture.md).

## Production at a Glance

| Item | Value |
| --- | --- |
| Live site | https://claimwise.zc6600.wiki (Cloudflare Worker proxy to Cloud Run: https://claimwise-sg-721110976915.asia-southeast1.run.app) |
| GCP project / region | `claimwise-sg` / `asia-southeast1` (Singapore) |
| Runtime | Cloud Run v2 service `claimwise-sg` (0–10 instances, 1 vCPU, 1 GiB) |
| Data and auth | Firestore (native mode) and Identity Platform; rules in `firestore.rules` |
| Health check | [`/api/health`](https://claimwise.zc6600.wiki/api/health) |
| Infrastructure | Terraform, state in `gs://claimwise-sg-tfstate` |
| Releases | `.github/workflows/deploy.yml` on every merge to `main` |

---

## 1. Local Development

Requires Node.js 20 or later (`.nvmrc` pins 22). No database, Docker, or credentials are needed.

```bash
git clone https://github.com/zc6600/claimwise-sg.git
cd claimwise-sg
npm install
npm test         # all tests must pass
npm run dev      # http://localhost:3000
npm run build    # required when routes or UI change
```

Main routes: `/` (car tools hub), `/calculator`, `/my-car`, `/settlement`, `/emergency`, `/rules`, `/how-it-works`, `/privacy`, and `/api/health`.

### Environment Variables

`lib/firebase-config.js` falls back to the public `claimwise-sg` Firebase web config, and `localhost` is an authorized sign-in domain. Copy `.env.example` to `.env.local` only to change defaults:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Another Firebase project (inlined at build time) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap, and robots.txt (inlined at build time; defaults to `https://claimwise.zc6600.wiki` in `lib/site-url.js`) |
| `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`, `REMINDER_SITE_URL`, `REMINDER_TOKEN_SECRET`, `REMINDER_SCHEDULER_EMAIL` | Email reminders; the reminder API returns 503 until the first four are set |

Never commit `.env.local`.

---

## 2. Releases

| Change | Owner | How it reaches production |
| --- | --- | --- |
| Application code | GitHub Actions | Merge to `main` → tests → `gcloud run deploy --source` → smoke test |
| Infrastructure and runtime settings | Terraform | Edit `infra/terraform/*.tf` → `scripts/deploy.sh infra` |

The deploy workflow signs in through Workload Identity Federation as `github-deployer@claimwise-sg.iam.gserviceaccount.com`. Only workflows on `main` of `zc6600/claimwise-sg` can obtain credentials, and no service account key exists.

Manual fallbacks:

```bash
scripts/deploy.sh deploy   # build the committed HEAD from a clean checkout and roll it out
scripts/deploy.sh verify   # check public pages and that the reminder API is configured
scripts/deploy.sh infra    # terraform init and apply (asks for confirmation)
```

---

## 3. Infrastructure (Terraform)

All variables default to production, so no `terraform.tfvars` is needed. See [`infra/terraform/README.md`](../infra/terraform/README.md) for the resource list and boundaries.

```bash
cd infra/terraform
terraform init
terraform plan    # "No changes" means production matches the code
terraform apply
```

Terraform ignores the Cloud Run image and build metadata, because releases change them. Secret values and the Google OAuth client secret are maintained outside Terraform.

### Reminder Secrets

Create the two reminder secrets once; Terraform grants access to them, mounts them, and schedules the daily 09:00 SGT dispatch:

```bash
printf %s "<resend-api-key>" | gcloud secrets create RESEND_API_KEY \
  --project claimwise-sg --replication-policy=user-managed \
  --locations=asia-southeast1 --data-file=-

openssl rand -hex 32 | tr -d '\n' | gcloud secrets create REMINDER_TOKEN_SECRET \
  --project claimwise-sg --replication-policy=user-managed \
  --locations=asia-southeast1 --data-file=-
```

The sending domain must be verified in Resend. Rotating `REMINDER_TOKEN_SECRET` invalidates every confirmation, manage, and unsubscribe link already sent.

### Public Domain

`claimwise.zc6600.wiki` is served by the Cloudflare Worker in `infra/cloudflare`, which proxies every request to the Cloud Run URL. The Worker is deployed with `npx wrangler deploy` from that directory and only needs redeploying if the Cloud Run URL changes.

To change the public domain:

1. Change the fallback origin in `lib/site-url.js`, or set `NEXT_PUBLIC_SITE_URL` at build time.
2. Update `reminder_site_url` and add the host to `authorized_domains` in `infra/terraform/variables.tf`, then run `scripts/deploy.sh infra`.
3. Update the custom domain route in `infra/cloudflare/wrangler.toml` and redeploy the Worker.

---

## 4. Policy Documents

Official wordings are served same-origin from `public/policies/` so they can be embedded:

| Source | File | Pages |
| --- | --- | :---: |
| Etiqa | `etiqa_tiq_motor_policy.pdf` | 24 |
| Income | `income_drivo_policy.pdf` | 10 |
| MSIG | `msig_motormax_policy.pdf` | 20 |
| GIA | `gia_motor_claims_framework.pdf` | 5 |

Clause-to-page mappings live in `lib/clause-documents.js` (1-based pages, `#page=N&view=FitH`).

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `npm test` rejects `--test` or ESM syntax | Node.js older than 20 | `nvm use` (reads `.nvmrc`) |
| Google sign-in shows `auth/unauthorized-domain` | Host is not an authorized domain | Add it to `authorized_domains` in `infra/terraform/variables.tf` and apply |
| Calculator shows "Saved in browser (cloud unavailable)" | Firestore unreachable or rules not published | Check connectivity; run `terraform plan` to confirm the rules release matches |
| Reminder API returns 503 | Reminder settings or secrets missing | `terraform plan`, then confirm both secrets have an enabled version |
| Deploy workflow fails at "Authenticate to Google Cloud" | Workload Identity resources missing or changed | `terraform plan` in `infra/terraform` and apply |
