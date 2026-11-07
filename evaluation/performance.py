"""Run isolated HTTP workloads under sustained concurrency or one finite request burst."""

import argparse
import csv
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys
import urllib.request

from common import ROOT, environment_metadata, load_profile, new_run, percentile, utc_now, validate_base_url, write_json
from workloads import ENDPOINTS


def phases_for_summary(profile, generator):
    if profile.get("mode") == "burst":
        return [{"name": "burst", "seconds": generator.get("measurement_seconds") or 0, "users": 1}]
    return [phase for phase in profile["phases"] if phase["name"] != "warmup" and phase["users"] > 0]


def metrics(selected, duration, completed, p95_target, error_target, minimum):
    values = [float(row["latency_ms"]) for row in selected]
    success = [row for row in selected if row["success"] == "True"]
    failures = len(selected) - len(success)
    p95 = percentile(values, 0.95)
    error_rate = failures / len(selected) if selected else None
    enough = len(selected) >= minimum and duration > 0
    passed = enough and completed and p95 < p95_target and error_rate < error_target
    return {"requests": len(selected), "failures": failures,
            "timeouts": sum(row.get("failure_kind") == "timeout" for row in selected),
            "transport_errors": sum(row.get("failure_kind") == "transport" for row in selected),
            "http_errors": sum(row.get("failure_kind") == "http" for row in selected),
            "invalid_responses": sum(row.get("failure_kind") == "invalid_response" for row in selected),
            "p50_ms": percentile(values, 0.5), "p95_ms": p95, "p99_ms": percentile(values, 0.99),
            "mean_ms": statistics.mean(values) if values else None, "max_ms": max(values) if values else None,
            "successful_p95_ms": percentile([float(row["latency_ms"]) for row in success], 0.95),
            "error_rate": error_rate, "requests_per_second": len(selected) / duration if duration > 0 else None,
            "successful_requests_per_second": len(success) / duration if duration > 0 else None,
            "status": "insufficient_data" if not enough else "pass" if passed else "fail"}


def summarize(rows, profile, generator, p95_target=250, error_target=0.01, minimum=20, workload="decision"):
    summaries = []
    for phase in phases_for_summary(profile, generator):
        phase_rows = [row for row in rows if row["phase"] == phase["name"]]
        endpoints = sorted({row["endpoint"] for row in phase_rows} | set(ENDPOINTS[workload]))
        for endpoint in ["ALL", *endpoints]:
            selected = [row for row in phase_rows if endpoint == "ALL" or row["endpoint"] == endpoint]
            summaries.append({"phase": phase["name"], "endpoint": endpoint,
                              **metrics(selected, phase["seconds"], generator.get("completed", False), p95_target, error_target, minimum)})
    return summaries


def unit_summaries(units, profile, generator, p95_target, error_target, minimum):
    result = []
    for phase in phases_for_summary(profile, generator):
        selected = [row for row in units if row["phase"] == phase["name"]]
        item = metrics(selected, phase["seconds"], generator.get("completed", False), p95_target, error_target, minimum)
        item["units"] = item.pop("requests")
        item["units_per_second"] = item.pop("requests_per_second")
        item["successful_units_per_second"] = item.pop("successful_requests_per_second")
        for key in ["timeouts", "transport_errors", "http_errors", "invalid_responses"]:
            item.pop(key)
        item["decision_skipped"] = sum(row["decision_skipped"] == "True" for row in selected)
        result.append({"phase": phase["name"], **item})
    return result


