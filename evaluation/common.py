"""Shared artifact and workload utilities."""

import csv
from datetime import datetime, timezone
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import subprocess
from urllib.parse import urlsplit
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def write_csv(path, fields, rows):
    with Path(path).open("w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def read_csv(path, fields):
    with Path(path).open(newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames != fields:
            raise ValueError(f"Unexpected columns in {path.name}; use the generated template.")
        rows = list(reader)
        if any(None in row or any(value is None for value in row.values()) for row in rows):
            raise ValueError(f"Malformed CSV row in {path.name}; check missing or extra cells.")
        return [{key: value.strip() for key, value in row.items()} for row in rows]


def number(value, minimum, maximum, field, integer=False):
    try:
        result = float(value)
    except (ValueError, TypeError) as error:
        raise ValueError(f"{field} must contain a number.") from error
    if not math.isfinite(result) or not minimum <= result <= maximum or (integer and not result.is_integer()):
        raise ValueError(f"{field} is outside its allowed range.")
    return result


def new_run(kind, output_root=None):
    directory = Path(output_root or ROOT / "evaluation/results") / f"{kind}-{utc_now().replace(':', '-')}-{uuid4().hex[:8]}"
    directory.mkdir(parents=True)
    return directory


def environment_metadata():
    revision = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True)
    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True)
    return {"git_commit": revision.stdout.strip(), "working_tree_dirty": bool(dirty.stdout.strip()),
            "python": platform.python_version(), "platform": platform.platform(),
            "locust": importlib.metadata.version("locust")}


def validate_base_url(url):
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        raise ValueError("Base URL must be an HTTP(S) origin without credentials, path, query, or fragment.")
    return url.rstrip("/")


def load_profile(path, name):
    profile = json.loads(Path(path).read_text())[name]
    if profile.get("mode") == "burst":
        return profile
    phases = profile["phases"]
    if not phases or len({p["name"] for p in phases}) != len(phases):
        raise ValueError("A profile requires uniquely named phases.")
    for phase in phases:
        if not isinstance(phase["seconds"], int) or phase["seconds"] <= 0 or not isinstance(phase["users"], int) or not 0 <= phase["users"] <= 1000 or phase["spawn_rate"] <= 0:
            raise ValueError("Phase duration, user count, or spawn rate is invalid.")
    if not any(p["users"] > 0 and p["name"] != "warmup" for p in phases):
        raise ValueError("A profile requires a measurement phase with users.")
    return profile


def phase_at(phases, elapsed):
    end = 0
    for phase in phases:
        end += phase["seconds"]
        if elapsed < end:
            return phase
    return None


def percentile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, math.ceil(len(ordered) * fraction) - 1)]
