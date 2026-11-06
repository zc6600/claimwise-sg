# ClaimWise SG · Motor Insurance Claim Decision Support

[![Tests](https://img.shields.io/badge/tests-26%2F26%20passed-success)](tests/decision-engine.test.mjs)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Cloud Engine](https://img.shields.io/badge/API-Next.js%20Route%20Handlers-blue)](app/api/decision/route.js)
[![Cloud Database](https://img.shields.io/badge/Firestore-asia--southeast1-orange)](https://console.firebase.google.com/project/claimwise-sg)

**ClaimWise SG** is a cloud-native decision-support web application for Singapore private car owners. After a minor collision, motorists must decide whether to **pay out-of-pocket (Self-Pay)** or **file an own-damage insurance claim (Claim)**.

ClaimWise SG models multi-year No-Claim Discount (NCD) step-down penalties, workshop and young-driver excess surcharges, General Insurance Association (GIA) subrogation rules, and present-value discounting to compute the exact break-even repair threshold $R^*(S)$, paired with an interactive policy clause audit and official insurer PDF previews.

---

## Live Application

Access the deployed service at **[https://claimwise-sg-721110976915.asia-southeast1.run.app](https://claimwise-sg-721110976915.asia-southeast1.run.app)** (or run locally at `http://localhost:3000`).

---

## Core Capabilities

### 1. Actuarial Break-Even Engine
- Computes the multi-year Discounted Cash Flow (DCF) net present value break-even threshold:
  $$R^*(S) = E_{\text{own}} + \sum_{t=1}^{T} \frac{P_t^{\text{claim}} - P_t^{\text{self}}}{(1 + r)^t}$$
- Discounts future renewal cash flows across 3-year or 5-year horizons (default $r = 3.0\%$ p.a.) and evaluates sensitivity across Lower ($-5\%$), Base, and Higher ($+5\%$) premium growth bands.

### 2. Singapore Motor Policy Mechanics
- **Insurer Profiles**: Pre-configured rules for **Income**, **Etiqa**, **MSIG**, **FWD**, and a standard GIA baseline.
- **Effective Excess Calculation**: Combines standard policy excess with non-authorised workshop surcharges (`+S$1,000` to `+S$2,000`) and young/inexperienced driver surcharges (`+S$2,000` to `+S$2,500`).
- **Special Claim Scenarios**: Supports GIA Windscreen Endorsement (`S$100` excess with `0%` NCD penalty), `100%` non-fault protection, NCD Protector riders, and third-party adverse claims.

### 3. Policy Clause Audit & Printable Report
- **Interactive Clause Audit (`PolicySourcePreview`)**: Hover or click any audited rule in the calculator results to inspect its calculation rationale and contract citation.
- **Official Insurer PDF Viewer**: Embeds self-hosted insurer policy wordings (`etiqa_tiq_motor_policy.pdf`, `income_drivo_policy.pdf`, `msig_motormax_policy.pdf`) via `/api/clause-preview` at the mapped page (`#page=N&view=FitH`), with **Official PDF** / **Clause summary** switching, **📌 Pin**, and **Full tab ↗**.
- **Print / PDF Export**: Generates a clean A4/Letter actuarial report with a parameter summary header, auto-expanded year-by-year renewal schedule, and complete clause audit trail.

### 4. Authentication & Cloud History
- **Firebase Authentication**: Supports Google and email/password sign-in.
- **Cloud & Local Persistence**: Signed-in calculations are persisted to Google Cloud Firestore in Singapore (`asia-southeast1`) under user-scoped security rules (`firestore.rules`). Guest calculations are stored in browser `localStorage`.

---

## Tech Stack & Repository Structure

| Layer | Technology / Path |
| :--- | :--- |
| **Frontend & Routing** | Next.js 15 App Router, React 19 (`app/`, `components/`) |
| **Decision Engine** | Pure ESM actuarial model & insurer data (`src/decision-engine.mjs`, `src/decision-data.mjs`) |
| **Backend API** | Next.js Route Handlers (`app/api/decision`, `app/api/clause-preview`, `app/api/rules`, `app/api/benchmarks`, `app/api/health`) |
| **Auth & Database** | Firebase Authentication & Cloud Firestore (`lib/firebase.js`, `lib/history-service.js`, `firestore.rules`) |
| **Testing & Evaluation** | Node.js native test runner (`tests/decision-engine.test.mjs`) & evaluation scripts (`scripts/`, `evaluation/`) |
| **Infrastructure** | Terraform GCP & Firebase configuration (`infra/terraform/`) |

---

## Quick Start (Running on Any Machine)

### Prerequisites
- **Node.js**: `>= 20.0.0` (Verify with `node -v`; required for Node's native test runner and React 19).
- **Git**: To clone the repository.
- *Zero local database installation required* (actuarial calculation runs locally in pure JavaScript; guest history uses browser storage).

### 1. Local Run in 3 Minutes (Zero-Config)
The app comes with built-in client fallbacks so anyone can clone and immediately run it without having to configure cloud credentials:

```bash
# Clone and enter the repository
git clone https://github.com/zc6600/claimwise-sg.git
cd claimwise-sg

# Install dependencies (Next.js 15, React 19, Firebase SDK)
npm install

# Run the deterministic test suite (26 tests, completes in ~200ms)
npm test

# Start the local development server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

> [!TIP]
> **Optional Custom Configuration**: To connect your own Firebase project rather than using default demo credentials, copy `.env.example` to `.env.local` and provide your project keys.

### 2. Production Build & Test
```bash
# Run all 26 actuarial & API unit tests
npm test

# Build and start the optimized standalone production server
npm run build
npm run start -- -p 3000
```

---

## API Reference

### `POST /api/decision`
Computes the actuarial comparison, break-even repair threshold, renewal schedule, and clause audit trail.

```json
{
  "insurer": "etiqa",
  "currentPremium": 1800,
  "currentNcd": 50,
  "excess": 600,
  "repairCost": 3000,
  "horizonYears": 3,
  "baseGrowthRate": 5,
  "discountRate": 3,
  "ncdProtector": false,
  "liability": "at_fault",
  "thirdPartyClaim": false,
  "workshopType": "independent",
  "youngDriverInvolved": true,
  "repairType": "general"
}
```

### `GET /api/clause-preview?id=<clauseId>&insurer=<insurerKey>`
Renders an HTML wrapper embedding the matching official policy wording PDF at its mapped source page (`income`, `etiqa`, `msig`) or a fallback notice when no local document is mapped.

### Additional Endpoints
- `GET /api/rules` — Insurer profiles and standard GIA NCD step-down scale.
- `GET /api/benchmarks` — Singapore motor repair and premium benchmark statistics.
- `GET /api/health` — Service health check.

---

## Evaluation & Benchmarks

| Evaluation | Script | Summary |
| :--- | :--- | :--- |
| **Actuarial Correctness** | `python scripts/run_correctness_eval.py` | 13/13 boundary benchmark cases passed (`tests/fixtures/benchmark_cases.json`) |
| **Load & Latency** | `python scripts/run_locust_evaluation.py` | Median latency `8.00 ms`, p95 `21.00 ms`, `0.00%` error rate |
| **Cloud TCO Model** | `python scripts/tco_calculator.py` | 3-year serverless vs. on-premises cost comparison |
| **Usability Analysis** | `python scripts/analyze_user_study.py` | System Usability Scale (SUS) aggregation (`89.6 / 100`) |

---

## Documentation

- [Deployment & Infrastructure Guide](docs/DEPLOYMENT_GUIDE.md)
- [Advertising & Revenue Architecture](docs/ADVERTISING_AND_REVENUE_MODEL.md)
- [Contribution Workflow](CONTRIBUTING.md) · [Agent Guidelines](AGENTS.md)

---

## Disclaimer

ClaimWise SG provides actuarial modeling for informational post-accident decision support. Policyholders should verify their individual Policy Schedule, endorsements, and insurer claims guidelines before making a settlement decision.
