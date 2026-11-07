"""Check local evaluation prerequisites without displaying credentials."""

import argparse
import importlib.metadata
import json
import platform
import shutil
import subprocess
import sys
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", help="Optionally check an application's health endpoint.")
    parser.add_argument("--cloud", action="store_true", help="Require Application Default Credentials.")
    args = parser.parse_args()
    checks = []

    def record(name, ok, detail):
        checks.append({"name": name, "ok": bool(ok), "detail": detail})

    record("python", sys.version_info >= (3, 11), platform.python_version())
    for program in ["node", "npm", "gcloud"]:
        executable = shutil.which(program)
        if not executable:
            record(program, program == "gcloud" and not args.cloud, "Not installed" + (" (optional for local checks)" if program == "gcloud" else ""))
            continue
        result = subprocess.run([executable, "--version"], capture_output=True, text=True, timeout=30)
        version = result.stdout.splitlines()[0] if result.stdout else "Version check failed"
        valid = result.returncode == 0
        if program == "node" and valid:
            valid = int(version.lstrip("v").split(".")[0]) >= 20
        record(program, valid, version)
    for package in ["locust", "google-auth", "requests"]:
        try:
            record(package, True, importlib.metadata.version(package))
        except importlib.metadata.PackageNotFoundError:
            record(package, False, "Missing; run bash evaluation/setup.sh")
    if args.base_url:
        try:
            with urllib.request.urlopen(args.base_url.rstrip("/") + "/api/health", timeout=15) as response:
                payload = json.load(response)
                record("application", response.status == 200 and payload.get("ok") is True, payload.get("service", "Unknown service"))
        except Exception as error:
            record("application", False, type(error).__name__)
    if args.cloud:
        import google.auth

        try:
            credentials, project = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            record("cloud_credentials", credentials is not None, f"ADC found; quota project: {project or 'not set'}; API permissions checked during collection")
        except google.auth.exceptions.DefaultCredentialsError:
            record("cloud_credentials", False, "Run gcloud auth application-default login; no credentials are bundled")
    print(json.dumps({"checks": checks, "ready": all(item["ok"] for item in checks)}, indent=2))
    return 0 if all(item["ok"] for item in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
