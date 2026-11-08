#!/usr/bin/env bash
# Run endpoint and ordered-journey experiments sequentially with isolated outputs.
set -euo pipefail

evaluation_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: bash evaluation/run_performance.sh BASE_URL [comparison|steady|baseline|smoke]" >&2
  exit 2
fi
evaluation_target="$1"
sustained_profile="${2:-comparison}"
case "$sustained_profile" in
  comparison|steady|baseline|smoke) ;;
  *) echo "Unsupported sustained profile: $sustained_profile" >&2; exit 2 ;;
esac
source "$evaluation_directory/activate.sh"

evaluation_status=0
for evaluation_profile in "$sustained_profile" burst; do
  for evaluation_workload in page decision journey; do
    if python "$evaluation_directory/performance.py" --base-url "$evaluation_target" \
      --profile "$evaluation_profile" --workload "$evaluation_workload" --burst-count 200; then
      experiment_status=0
    else
      experiment_status=$?
    fi
    if [[ $experiment_status -gt 1 ]]; then
      exit "$experiment_status"
    fi
    if [[ $experiment_status -eq 1 ]]; then
      evaluation_status=1
    fi
  done
done
exit "$evaluation_status"
