"""Read Cloud Run configuration and Monitoring evidence for a recorded load run."""

import argparse
import csv
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re
import sys
import time
from urllib.parse import quote

import google.auth
from google.auth.transport.requests import AuthorizedSession

from common import utc_now, write_json

METRICS = ["container/instance_count", "container/cpu/utilizations", "container/memory/utilizations",
           "container/startup_latencies", "container/max_request_concurrencies", "request_count", "request_latencies"]


def authorized_session():
    credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    return AuthorizedSession(credentials)


def read_json(session, url, params=None):
    response = session.get(url, params=params, timeout=30)
    if not response.ok:
        raise RuntimeError(f"Google Cloud read failed (HTTP {response.status_code}); check ADC, API enablement, and viewer permissions.")
    return response.json()


def service_snapshot(session, project, region, service):
    name = "/".join(["projects", quote(project, safe=""), "locations", quote(region, safe=""), "services", quote(service, safe="")])
    data = read_json(session, f"https://run.googleapis.com/v2/{name}")
    template = data.get("template", {})
    # Environment variables, secrets, and service-account identities are intentionally excluded.
    return {"captured_at": utc_now(), "name": data.get("name"), "uri": data.get("uri"),
            "latest_ready_revision": data.get("latestReadyRevision"), "generation": data.get("generation"),
            "service_scaling": data.get("scaling", {}), "revision_scaling": template.get("scaling", {}),
            "concurrency": template.get("maxInstanceRequestConcurrency"), "timeout": template.get("timeout"),
            "resources": [c.get("resources", {}) for c in template.get("containers", [])],
            "traffic": [{k: t.get(k) for k in ["revision", "percent", "type"]} for t in data.get("trafficStatuses", [])]}


def collect_series(session, project, region, service, metric, start, end):
    filters = [f'metric.type = "run.googleapis.com/{metric}"', 'resource.type = "cloud_run_revision"',
               f'resource.labels.service_name = "{service}"', f'resource.labels.location = "{region}"']
    params = {"filter": " AND ".join(filters), "interval.startTime": start, "interval.endTime": end,
              "view": "FULL", "pageSize": 10000}
    if metric == "container/instance_count":
        params.update({"aggregation.alignmentPeriod": "60s", "aggregation.perSeriesAligner": "ALIGN_MAX",
                       "aggregation.crossSeriesReducer": "REDUCE_SUM"})
    series = []
    while True:
        data = read_json(session, f"https://monitoring.googleapis.com/v3/projects/{quote(project, safe='')}/timeSeries", params)
        series.extend(data.get("timeSeries", []))
        if not data.get("nextPageToken"):
            return series
        params["pageToken"] = data["nextPageToken"]


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Cloud timestamps must include a timezone.")
    return parsed.astimezone(timezone.utc)


