#!/usr/bin/env bash
#
# Deploys ClaimWise SG to Cloud Run and provisions the email reminder pipeline.
#
# Usage:
#   scripts/deploy.sh setup    One-time, idempotent: APIs, secret access, scheduler job
#   scripts/deploy.sh deploy   Build the committed HEAD, deploy it, publish Firestore rules
#   scripts/deploy.sh verify   Smoke-test the live service
#   scripts/deploy.sh all      setup, deploy, then verify (default)
#
# Every setting can be overridden through the environment, for example:
#   SITE_URL=https://claimwise.example scripts/deploy.sh setup
#
# Secret values are never handled here. Create them once with Secret Manager
# (see docs/DEPLOYMENT_GUIDE.md); this script only checks that they exist.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-claimwise-sg}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-claimwise-sg}"
SITE_URL="${SITE_URL:-https://claimwise-sg-721110976915.asia-southeast1.run.app}"
FROM_EMAIL="${FROM_EMAIL:-ClaimWise SG <reminders@zc6600.wiki>}"
SCHEDULER_ACCOUNT_ID="${SCHEDULER_ACCOUNT_ID:-reminder-scheduler}"
SCHEDULER_JOB="${SCHEDULER_JOB:-${SERVICE}-reminder-dispatch}"
SCHEDULE="${SCHEDULE:-0 9 * * *}"
TIME_ZONE="${TIME_ZONE:-Asia/Singapore}"
SECRETS=(RESEND_API_KEY REMINDER_TOKEN_SECRET)

SITE_URL="${SITE_URL%/}"
DISPATCH_URL="${SITE_URL}/api/reminders/dispatch"
SCHEDULER_EMAIL="${SCHEDULER_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

worktree=""

cleanup_worktree() {
  if [[ -n "$worktree" ]]; then
    git -C "$REPO_ROOT" worktree remove --force "$worktree" >/dev/null 2>&1 || true
  fi
}

log() { printf '\n==> %s\n' "$*"; }
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

require_tools() {
  local tool
  for tool in "$@"; do
    command -v "$tool" >/dev/null 2>&1 || fail "'$tool' is not installed."
  done
}

runtime_service_account() {
  local number
  number="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  printf '%s-compute@developer.gserviceaccount.com' "$number"
}

setup() {
  require_tools gcloud
  local runtime_sa secret
  runtime_sa="$(runtime_service_account)"

  log "Enabling required APIs"
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    secretmanager.googleapis.com cloudscheduler.googleapis.com firestore.googleapis.com \
    --project "$PROJECT_ID"

  log "Checking reminder secrets"
  for secret in "${SECRETS[@]}"; do
    gcloud secrets versions describe latest --secret "$secret" --project "$PROJECT_ID" \
      --format='value(state)' >/dev/null 2>&1 \
      || fail "Secret '$secret' has no enabled version. Create it first (docs/DEPLOYMENT_GUIDE.md)."
  done

  log "Granting ${runtime_sa} access to reminder secrets"
  for secret in "${SECRETS[@]}"; do
    gcloud secrets add-iam-policy-binding "$secret" --project "$PROJECT_ID" \
      --member "serviceAccount:${runtime_sa}" --role roles/secretmanager.secretAccessor \
      --condition None --quiet >/dev/null
  done

  # The runtime account stores subscriptions through the Firestore REST API.
  log "Granting ${runtime_sa} Firestore access"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:${runtime_sa}" --role roles/datastore.user \
    --condition None --quiet >/dev/null

  log "Ensuring scheduler service account ${SCHEDULER_EMAIL}"
  if ! gcloud iam service-accounts describe "$SCHEDULER_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$SCHEDULER_ACCOUNT_ID" --project "$PROJECT_ID" \
      --display-name "ClaimWise reminder scheduler"
  fi

  log "Ensuring daily dispatch job ${SCHEDULER_JOB} (${SCHEDULE}, ${TIME_ZONE})"
  local action=create
  if gcloud scheduler jobs describe "$SCHEDULER_JOB" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
    action=update
  fi
  gcloud scheduler jobs "$action" http "$SCHEDULER_JOB" --project "$PROJECT_ID" --location "$REGION" \
    --schedule "$SCHEDULE" --time-zone "$TIME_ZONE" --uri "$DISPATCH_URL" --http-method POST \
    --oidc-service-account-email "$SCHEDULER_EMAIL" --oidc-token-audience "$DISPATCH_URL" \
    --quiet >/dev/null
}

deploy() {
  require_tools gcloud git
  local commit
  commit="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"

  # Builds from a clean checkout so uncommitted files never reach production.
  worktree="$(mktemp -d)"
  trap cleanup_worktree EXIT
  git -C "$REPO_ROOT" worktree add --detach --quiet "$worktree" HEAD

  log "Deploying commit ${commit} to Cloud Run service ${SERVICE}"
  (
    cd "$worktree"
    gcloud run deploy "$SERVICE" --source . --project "$PROJECT_ID" --region "$REGION" \
      --platform managed --allow-unauthenticated --port 3000 --memory 1Gi --cpu 1 \
      --min-instances 0 --max-instances 10 \
      --update-secrets "RESEND_API_KEY=RESEND_API_KEY:latest,REMINDER_TOKEN_SECRET=REMINDER_TOKEN_SECRET:latest" \
      --update-env-vars "^|^REMINDER_FROM_EMAIL=${FROM_EMAIL}|REMINDER_SITE_URL=${SITE_URL}|REMINDER_SCHEDULER_EMAIL=${SCHEDULER_EMAIL}" \
      --quiet
  )

  if command -v firebase >/dev/null 2>&1; then
    log "Publishing Firestore security rules"
    (cd "$worktree" && firebase deploy --only firestore:rules --project "$PROJECT_ID" --non-interactive)
  else
    printf "Warning: 'firebase' CLI not found; Firestore rules were not published.\n" >&2
  fi
}

verify() {
  require_tools curl
  local path status failed=0
  log "Smoke-testing ${SITE_URL}"
  for path in / /calculator /tools /my-car /settlement /emergency /privacy /api/health; do
    status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "${SITE_URL}${path}")"
    printf '  %-12s %s\n' "$path" "$status"
    [[ "$status" == 200 ]] || failed=1
  done

  # An empty sign-up is rejected with 400 once reminders are configured, or 503 if not.
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST \
    -H 'content-type: application/json' -d '{}' "${SITE_URL}/api/reminders")"
  printf '  %-12s %s (expected 400)\n' "reminders" "$status"
  [[ "$status" == 400 ]] || failed=1

  (( failed == 0 )) || fail "One or more checks failed."
  log "All checks passed"
}

case "${1:-all}" in
  setup) setup ;;
  deploy) deploy ;;
  verify) verify ;;
  all) setup; deploy; verify ;;
  *) fail "Unknown command '$1'. Use setup, deploy, verify, or all." ;;
esac
