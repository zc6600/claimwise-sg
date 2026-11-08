"""Isolated endpoint, ordered HTTP journey, and finite simultaneous-release workloads."""

import csv
from pathlib import Path
import random
import time

import gevent
from gevent.event import Event
from locust import HttpUser, LoadTestShape, between, events, task
from locust.exception import StopUser
from requests.exceptions import Timeout

from common import load_profile, phase_at, utc_now, write_json
from workloads import response_error, decision_inputs

state = {}


@events.init_command_line_parser.add_listener
def arguments(parser):
    parser.add_argument("--evaluation-profile", default="smoke")
    parser.add_argument("--profile-file", required=True)
    parser.add_argument("--run-output", required=True)
    parser.add_argument("--evaluation-seed", type=int, default=5224)
    parser.add_argument("--workload", choices=["page", "decision", "journey"], default="decision")
    parser.add_argument("--burst-count", type=int, default=200)
    parser.add_argument("--request-timeout", type=float, default=15)


@events.init.add_listener
def initialize(environment, **kwargs):
    options = environment.parsed_options
    state.update(profile=load_profile(options.profile_file, options.evaluation_profile),
                 output=Path(options.run_output), seed=options.evaluation_seed,
                 workload=options.workload, count=options.burst_count, timeout=options.request_timeout,
                 user_index=0, unit_index=0, completed_units=0, ready=0, gate=Event())


@events.test_start.add_listener
def start(environment, **kwargs):
    state.update(started=time.time(), monotonic_started=time.perf_counter(),
                 shape_finished=False, cpu_started=time.process_time(), started_at=utc_now())
    state["file"] = (state["output"] / "requests.csv").open("w", newline="")
    state["writer"] = csv.writer(state["file"])
    state["writer"].writerow(["timestamp", "elapsed_seconds", "finished_seconds", "phase", "unit_id", "method",
                              "endpoint", "latency_ms", "status_code", "success", "failure_kind", "error"])
    state["units_file"] = (state["output"] / "units.csv").open("w", newline="")
    state["units_writer"] = csv.writer(state["units_file"])
    state["units_writer"].writerow(["unit_id", "phase", "elapsed_seconds", "finished_seconds", "latency_ms",
                                    "success", "failure_stage", "decision_skipped"])


@events.request.add_listener
def request(response_time, request_type, name, response=None, exception=None, context=None, start_time=None, **kwargs):
    context = context or {}
    if "writer" not in state or "phase" not in context:
        return
    code = getattr(response, "status_code", 0)
    failure_kind = context.get("failure_kind", "")
    transport = getattr(response, "error", None) or exception
    if exception and not code:
        failure_kind = "timeout" if isinstance(transport, Timeout) or "timeout" in type(transport).__name__.lower() else "transport"
    elif exception and not failure_kind:
        failure_kind = "http" if code != 200 else "invalid_response"
    state["writer"].writerow([start_time or time.time(), context["elapsed"], time.perf_counter() - state["monotonic_started"],
                              context["phase"], context["unit_id"], request_type, name, response_time,
                              code, exception is None, failure_kind, str(exception or "")[:300]])


@events.test_stop.add_listener
def stop(environment, **kwargs):
    if "file" not in state:
        return
    state["file"].close()
    state["units_file"].close()
    elapsed = time.perf_counter() - state["monotonic_started"]
    burst = state["profile"].get("mode") == "burst"
    write_json(state["output"] / "generator.json", {
        "started_at": state["started_at"], "ended_at": utc_now(), "elapsed_seconds": elapsed,
        "cpu_percent_of_one_core": 100 * (time.process_time() - state["cpu_started"]) / max(elapsed, 0.001),
        "completed": state["completed_units"] == state["count"] if burst else state["shape_finished"],
        "completed_units": state["completed_units"], "released_seconds": state.get("released_seconds"),
        "measurement_seconds": state.get("last_completed_seconds", 0) - state.get("released_seconds", 0) if burst else None,
        "wall_clock_drift_seconds": time.time() - state["started"] - elapsed,
        "locust_cpu_warning": environment.runner.cpu_warning_emitted,
    })


class EvaluationShape(LoadTestShape):
    def tick(self):
        if "profile" not in state:
            return (0, 1)
        if state["profile"].get("mode") == "burst":
            return (state["count"], max(state["count"] * 100, 1))
        elapsed = time.perf_counter() - state["monotonic_started"] if "monotonic_started" in state else 0
        phase = phase_at(state["profile"]["phases"], elapsed)
        if phase is None:
            state["shape_finished"] = True
            return None
        return (phase["users"], phase["spawn_rate"])


class Motorist(HttpUser):
    wait_time = between(0.2, 0.8)

    def on_start(self):
        state["user_index"] += 1
        self.random = random.Random(state["seed"] + state["user_index"])
        self.burst = state["profile"].get("mode") == "burst"
        self.burst_inputs = decision_inputs(self.random) if self.burst else None
        if self.burst:
            state["ready"] += 1
            if state["ready"] == state["count"]:
                state["released_seconds"] = time.perf_counter() - state["monotonic_started"]
                state["gate"].set()
            state["gate"].wait()

    def step(self, endpoint, context, inputs):
        context = {**context, "elapsed": time.perf_counter() - state["monotonic_started"]}
        options = dict(context=context, timeout=state["timeout"], catch_response=True, allow_redirects=False)
        if endpoint == "/calculator":
            request = self.client.get(endpoint, **options)
        else:
            request = self.client.post(endpoint, json={"inputs": inputs, "persist": False}, **options)
        with request as response:
            reason = response_error(response, endpoint)
            if reason:
                context["failure_kind"] = "http" if response.status_code != 200 else "invalid_response"
                response.failure(reason)
            return reason is None

    @task
    def perform(self):
        elapsed = time.perf_counter() - state["monotonic_started"]
        phase = {"name": "burst"} if self.burst else phase_at(state["profile"]["phases"], elapsed)
        if phase is None:
            raise StopUser()
        state["unit_index"] += 1
        unit_id = state["unit_index"]
        inputs = self.burst_inputs if self.burst else decision_inputs(self.random)
        context = {"phase": phase["name"], "unit_id": unit_id}
        started = time.perf_counter()
        failure_stage = ""
        skipped = False
        if state["workload"] in {"page", "journey"} and not self.step("/calculator", context, inputs):
            failure_stage = "page"
            skipped = state["workload"] == "journey"
        if state["workload"] in {"decision", "journey"} and not failure_stage:
            if not self.step("/api/decision", context, inputs):
                failure_stage = "decision"
        finished = time.perf_counter()
        state["units_writer"].writerow([unit_id, phase["name"], started - state["monotonic_started"],
                                         finished - state["monotonic_started"], (finished - started) * 1000,
                                         not failure_stage, failure_stage, skipped])
        state["completed_units"] += 1
        state["last_completed_seconds"] = finished - state["monotonic_started"]
        if self.burst:
            if state["completed_units"] == state["count"]:
                gevent.spawn_later(0, self.environment.runner.quit)
            raise StopUser()
