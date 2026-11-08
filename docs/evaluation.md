# Evaluation

Evaluation date: 7 November 2026 (plus continuous `node:test` regressions). Full scripts and reports live in [`evaluation/`](../evaluation/README.md) ([Evaluation Report](../evaluation/EVALUATION_REPORT.md) · [Performance Report](../evaluation/PERFORMANCE_REPORT.md) · [Evidence Summary](../evaluation/evidence/summary.json)).

## 1. Overview

| Layer | Result | Command |
| --- | --- | --- |
| **Unit & actuarial suite** | **129 / 129 passing** across 12 `node:test` suites | `npm test` |
| **Decision correctness** | **18 / 18 model cases**; **26 / 26 local HTTP checks** | `node evaluation/correctness.mjs` |
| **Sustained HTTP load** | **91.8–95.3 req/s**, **0% errors**, P95 **65–120 ms** (50 VUs, 60s) | `bash evaluation/run_performance.sh <url> comparison` |
| **Unprewarmed burst** | **400 / 400 succeeded (0% errors)** across 200 simultaneous journeys | `python evaluation/performance.py ...` |
| **Questionnaire demo** | **26 synthetic records (52 tasks)**; **0 recruited participants** | `python evaluation/simulate_user_study.py --records 26 --seed 5224` |

## 2. Unit & Actuarial Suite (`tests/*.test.mjs`)

`npm test` runs 129 deterministic checks with zero network calls:
- **Actuarial & tools**: `decision-engine.test.mjs` (13 Singapore benchmarks, excesses, surcharges), `ncd-premium-path.test.mjs` (shared NCD step-down and recovery), `car-decisions.test.mjs` (NCD Protector, quote comparison, Rule of 78 loan, COE renewal), `phv-actuarial.test.mjs`, `stress-test-actuarial.test.mjs`, and `trajectory-calculator.test.mjs`.
- **Platform & safety**: `my-car.test.mjs`, `reminders.test.mjs` (double opt-in, HMAC tokens, rate limits, idempotent dispatch), `settlement-form.test.mjs`, `claim-share-link.test.mjs`, `pwa-emergency.test.mjs`, and `server-calculation-storage.test.mjs`.

## 3. Decision Correctness (`evaluation/correctness.mjs`)

Compares `src/decision-engine.mjs` against an independent reference implementation (`evaluation/expected_paths.json`). All **18 private-car model cases** and **26 local HTTP checks** (18 valid + 8 invalid `400` requests) passed. Newer PHV, car tools, My Car, and reminder features are covered by `npm test`.

To run the evaluation harness self-tests (`evaluation/*.test.mjs` and `evaluation/test_*.py`), initialize the local Python 3.12 / Locust environment from Bash first:

```bash
bash evaluation/setup.sh --skip-gcloud && source evaluation/activate.sh
npm run test:evaluation
```

## 4. Cloud Run HTTP Performance (`evaluation/PERFORMANCE_REPORT.md`)

Tested against Cloud Run (`asia-southeast1`) with `persist: false`:

| Mode | Operation | Sample | Mean (ms) | P95 (ms) | Max (ms) | Errors |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| **Sustained** (50 VUs, 60s, 3 runs) | Page (`GET`) | 5,718 calls (95.3/s) | 25.91 | 65.21 | 435.69 | 0% |
| **Sustained** (50 VUs, 60s, 3 runs) | Decision (`POST`) | 5,702 calls (95.0/s) | 28.50 | 97.73 | 566.74 | 0% |
| **Sustained** (50 VUs, 60s, 3 runs) | Journey (`GET` $\rightarrow$ `POST`) | 5,507 journeys (91.8/s) | 49.46 | 120.16 | 344.11 | 0% |
| **Burst** (200 journeys, no warmup) | Page step (`GET`) | 200 calls (span 46.22 ms) | 3,884.47 | 4,079.07 | 4,094.58 | 0% |
| **Burst** (200 journeys, no warmup) | Decision step (`POST`) | 200 calls after GETs | 303.73 | 417.47 | 1,009.11 | 0% |
| **Burst** (200 journeys, no warmup) | Complete journey | 200 journeys (4.451 s batch) | 4,188.44 | 4,391.06 | 4,417.67 | 0% |

Sustained runs met all P95 targets ($<250\text{ ms}$ endpoint, $<500\text{ ms}$ journey). The unprewarmed burst completed with 0% errors, with initial `GET` queuing (~3.88s mean) dominating total time.

## 5. Questionnaire Demonstration (`evaluation/USER_STUDY_PROTOCOL.md`)

`evaluation/simple_user_study.py` implements a two-scenario crossover protocol (with vs. without the app). The 26-record dataset from `simulate_user_study.py` (57.7% accuracy in both arms, confidence 2.88 $\rightarrow$ 3.19/5, time 118.0s $\rightarrow$ 127.1s) is labeled synthetic and verifies the analysis pipeline only.