def audit_observations(rows, units, workload, expected_units=None):
    """Check finite-batch accounting and per-journey ordering against raw observations."""
    issues = []
    grouped = {}
    for row in rows:
        grouped.setdefault(row["unit_id"], []).append(row)
    ids = [row["unit_id"] for row in units]
    if len(set(ids)) != len(ids) or set(grouped) != set(ids):
        issues.append("Duplicate units or HTTP observations without a completed unit.")
    if expected_units is not None and len(units) != expected_units:
        issues.append(f"Expected {expected_units} completed units; observed {len(units)}.")
    for unit in units:
        steps = sorted(grouped.get(unit["unit_id"], []), key=lambda row: float(row["elapsed_seconds"]))
        expected = ENDPOINTS[workload]
        if workload == "journey" and unit["failure_stage"] == "page":
            expected = ["/calculator"]
        if [row["endpoint"] for row in steps] != expected:
            issues.append(f"Unit {unit['unit_id']}: missing, extra, or reordered HTTP steps.")
            continue
        # A decision must start only after its own successful page response.
        if workload == "journey" and len(steps) == 2:
            if steps[0]["success"] != "True" or float(steps[1]["elapsed_seconds"]) < float(steps[0]["finished_seconds"]):
                issues.append(f"Unit {unit['unit_id']}: decision started before page success.")
        if (unit["success"] == "True") != all(row["success"] == "True" for row in steps):
            issues.append(f"Unit {unit['unit_id']}: inconsistent success accounting.")
        if any(row["phase"] != unit["phase"] for row in steps):
            issues.append(f"Unit {unit['unit_id']}: inconsistent phase accounting.")
    return issues


def burst_diagnostics(rows, units, generator, expected, maximum_window):
    grouped = {}
    for row in rows:
        grouped.setdefault(row["unit_id"], []).append(row)
    starts = [min(float(row["elapsed_seconds"]) for row in steps) for steps in grouped.values()]
    launch_window = (max(starts) - min(starts)) * 1000 if starts else None
    windows = {}
    for endpoint in sorted({row["endpoint"] for row in rows}):
        points = [float(row["elapsed_seconds"]) for row in rows if row["endpoint"] == endpoint]
        windows[endpoint] = (max(points) - min(points)) * 1000
    events = sorted([(float(row["elapsed_seconds"]), 1) for row in rows] +
                    [(float(row["finished_seconds"]), -1) for row in rows])
    active = peak = 0
    for _, delta in events:
        active += delta
        peak = max(peak, active)
    return {"expected_units": expected, "completed_units": len(units), "http_requests": len(rows),
            "first_step_launch_window_ms": launch_window, "maximum_launch_window_ms": maximum_window,
            "launch_window_met": launch_window is not None and launch_window <= maximum_window,
            "endpoint_launch_windows_ms": windows, "peak_client_in_flight_http_requests": peak,
            "batch_completion_seconds": generator.get("measurement_seconds"),
            "rate_interpretation": "Finite batch completions divided by release-to-last-completion time; not sustainable throughput."}


def read_rows(path):
    with path.open() as file:
        return list(csv.DictReader(file))


