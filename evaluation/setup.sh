#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
mkdir -p .tools/downloads
if [[ "$(uname -s)" != Linux ]]; then
  printf '%s\n' 'This bootstrap supports Linux/WSL. Install Node 22 and Python 3.12 manually on other systems.' >&2
  exit 1
fi
case "$(uname -m)" in
  x86_64) node_arch=x64; cloud_arch=x86_64 ;;
  aarch64) node_arch=arm64; cloud_arch=arm ;;
  *) printf '%s\n' 'Unsupported CPU architecture.' >&2; exit 1 ;;
esac
node_version="$(tr -d '\n' < .nvmrc)"
if [[ ! -x .tools/node/bin/node ]] || [[ "$(.tools/node/bin/node --version)" != "v$node_version" ]]; then
  node_archive="node-v$node_version-linux-$node_arch.tar.xz"
  curl --fail --location --retry 3 "https://nodejs.org/dist/v$node_version/SHASUMS256.txt" -o .tools/downloads/node-shasums.txt
  curl --fail --location --retry 3 "https://nodejs.org/dist/v$node_version/$node_archive" -o ".tools/downloads/$node_archive"
  (cd .tools/downloads && awk -v filename="$node_archive" '$2 == filename' node-shasums.txt | sha256sum --check --status)
  mkdir -p .tools/node
  tar -xJf ".tools/downloads/$node_archive" -C .tools/node --strip-components=1
fi
source evaluation/activate.sh
python3 -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11 or newer is required"'
if command -v uv >/dev/null 2>&1; then
  if [[ ! -x .venv/bin/python ]]; then uv --cache-dir .tools/uv-cache venv --python python3 .venv; fi
  uv --cache-dir .tools/uv-cache pip sync --python .venv/bin/python evaluation/requirements.txt
else
  python3 -m venv .venv
  .venv/bin/python -m pip install -r evaluation/requirements.txt
fi
if [[ "${1:-}" != --skip-gcloud ]] && [[ ! -x .tools/google-cloud-sdk/bin/gcloud ]]; then
  cloud_archive="google-cloud-cli-592.0.0-linux-$cloud_arch.tar.gz"
  curl --fail --location --retry 3 "https://storage.googleapis.com/storage/v1/b/cloud-sdk-release/o/$cloud_archive" -o .tools/downloads/cloud-archive-metadata.json
  if [[ ! -f ".tools/downloads/$cloud_archive" ]]; then
    curl --fail --location --retry 3 "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/$cloud_archive" -o ".tools/downloads/$cloud_archive"
  fi
  python3 - "$cloud_archive" <<'PY'
import base64, hashlib, json, sys
from pathlib import Path
metadata = json.loads(Path('.tools/downloads/cloud-archive-metadata.json').read_text())
archive = Path('.tools/downloads') / sys.argv[1]
assert metadata['name'] == archive.name and int(metadata['size']) == archive.stat().st_size
assert base64.b64encode(hashlib.md5(archive.read_bytes()).digest()).decode() == metadata['md5Hash'], 'Archive checksum mismatch'
PY
  tar -xzf ".tools/downloads/$cloud_archive" -C .tools
fi
npm ci --cache .tools/npm-cache --no-audit --no-fund
python evaluation/doctor.py
printf '%s\n' 'Setup complete. Run: source evaluation/activate.sh'
