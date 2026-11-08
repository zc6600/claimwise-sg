# Source this file from Bash to activate repository-local evaluation tools.
EVALUATION_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$EVALUATION_ROOT/.venv/bin:$EVALUATION_ROOT/.tools/node/bin:$EVALUATION_ROOT/.tools/google-cloud-sdk/bin:$PATH"
export CLOUDSDK_CONFIG="$EVALUATION_ROOT/.tools/gcloud-config"
export CLOUDSDK_CORE_DISABLE_USAGE_REPORTING=true
export CLOUDSDK_CORE_DISABLE_PROMPTS=true
unset EVALUATION_ROOT
