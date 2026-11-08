# Evaluation

Three parts: decision correctness, HTTP performance, and a questionnaire demonstration.

**Results:** [English report](EVALUATION_REPORT.md) · [Chinese report](EVALUATION_REPORT_ZH.md)

| Part | Current evidence | Details |
| --- | --- | --- |
| Decision correctness | 18/18 model cases; 26/26 local HTTP checks | [Checks](correctness.mjs) |
| HTTP performance | Three sustained runs and one latest burst with step timings; zero errors | [Performance report](PERFORMANCE_REPORT.md) |
| Questionnaire | 26 synthetic responses; no recruited participants | [Questionnaire](SIMPLE_STUDY_QUESTIONNAIRE.md) · [Protocol](USER_STUDY_PROTOCOL.md) |

## Setup

From the repository root, install the local tools once:

```bash
bash evaluation/setup.sh --skip-gcloud
source evaluation/activate.sh
python evaluation/doctor.py
npm test
npm run test:evaluation
```

The setup uses Node 22, Python 3.12 and Locust. Activate the environment again in each new terminal. Public HTTP tests need no Google credentials. Omit `--skip-gcloud` to also install the optional Google Cloud CLI.

## 1. Decision correctness

```bash
node evaluation/correctness.mjs
```

The script compares NCD paths, excesses, costs and recommendations with a separate reference calculation. It checks implementation against the configured assumptions; it does not independently validate insurance contracts or future premiums.

To add HTTP validation, start the application locally and run:

```bash
node evaluation/correctness.mjs --base-url http://localhost:3000
```

## 2. HTTP performance

```bash
bash evaluation/run_performance.sh https://claimwise-sg-721110976915.asia-southeast1.run.app comparison
```

This runs page retrieval, decision submission and the ordered page-to-decision journey separately under both sustained load and a finite burst:

- `comparison`: 50 virtual users for 60 measured seconds after warmup. Use `steady` for five-minute measurements.
- Burst: 200 requests per endpoint test, or 200 journeys comprising 400 requests when every page succeeds.
- Output: throughput, mean/P50/P95/P99/maximum latency, errors, raw requests and per-journey timing. All decisions disable persistence.

Default targets are endpoint P95 < 250 ms, journey P95 < 500 ms and errors < 1%. Exit 1 means a result needs review; exit 2 means setup or execution failed. These are client HTTP tests, excluding browser rendering, human input, login and saving. Saving is checked separately with mocked storage tests.

For individual scenarios and thresholds, run `python evaluation/performance.py --help`; profiles are in [load_profiles.json](load_profiles.json). Instance elasticity remains optional and unmeasured: [cloud_metrics.py](cloud_metrics.py) requires Cloud Run/Monitoring read permissions and a suitable long experiment.

The default preflight calls `/api/health`. To observe the first page requests without that probe, run the `burst`/`journey` scenario with `--skip-health-check`. Burst has no warmup phase. This records an unprewarmed client attempt, not a verified cold start; elapsed time since the last recorded test does not prove service inactivity.

The reports use three independent sustained runs and the latest no-preflight journey burst. Their three burst rows are that single batch's page step, decision step and complete journey, not independent endpoint tests. Each row includes request counts and the measured span between first and last HTTP call starts.

## 3. Questionnaire

For actual collection, create a new directory, collect responses, then analyze them:

```bash
python evaluation/simple_user_study.py prepare --directory evaluation/private/study-new --participants 12
# Fill the generated CSVs from participant responses before analysis.
python evaluation/simple_user_study.py analyze --directory evaluation/private/study-new
```

Each person completes four optional background questions and two tasks: one with the app and one without it. Twelve creates blank enrollment slots, not completed responses. Follow the [protocol](USER_STUDY_PROTOCOL.md); blank forms cannot produce results. Closing ratings are custom questions, not SUS.

To reproduce the separate synthetic demonstration:

```bash
python evaluation/simulate_user_study.py --records 26 --seed 5224
```

All simulated responses and times are labeled synthetic. They demonstrate data handling and do not establish user benefits.

## Files and results

New runs create unique directories under `evaluation/results/`; collection records stay in `evaluation/private/`. Both are ignored by Git. Each run preserves its inputs, configuration and summary. Selected aggregate results and source identifiers are versioned in [evidence/summary.json](evidence/summary.json); full raw records are not published. Historical top-level tables and older scripts with built-in sample data are separate from these measurements.