def write_report(directory, report, workload):
    lines = [f"# HTTP performance: {workload}", "", f"Status: {report['status']}", "",
             "| Phase | Endpoint | Requests | Mean ms | P95 ms | P99 ms | Max ms | Errors | Requests/s |",
             "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    def fmt(value):
        return f"{value:.3f}" if value is not None else "N/A"
    for item in report["summary"]:
        lines.append(f"| {item['phase']} | {item['endpoint']} | {item['requests']} | {fmt(item['mean_ms'])} | {fmt(item['p95_ms'])} | {fmt(item['p99_ms'])} | {fmt(item['max_ms'])} | {item['failures']} | {fmt(item['requests_per_second'])} |")
    lines += ["", "Unit statistics include the complete ordered journey when workload is journey.", ""]
    for item in report["unit_summary"]:
        lines.append(f"- {item['phase']}: {item['units']} units; mean {fmt(item['mean_ms'])} ms; P95 {fmt(item['p95_ms'])} ms; max {fmt(item['max_ms'])} ms; {item['failures']} failed; {item['decision_skipped']} decisions skipped.")
    lines += ["", "## Diagnostics", "", "```json", json.dumps({key: value for key, value in report.items() if key not in {"summary", "unit_summary"}}, indent=2), "```", "",
              "Latencies are client HTTP observations, not isolated server CPU time. Journeys exclude form-entry think time, browser rendering, assets, Firebase sign-in and persistence. No instance-level elasticity conclusion is made."]
    (directory / "report.md").write_text("\n".join(lines) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--profile", default="smoke")
    parser.add_argument("--workload", choices=ENDPOINTS, default="decision")
    parser.add_argument("--burst-count", type=int, default=200, help="Exact units per burst; a journey unit has two ordered HTTP requests.")
    parser.add_argument("--maximum-launch-window-ms", type=float, default=1000)
    parser.add_argument("--request-timeout", type=float, default=15)
    parser.add_argument("--skip-health-check", action="store_true",
                        help="Send no preflight health request; profile warmup phases still apply. This does not verify a cold start.")
    parser.add_argument("--profile-file", type=Path, default=ROOT / "evaluation/load_profiles.json")
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--seed", type=int, default=5224)
    parser.add_argument("--p95-ms", type=float, default=250, help="Endpoint latency target, not an externally established SLA.")
    parser.add_argument("--journey-p95-ms", type=float, default=500, help="Separately assessed end-to-end journey target.")
    parser.add_argument("--error-rate", type=float, default=0.01)
    parser.add_argument("--output-root", type=Path)
    parser.add_argument("--project", help="Capture Cloud Run configuration before load; requires ADC.")
    parser.add_argument("--region", default="asia-southeast1")
    parser.add_argument("--service", default="claimwise-sg")
    args = parser.parse_args()
    base_url = validate_base_url(args.base_url)
    positive = [args.p95_ms, args.journey_p95_ms, args.maximum_launch_window_ms, args.request_timeout]
    if args.repeat < 1 or not 1 <= args.burst_count <= 1000 or not 0 < args.error_rate <= 1 or any(not math.isfinite(v) or v <= 0 for v in positive):
        parser.error("Require positive finite thresholds/timeouts, repeat >= 1, burst count in [1, 1000], error rate in (0, 1].")
    profile = load_profile(args.profile_file, args.profile)
    burst = profile.get("mode") == "burst"
    if not args.skip_health_check:
        with urllib.request.urlopen(base_url + "/api/health", timeout=args.request_timeout) as response:
            if json.load(response).get("ok") is not True:
                raise ValueError("Application health check failed.")
    passed = True
    for repetition in range(1, args.repeat + 1):
        directory = new_run(f"load-{args.profile}-{args.workload}", args.output_root).resolve()
        minimum = profile.get("minimum_requests_per_endpoint", 20)
        metadata = {**environment_metadata(), "schema_version": 2, "base_url": base_url, "profile_name": args.profile,
                    "profile": profile, "workload": args.workload, "mode": "burst" if burst else "sustained",
                    "repetition": repetition, "seed": args.seed, "started_at": utc_now(), "persist": False,
                    "preflight_health_check": not args.skip_health_check,
                    "expected_units": args.burst_count if burst else None, "request_timeout_seconds": args.request_timeout,
                    "thresholds": {"p95_ms": args.p95_ms, "journey_p95_ms": args.journey_p95_ms,
                                   "error_rate": args.error_rate, "minimum_requests_per_endpoint": minimum,
                                   "maximum_launch_window_ms": args.maximum_launch_window_ms},
                    "project": args.project, "region": args.region, "service": args.service}
        if args.project:
            from cloud_metrics import authorized_session, service_snapshot
            with authorized_session() as session:
                metadata["cloud_run_before"] = service_snapshot(session, args.project, args.region, args.service)
                if metadata["cloud_run_before"].get("uri", "").rstrip("/") != base_url:
                    raise ValueError("Base URL differs from the Cloud Run service URI; use its canonical origin.")
        write_json(directory / "manifest.json", metadata)
        # Allow a connect timeout and a read timeout for each pending HTTP step.
        stop_timeout = math.ceil(args.request_timeout * (4 if args.workload == "journey" else 2)) + 5
        command = [sys.executable, "-m", "locust", "-f", str(ROOT / "evaluation/locustfile.py"),
                   "--host", base_url, "--headless", "--only-summary", "--stop-timeout", str(stop_timeout),
                   "--evaluation-profile", args.profile, "--profile-file", str(args.profile_file.resolve()),
                   "--run-output", str(directory.resolve()), "--evaluation-seed", str(args.seed),
                   "--workload", args.workload, "--burst-count", str(args.burst_count), "--request-timeout", str(args.request_timeout),
                   "--csv", str(directory / "locust"), "--csv-full-history", "--html", str(directory / "locust.html")]
        print(f"Running {args.profile}/{args.workload} repetition {repetition}: {directory}", flush=True)
        duration = sum(p["seconds"] for p in profile["phases"])
        with (directory / "locust.log").open("w") as log:
            try:
                result = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=duration + stop_timeout + 90)
                metadata["locust_exit_code"] = result.returncode
            except subprocess.TimeoutExpired:
                metadata["locust_exit_code"] = "timeout"
        metadata["ended_at"] = utc_now()
        write_json(directory / "manifest.json", metadata)
        if not (directory / "generator.json").exists():
            print(f"Load generator did not finish. Inspect {directory / 'locust.log'}", file=sys.stderr)
            return 2
        generator = json.loads((directory / "generator.json").read_text())
        rows, units = read_rows(directory / "requests.csv"), read_rows(directory / "units.csv")
        summary = summarize(rows, profile, generator, args.p95_ms, args.error_rate, minimum, args.workload)
        unit_summary = unit_summaries(units, profile, generator,
                                     args.journey_p95_ms if args.workload == "journey" else args.p95_ms, args.error_rate, minimum)
        issues = audit_observations(rows, units, args.workload, args.burst_count if burst else None)
        if generator.get("completed_units") != len(units):
            issues.append("Generator completed-unit count differs from units.csv.")
        diagnostics = burst_diagnostics(rows, units, generator, args.burst_count, args.maximum_launch_window_ms) if burst else None
        generator_limited = generator["cpu_percent_of_one_core"] >= 90 or generator.get("locust_cpu_warning", False)
        clock_unstable = abs(generator.get("wall_clock_drift_seconds", 0)) > 1
        checks = {"profile_completed": generator.get("completed", False), "locust_exit_zero": metadata["locust_exit_code"] == 0,
                  "accounting_and_order_valid": not issues, "generator_capacity_ok": not generator_limited,
                  "wall_clock_stable": not clock_unstable, "launch_window_met": not burst or diagnostics["launch_window_met"],
                  "endpoint_targets_met": bool(summary) and all(item["status"] == "pass" for item in summary),
                  "unit_targets_met": bool(unit_summary) and all(item["status"] == "pass" for item in unit_summary)}
        smoke = args.profile == "smoke"
        smoke_passed = all(checks[key] for key in ["profile_completed", "locust_exit_zero", "accounting_and_order_valid"]) and bool(summary) and all(item["requests"] >= 1 and item["failures"] == 0 for item in summary)
        run_passed = all(checks.values())
        report = {"status": ("smoke_pass" if smoke_passed else "review") if smoke else ("pass" if run_passed else "review"),
                  "performance_status": "not_evaluated_smoke" if smoke else "pass" if run_passed else "review",
                  "checks": checks, "validation_issues": issues, "generator_limited": generator_limited,
                  "clock_unstable": clock_unstable, "burst": diagnostics,
                  "preflight_health_check": not args.skip_health_check, "cold_start_status": "not_verified",
                  "elasticity_status": "not_evaluated_collect_cloud_metrics_separately", "summary": summary, "unit_summary": unit_summary}
        write_json(directory / "summary.json", report)
        if summary:
            with (directory / "summary.csv").open("w", newline="") as file:
                writer = csv.DictWriter(file, fieldnames=list(summary[0]))
                writer.writeheader()
                writer.writerows(summary)
        write_report(directory, report, args.workload)
        print(json.dumps(report, indent=2))
        passed = passed and (smoke_passed if smoke else run_passed)
    return 0 if passed else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, KeyError, OSError) as error:
        print(f"Evaluation failed: {error}", file=sys.stderr)
        raise SystemExit(2)
