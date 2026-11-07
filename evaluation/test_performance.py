"""Exercise batch accounting and ordered journeys against an isolated HTTP server."""

from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from uuid import uuid4

from common import ROOT
from performance import audit_observations, read_rows


class FixtureServer(ThreadingHTTPServer):
    request_queue_size = 512
    daemon_threads = True


class PerformanceIntegrationTests(unittest.TestCase):
    def run_fixture(self, workload, count, mode):
        lock = threading.Lock()
        observations = []
        page_cookies = set()
        counters = Counter()

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def log_message(self, *args):
                pass

            def send_body(self, body, status=200, content_type="application/json", cookie=None):
                raw = body.encode() if isinstance(body, str) else json.dumps(body).encode()
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(raw)))
                if cookie:
                    self.send_header("Set-Cookie", cookie)
                self.end_headers()
                try:
                    self.wfile.write(raw)
                except (BrokenPipeError, ConnectionResetError):
                    pass

            def do_GET(self):
                if self.path == "/api/health":
                    if mode == "no_preflight":
                        counters["health"] += 1
                        return self.send_body({"ok": False}, 503)
                    return self.send_body({"ok": True})
                with lock:
                    counters["page"] += 1
                    index = counters["page"]
                    cookie = f"flow={uuid4().hex}"
                    page_cookies.add(cookie)
                    observations.append(("GET", cookie, None))
                failed = mode == "journey_failure" and index == 1
                self.send_body("<html>ClaimWise calculator</html>", 503 if failed else 200, "text/html", cookie)

            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers["content-length"])))
                with lock:
                    counters["decision"] += 1
                    index = counters["decision"]
                    cookie = self.headers.get("Cookie")
                    observations.append(("POST", cookie, body))
                if workload == "journey" and cookie not in page_cookies:
                    return self.send_body({"error": "Page cookie missing"}, 400)
                status = 503 if mode == "batch_failure" and index % 50 == 0 else 200
                if mode == "journey_failure" and index == 1:
                    return self.send_body("not JSON", content_type="application/json")
                if mode == "timeout" and index == 1:
                    time.sleep(0.4)
                self.send_body({"ok": True, "meta": {"persisted": False},
                                "decision": {"recommendation": "claim", "baseScenario": {"claimTotal": 1000, "selfPayTotal": 1500}}}, status)

        server = FixtureServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as parent:
                command = [sys.executable, str(ROOT / "evaluation/performance.py"),
                           "--base-url", f"http://127.0.0.1:{server.server_port}", "--profile", "burst",
                           "--workload", workload, "--burst-count", str(count), "--output-root", parent,
                           "--p95-ms", "10000", "--journey-p95-ms", "20000", "--maximum-launch-window-ms", "10000",
                           "--request-timeout", "0.1" if mode == "timeout" else "5"]
                if mode == "no_preflight":
                    command.append("--skip-health-check")
                process = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=45)
                directories = list(Path(parent).iterdir())
                self.assertEqual(len(directories), 1, process.stderr)
                directory = directories[0]
                self.assertTrue((directory / "summary.json").exists(), process.stdout + process.stderr + (directory / "locust.log").read_text())
                report = json.loads((directory / "summary.json").read_text())
                rows, units = read_rows(directory / "requests.csv"), read_rows(directory / "units.csv")
                self.assertEqual(report["validation_issues"], [])
                self.assertEqual(len(units), count)
                self.assertEqual(len({row["unit_id"] for row in units}), count)
                self.assertTrue(report["checks"]["profile_completed"])
                self.assertEqual(audit_observations(rows, units, workload, count), [])
                return report, rows, units, observations, counters
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_exact_200_requests_include_all_http_failures_without_retries(self):
        report, rows, units, observations, counters = self.run_fixture("decision", 200, "batch_failure")
        self.assertEqual(counters["decision"], 200)
        self.assertEqual(len(rows), 200)
        self.assertEqual(report["summary"][0]["failures"], 4)
        self.assertEqual(report["summary"][0]["http_errors"], 4)
        self.assertGreater(report["burst"]["peak_client_in_flight_http_requests"], 1)
        self.assertTrue(all(body["persist"] is False for method, _, body in observations if method == "POST"))

    def test_ordered_journey_retains_cookie_skips_post_on_page_failure_and_rejects_bad_json(self):
        report, rows, units, observations, counters = self.run_fixture("journey", 20, "journey_failure")
        self.assertEqual(counters, {"page": 20, "decision": 19})
        self.assertEqual(len(rows), 39)
        self.assertEqual(report["unit_summary"][0]["failures"], 2)
        self.assertEqual(report["unit_summary"][0]["decision_skipped"], 1)
        self.assertEqual(report["summary"][0]["invalid_responses"], 1)
        broken = [dict(row) for row in rows]
        first_post = next(row for row in broken if row["endpoint"] == "/api/decision")
        first_post["elapsed_seconds"] = "-1"
        self.assertTrue(audit_observations(broken, units, "journey", 20))

    def test_timeouts_are_counted_as_failures_and_not_dropped(self):
        report, rows, units, _, counters = self.run_fixture("decision", 20, "timeout")
        self.assertEqual(len(rows), 20)
        self.assertGreaterEqual(report["summary"][0]["timeouts"], 1)
        self.assertGreaterEqual(report["summary"][0]["failures"], 1)
        self.assertLessEqual(counters["decision"], 20)

    def test_journey_starts_without_preflight_when_health_endpoint_is_disabled(self):
        report, rows, _, _, counters = self.run_fixture("journey", 20, "no_preflight")
        self.assertEqual(counters.get("health", 0), 0)
        self.assertEqual(counters["page"], 20)
        self.assertEqual(counters["decision"], 20)
        self.assertEqual(len(rows), 40)
        self.assertFalse(report["preflight_health_check"])
        self.assertEqual(report["cold_start_status"], "not_verified")


if __name__ == "__main__":
    unittest.main()
