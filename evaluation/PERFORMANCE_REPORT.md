# HTTP Performance Report

Date: 7 November 2026. Target: https://claimwise-sg-721110976915.asia-southeast1.run.app.

The selected results comprise three independent sustained runs and the step breakdown of one latest journey burst. Decision requests use synthetic inputs with `persist: false`. All selected HTTP operations succeeded.

## 1. Sustained load

Each run warmed up with 5 virtual users for 10 seconds, then measured 50 virtual users for 60 seconds. Users waited 0.2–0.8 seconds between operations. Warmup observations are excluded; journeys are assigned to their starting phase and drained after it ends.

| Operation | Test procedure | Mean ms | P95 ms | Maximum ms |
| --- | --- | ---: | ---: | ---: |
| Page | 5718 GET calls; start span 59.968 s | 25.91 | 65.21 | 435.69 |
| Decision | 5702 POST calls; start span 59.989 s | 28.50 | 97.73 | 566.74 |
| Page → decision | 5507 journeys / 11014 calls; start span 60.006 s | 49.46 | 120.16 | 344.11 |

Observed throughput was 95.3 page requests/s, 95.0 decision requests/s and 91.8 journeys/s. All three met the experimental targets: endpoint P95 < 250 ms, journey P95 < 500 ms and errors < 1%.

## 2. Burst load

One batch released 200 ordered journeys, with no health preflight, business warmup or think time. Each POST waited for its own successful GET. The following rows are components of that same batch, not standalone endpoint experiments. The gap since the last recorded client experiment was 31.92 minutes; other traffic and instance state were unknown.

| Operation | Test procedure | Mean ms | P95 ms | Maximum ms |
| --- | --- | ---: | ---: | ---: |
| Page step | 200 GET calls; start span 46.22 ms | 3884.47 | 4079.07 | 4094.58 |
| Decision step | 200 POST calls after their GETs; start span 1.474 s | 303.73 | 417.47 | 1009.11 |
| Complete journey | 200 journeys / 400 calls; start span 4.139 s; batch completed in 4.451 s | 4188.44 | 4391.06 | 4417.67 |

All 400 requests succeeded, but latency targets were missed. The finite batch completed at 44.94 journeys/s; this is not sustainable throughput. All 200 journeys passed ordering and duration audits. Mean complete duration equals the two mean HTTP step durations plus approximately 0.245 ms of validation/step overhead. Generator CPU averaged 13.28% of one core with no capacity warning or material clock drift.

## Timing definitions and scope

Start span is last HTTP call start minus first HTTP call start, measured at the client; it is not upload time or measured server-arrival spread. The burst's 200 initial page calls started within 46.22 ms, while later POSTs extended the 400-call start span to 4.139 s. Batch completion is shared release to final journey completion. Per-request and per-journey latencies use their own start/end times. A mean or P95 from one run is not a component of another run, and endpoint P95 values must not be added.

Page waiting dominates the latest burst. This is consistent with startup/platform waiting, but no startup or instance-count evidence confirms the cause. These client measurements exclude browser assets/rendering, human input, login and persistence; they do not establish isolated backend CPU time, maximum capacity or instance elasticity.

## Evidence and reproduction

The [versioned evidence summary](evidence/summary.json) retains the selected run identifiers, source hashes, counts and metrics for all six table rows. Recorded inputs cover the private-car baseline; PHV and later application features were not separately measured. The deployed revision was not recorded.

See the [evaluation README](README.md) for commands. Full local run directories retain request/unit CSVs, manifests, generator diagnostics and reports; they are ignored by Git. Historical runs remain preserved and are not overwritten by this selection.
