"""Regression checks use synthetic observations solely to validate evaluation logic."""

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import unittest

from cloud_metrics import collect_series, elasticity_summary, service_snapshot
from common import percentile, phase_at, validate_base_url
from performance import summarize


class PerformanceTests(unittest.TestCase):
    def test_warmup_exclusion_and_threshold_boundary(self):
        profile = {"phases": [{"name": "warmup", "seconds": 5, "users": 1}, {"name": "measurement", "seconds": 10, "users": 1}]}
        rows = [{"phase": "warmup", "endpoint": "/api/decision", "latency_ms": "9000", "success": "False"}]
        rows += [{"phase": "measurement", "endpoint": endpoint, "latency_ms": "250", "success": "True"}
                 for endpoint in ["/api/decision", "/calculator"] for _ in range(20)]
        result = summarize(rows, profile, {"completed": True}, workload="journey")[0]
        self.assertEqual(result["requests"], 40)
        self.assertEqual(result["failures"], 0)
        self.assertEqual(result["status"], "fail")
        self.assertEqual(result["requests_per_second"], 4)

    def test_empty_measurements_never_pass(self):
        result = summarize([], {"phases": [{"name": "measurement", "seconds": 10, "users": 2}]}, {"completed": True})
        self.assertTrue(all(row["status"] == "insufficient_data" for row in result))

    def test_percentiles_and_origin_validation(self):
        self.assertEqual(percentile(list(range(1, 101)), 0.95), 95)
        self.assertIsNone(percentile([], 0.95))
        self.assertEqual(validate_base_url("https://example.com/"), "https://example.com")
        for url in ["https://user:password@example.com", "https://example.com/api", "ftp://example.com"]:
            with self.assertRaises(ValueError): validate_base_url(url)
        phases = [{"name": "one", "seconds": 5}, {"name": "two", "seconds": 5}]
        self.assertEqual(phase_at(phases, 5)["name"], "two")


class CloudTests(unittest.TestCase):
    def test_missing_samples_remain_inconclusive(self):
        self.assertEqual(elasticity_summary([], {"profile": {"phases": []}}, {"started_at": "2026-01-01T00:00:00Z", "completed": True})["status"], "inconclusive")

    def test_sampled_growth_and_return(self):
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        points = [{"interval": {"endTime": (start + timedelta(seconds=seconds)).isoformat()}, "value": {"int64Value": str(count)}}
                  for seconds, count in [(60,1),(120,1),(180,3),(240,4),(300,2),(360,1)]]
        phases = [{"name": name, "seconds": 120} for name in ["baseline", "burst", "cooldown"]]
        result = elasticity_summary([{"points": points}], {"profile": {"phases": phases}}, {"started_at": start.isoformat(), "completed": True})
        self.assertEqual(result["status"], "scale_out_and_return_observed")
        self.assertEqual(result["scale_out_observed_delay_seconds"], 60)

    def test_google_pagination_and_configuration_redaction(self):
        class Response:
            ok = True
            def __init__(self, data): self.data = data
            def json(self): return self.data
        class Session:
            def __init__(self): self.calls = []
            def get(self, url, params=None, timeout=None):
                self.calls.append((url, deepcopy(params)))
                if "run.googleapis.com/v2" in url:
                    return Response({"template": {"containers": [{"env": [{"value": "SECRET_TEST_VALUE"}], "resources": {"limits": {"cpu": "1"}}}]}})
                return Response({"timeSeries": [{"points": []}], **({"nextPageToken": "second"} if len(self.calls) == 1 else {})})
        session = Session()
        result = collect_series(session, "project", "region", "service", "container/instance_count", "start", "end")
        self.assertEqual(len(result), 2)
        self.assertEqual(session.calls[1][1]["pageToken"], "second")
        self.assertEqual(session.calls[0][1]["aggregation.crossSeriesReducer"], "REDUCE_SUM")
        snapshot = service_snapshot(session, "project", "region", "service")
        self.assertNotIn("SECRET_TEST_VALUE", json.dumps(snapshot))


if __name__ == "__main__":
    unittest.main()
