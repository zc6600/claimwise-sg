#!/usr/bin/env bash
#
# Operator entry point for ClaimWise SG releases.
#
# Infrastructure (APIs, IAM, secrets access, Firestore rules, scheduler, Cloud Run
# runtime configuration) is owned by Terraform in infra/terraform. Merges to main are
# deployed automatically by .github/workflows/deploy.yml; this script covers the same
# steps for manual use.
#
# Usage:
#   scripts/deploy.sh infra    Plan and apply Terraform (asks for confirmation)
#   scripts/deploy.sh deploy   Build the committed HEAD and roll it out to Cloud Run
#   scripts/deploy.sh verify   Smoke-test the live service
#
# PROJECT_ID, REGION, SERVICE, and SITE_URL can be overridden through the environment.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-claimwise-sg}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-claimwise-sg}"
SITE_URL="${SITE_URL:-https://claimwise.zc6600.wiki}"
SITE_URL="${SITE_URL%/}"
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
worktree=""

log() { printf '\n==> %s\n' "$*"; }
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

require_tools() {
  local tool
  for tool in "$@"; do
    command -v "$tool" >/dev/null 2>&1 || fail "'$tool' is not installed."
  done
}

cleanup_worktree() {
  if [[ -n "$worktree" ]]; then
    git -C "$REPO_ROOT" worktree remove --force "$worktree" >/dev/null 2>&1 || true
  fi
}

infra() {
  require_tools terraform
  log "Applying Terraform in infra/terraform"
  terraform -chdir="$REPO_ROOT/infra/terraform" init -input=false
  terraform -chdir="$REPO_ROOT/infra/terraform" apply
}

deploy() {
  require_tools gcloud git
  local commit
  commit="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"

  # Builds from a clean checkout so uncommitted files never reach production.
  worktree="$(mktemp -d)"
  trap cleanup_worktree EXIT
  git -C "$REPO_ROOT" worktree add --detach --quiet "$worktree" HEAD

  # Runtime configuration comes from Terraform; only the code changes here.
  log "Deploying commit ${commit} to Cloud Run service ${SERVICE}"
  (cd "$worktree" && gcloud run deploy "$SERVICE" --source . --project "$PROJECT_ID" \
    --region "$REGION" --quiet)
}

verify() {
  require_tools curl
  local path status failed=0
  log "Smoke-testing ${SITE_URL}"
  for path in / /calculator /tools/ncd-protector /tools/quote-compare /tools/coe-renewal \
    /tools/loan-prepayment /my-car /settlement /emergency /privacy /api/health; do
    status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "${SITE_URL}${path}")"
    printf '  %-24s %s\n' "$path" "$status"
    [[ "$status" == 200 ]] || failed=1
  done

  # The old tools hub permanently redirects to the landing page.
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "${SITE_URL}/tools")"
  printf '  %-24s %s (expected 308)\n' "/tools" "$status"
  [[ "$status" == 308 ]] || failed=1

  # An empty sign-up is rejected with 400 once reminders are configured, or 503 if not.
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST \
    -H 'content-type: application/json' -d '{}' "${SITE_URL}/api/reminders")"
  printf '  %-24s %s (expected 400)\n' "reminders" "$status"
  [[ "$status" == 400 ]] || failed=1

  (( failed == 0 )) || fail "One or more checks failed."
  log "All checks passed"
}

case "${1:-}" in
  infra) infra ;;
  deploy) deploy ;;
  verify) verify ;;
  *) fail "Usage: scripts/deploy.sh infra|deploy|verify" ;;
esac