def elasticity_summary(series, manifest, generator):
    points = sorted([(timestamp(p["interval"]["endTime"]), int(p["value"]["int64Value"]))
                     for item in series for p in item.get("points", []) if "int64Value" in p["value"]])
    phases = {}
    cursor = timestamp(generator["started_at"])
    for phase in manifest["profile"]["phases"]:
        end = cursor + timedelta(seconds=phase["seconds"])
        phases[phase["name"]] = (cursor, end)
        cursor = end
    result = {"status": "inconclusive", "sampling_seconds": 60,
              "interpretation": "Aligned minute samples; absent samples are unknown, not zero. Delay is an observed bound, not exact autoscaler reaction time."}
    if abs(generator.get("wall_clock_drift_seconds", 0)) > 1:
        result["reason"] = "Generator wall clock drift prevents reliable correlation with platform timestamps."
        return result
    if not generator.get("completed") or not all(name in phases for name in ["baseline", "burst", "cooldown"]):
        result["reason"] = "A completed baseline/burst/cooldown profile is required."
        return result
    # Use complete alignment windows within each phase to avoid boundary contamination.
    samples = {name: [(t, count) for t, count in points if start + timedelta(seconds=60) <= t <= end]
               for name, (start, end) in phases.items()}
    if not all(samples[name] for name in ["baseline", "burst", "cooldown"]):
        result["reason"] = "Monitoring evidence is missing for one or more phases; retry after ingestion delay."
        return result
    baseline = max(count for _, count in samples["baseline"])
    peak = max(count for _, count in samples["burst"])
    cooldown_min = min(count for _, count in samples["cooldown"])
    grew = peak > baseline
    returned = grew and cooldown_min <= baseline
    first_growth = next(((t - phases["burst"][0]).total_seconds() for t, count in samples["burst"] if count > baseline), None)
    first_return = next(((t - phases["cooldown"][0]).total_seconds() for t, count in samples["cooldown"] if count <= baseline), None) if grew else None
    result.update({"status": "scale_out_and_return_observed" if returned else "scale_out_observed" if grew else "no_scale_out_observed",
                   "baseline_max_instances": baseline, "burst_peak_instances": peak, "cooldown_min_instances": cooldown_min,
                   "scale_out_observed_delay_seconds": first_growth, "return_to_baseline_observed_delay_seconds": first_return})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--project")
    parser.add_argument("--region")
    parser.add_argument("--service")
    parser.add_argument("--wait-seconds", type=int, default=0, help="Wait for metric ingestion after the recorded run.")
    args = parser.parse_args()
    manifest = json.loads((args.run_dir / "manifest.json").read_text())
    generator = json.loads((args.run_dir / "generator.json").read_text())
    project = args.project or manifest.get("project")
    region = args.region or manifest.get("region")
    service = args.service or manifest.get("service")
    if not all(isinstance(v, str) and re.fullmatch(r"[A-Za-z0-9_.:-]+", v) for v in [project, region, service]):
        parser.error("Supply valid project, region, and service identifiers.")
    if args.wait_seconds < 0:
        parser.error("Wait duration must be nonnegative.")
    if args.wait_seconds:
        print(f"Waiting {args.wait_seconds}s for Monitoring ingestion...", flush=True)
        time.sleep(args.wait_seconds)
    output = args.run_dir / ("cloud-" + utc_now().replace(":", "-"))
    output.mkdir()
    start = (timestamp(generator["started_at"]) - timedelta(minutes=2)).isoformat()
    end = timestamp(generator["ended_at"]).isoformat()
    evidence = {}
    errors = {}
    with authorized_session() as session:
        snapshot = service_snapshot(session, project, region, service)
        write_json(output / "service.json", snapshot)
        for metric in METRICS:
            try:
                evidence[metric] = collect_series(session, project, region, service, metric, start, end)
                write_json(output / (metric.replace("/", "_") + ".json"), evidence[metric])
            except RuntimeError as error:
                errors[metric] = str(error)
    with (output / "points.csv").open("w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["metric", "timestamp", "resource_labels", "metric_labels", "scalar", "distribution_count", "distribution_mean"])
        for metric, items in evidence.items():
            for item in items:
                for point in item.get("points", []):
                    value = point["value"]
                    distribution = value.get("distributionValue", {})
                    writer.writerow([metric, point["interval"]["endTime"], json.dumps(item.get("resource", {}).get("labels", {})),
                                     json.dumps(item.get("metric", {}).get("labels", {})), value.get("int64Value", value.get("doubleValue", "")),
                                     distribution.get("count", ""), distribution.get("mean", "")])
    summary = elasticity_summary(evidence.get("container/instance_count", []), manifest, generator)
    before = manifest.get("cloud_run_before")
    if not before:
        summary.update(status="inconclusive", reason="No pre-load service snapshot; rerun performance.py with --project to bind configuration to the experiment.")
    elif before.get("latest_ready_revision") != snapshot.get("latest_ready_revision") or before.get("generation") != snapshot.get("generation"):
        summary.update(status="inconclusive", reason="Cloud Run configuration changed during or after the run.")
    if errors:
        summary["collection_errors"] = errors
    summary.update({"project": project, "region": region, "service": service, "collected_at": utc_now(),
                    "empty_metrics": [key for key, value in evidence.items() if not value]})
    write_json(output / "summary.json", summary)
    print(json.dumps(summary, indent=2))
    print(f"Cloud evidence: {output}")
    return 1 if errors or summary["status"] == "inconclusive" else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, RuntimeError, google.auth.exceptions.GoogleAuthError) as error:
        print(f"Cloud collection failed: {error}", file=sys.stderr)
        raise SystemExit(2)
