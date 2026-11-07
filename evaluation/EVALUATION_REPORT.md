# ClaimWise SG Evaluation Report

Evaluation date: 7 November 2026. Correctness checks passed; sustained HTTP tests met the experimental targets, while the latest burst did not. Questionnaire data are synthetic.

## 1. Decision correctness

All **18 decision cases passed** independent reference checks of NCD paths, excesses, costs and recommendations. A local HTTP run passed **26/26 checks**, including those cases and eight invalid requests. This verifies implementation under the configured assumptions, not individual insurance contracts or actual future premiums.

## 2. HTTP performance

Tests used the deployed Cloud Run service with saving disabled. Start span means the interval between the first and last client HTTP call starts, not upload duration or server arrival time.

### Sustained load

Three separate runs, each with 5 virtual users warming up for 10 seconds, then **50 virtual users for 60 measured seconds**. Warmup is excluded; pending journeys are allowed to finish.

| Operation | Test procedure | Mean ms | P95 ms | Maximum ms |
| --- | --- | ---: | ---: | ---: |
| Page | 5718 GET calls; start span 59.968 s | 25.91 | 65.21 | 435.69 |
| Decision | 5702 POST calls; start span 59.989 s | 28.50 | 97.73 | 566.74 |
| Page → decision | 5507 journeys / 11014 calls; start span 60.006 s | 49.46 | 120.16 | 344.11 |

Throughput was **95.3 page requests/s, 95.0 decision requests/s and 91.8 journeys/s**. All runs had zero errors and met the P95 targets of 250 ms per endpoint and 500 ms per journey.

### Burst load

The following three rows describe **one latest batch of 200 ordered journeys**, not three independent bursts. Each POST followed its own successful GET. There was no health preflight or warmup; the gap since the last recorded client test was 31.92 minutes.

| Operation | Test procedure | Mean ms | P95 ms | Maximum ms |
| --- | --- | ---: | ---: | ---: |
| Page step | 200 GET calls; start span 46.22 ms | 3884.47 | 4079.07 | 4094.58 |
| Decision step | 200 POST calls after their GETs; start span 1.474 s | 303.73 | 417.47 | 1009.11 |
| Complete journey | 200 journeys / 400 calls; start span 4.139 s; batch completed in 4.451 s | 4188.44 | 4391.06 | 4417.67 |

All 400 requests succeeded, but latency targets were missed. The initial page step dominated the delay. Batch completion is measured from shared release until the last journey finishes. Cold starts remain unverified; timings include client/network overhead and do not establish instance elasticity.

## 3. Questionnaire demonstration

The dataset contains **26 synthetic questionnaires and 52 simulated tasks; actual participants: 0**. Accuracy was **57.7% with and without the app**; mean confidence changed from **2.88 to 3.19/5**, and simulated mean time from **118.0 to 127.1 seconds**. These figures demonstrate the analysis workflow and provide no empirical evidence of user benefits.

Evidence: [versioned aggregate results](evidence/summary.json) · [performance methods](PERFORMANCE_REPORT.md). Full raw runs remain local and are ignored by Git. The recorded inputs cover the private-car baseline; newer PHV and other application features are outside these measurements.
