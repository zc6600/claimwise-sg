# ClaimWise SG · Motor Insurance Claim Decision Support

[![Tests](https://img.shields.io/badge/tests-115%2F115%20passed-success)](tests/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-asia--southeast1-blue?logo=googlecloud)](https://claimwise-sg-721110976915.asia-southeast1.run.app)
[![Firebase](https://img.shields.io/badge/Firebase%20Hosting-claimwise--sg.web.app-orange?logo=firebase)](https://claimwise-sg.web.app)
[![Cloud Database](https://img.shields.io/badge/Firestore-asia--southeast1-orange)](https://console.firebase.google.com/project/claimwise-sg)

**ClaimWise SG** is a cloud-native decision-support web application for Singapore private car owners and commercial private hire vehicle (PHV) drivers. After a minor collision, motorists must decide whether to **pay out-of-pocket (Self-Pay)** or **file an own-damage insurance claim (Claim)**.

ClaimWise SG models multi-year No-Claim Discount (NCD) step-down penalties, commercial renewal claim loadings, workshop and young-driver excess surcharges, loss-of-use downtime costs, General Insurance Association (GIA) subrogation rules, and present-value discounting to compute the exact break-even repair threshold $R^*(S)$, paired with an interactive policy clause audit and official insurer PDF previews.

---

## Live Deployment & Production Access

ClaimWise SG is deployed serverless on **Google Cloud Platform (GCP)** in Singapore (`asia-southeast1`):

| Environment / Service | Target URL / Identifier | Details |
| :--- | :--- | :--- |
| **Live Web Application (Cloud Run)** | **[https://claimwise-sg-721110976915.asia-southeast1.run.app](https://claimwise-sg-721110976915.asia-southeast1.run.app)** | Production container instance on Cloud Run v2 (managed serverless in Singapore) |
| **Firebase Web App Mirror** | **[https://claimwise-sg.web.app](https://claimwise-sg.web.app)** · [https://claimwise-sg.firebaseapp.com](https://claimwise-sg.firebaseapp.com) | Edge-cached Firebase Hosting distribution |
| **Cloud Region** | `asia-southeast1` (Singapore) | Co-located in Singapore for domestic motorists |
| **Cloud Database** | Google Cloud Firestore (`claimwise-sg`) | Multi-tenant user calculation persistence with strict security rules |
| **Authentication** | Google Identity Platform / Firebase Auth | Secures user profile & cloud calculation history; guest mode is fully accessible |
| **Health Check Endpoint** | [`/api/health`](https://claimwise-sg-721110976915.asia-southeast1.run.app/api/health) | Live JSON health check and service status |
| **Local Development** | `http://localhost:3000` | Zero local database footprint; runs with `npm run dev` |

---

## Core Capabilities

### 1. Actuarial Break-Even Engine
- Computes the multi-year Discounted Cash Flow (DCF) net present value break-even threshold:
  $$R^*(S) = E_{\text{own}} + \sum_{t=1}^{T} \frac{P_t^{\text{claim}} - P_t^{\text{self}}}{(1 + r)^t} + (\text{Downtime}^{\text{claim}} - \text{Downtime}^{\text{self}})$$
- Discounts future renewal cash flows across 3-year or 5-year horizons (default $r = 3.0\%$ p.a.) and evaluates sensitivity across Lower ($-5\%$), Base, and Higher ($+5\%$) premium growth bands.

### 2. Singapore Motor Policy & PHV Mechanics
- **Insurer Profiles**: Pre-configured rules for **Income**, **Etiqa**, **MSIG**, **FWD**, and a standard GIA baseline.
- **Vehicle Classification**: Supports **Private Passenger (P10/P11)** and **Private Hire / Commercial (Z10/Z11)** vehicles (Grab, Gojek, Tada). Models commercial underwriting claim loadings (default $+15\%$) and daily vehicle downtime/rental costs (default S$80/day across 5-day claim surveyor queues vs. 1-day private repairs).
- **Effective Excess Calculation**: Combines standard policy excess with non-authorised workshop surcharges (`+S$1,000` to `+S$2,000`) and young/inexperienced driver surcharges (`+S$2,000` to `+S$2,500`).
- **Special Claim Scenarios**: Supports GIA Windscreen Endorsement (`S$100` excess with `0%` NCD penalty), `100%` non-fault protection, NCD Protector riders, and third-party adverse claims.

### 3. Interactive Multi-Year Trajectory Visualizer
- **Visual Trajectory (`TrajectoryVisualizer`)**: Dynamic dual-mode SVG charts for cumulative present-value cash outflows and annual NCD recovery curves without external heavy charting libraries.
- **Break-Even Crossover Detection**: Highlights the exact timeline milestone where an insurance claim becomes more expensive than self-paying.

### 4. Consecutive Incident Stress-Testing & Resilience Buffer
- **Multi-Collision Simulation (`StressTestSimulator`)**: Simulates the severe financial exposure if a second at-fault collision occurs within 12 months.
- **Exhaustion vs. Preservation**: Models how filing an initial claim exhausts the NCD Protector rider and risks dropping renewal NCD to `0%` alongside standard `+25%` consecutive adverse underwriting loading, whereas self-paying Incident 1 preserves the clean record cushion and protects NCD tiers.
- **Resilience Buffer Metric**: Calculates the explicit dollar buffer ($\Phi_{\text{resilience}}$) gained by keeping the insurance record clean.

### 5. GIA Private Settlement Agreement Generator (`/settlement`)
- Seamlessly transitions self-pay recommendations to a legally grounded Singapore Motor Claims Framework (MCF) Private Settlement Agreement generator.
- Includes statutory prerequisites gating (no bodily injury, no government property damage), GIA 24-hour insurer reporting notices, and conditional release clauses.

### 6. Policy Clause Audit & Printable Report
- **Interactive Clause Audit (`PolicySourcePreview`)**: Hover or click any audited rule in the calculator results to inspect its calculation rationale and contract citation.
- **Official Insurer PDF Viewer**: Embeds self-hosted insurer policy wordings (`etiqa_tiq_motor_policy.pdf`, `income_drivo_policy.pdf`, `msig_motormax_policy.pdf`) via `/api/clause-preview` at the mapped page (`#page=N&view=FitH`), with **Official PDF** / **Clause summary** switching, **📌 Pin**, and **Full tab ↗**.
- **Print / PDF Export**: Generates a clean A4/Letter actuarial report with a parameter summary header, auto-expanded year-by-year renewal schedule, and complete clause audit trail.

### 7. Authentication & Cloud History
- **Firebase Authentication**: Supports Google and email/password sign-in.
- **Cloud & Local Persistence**: Signed-in calculations are persisted to Google Cloud Firestore in Singapore (`asia-southeast1`) under user-scoped security rules (`firestore.rules`). Guest calculations are stored in browser `localStorage`.

### 8. Underground Carpark Emergency Kit & Offline PWA (`/emergency`)
- **Offline Progressive Web App (PWA)**: Supports zero-cellular offline caching via Service Worker (`public/sw.js`) and Web App Manifest (`app/manifest.js`) for subterranean basement carparks (B2/B3/B4 at shopping malls or HDB carparks).
- **On-Scene Protocol & Anti-Scam Guidance**: Features the statutory Road Traffic Act (Section 84) police reporting checklist, GIA 24-hour mandatory insurer reporting rule, and predatory tow-truck scam protection warnings.
- **Emergency Directory**: Provides verified direct hotlines and operating hours for statutory services (Police 999, SCDF 995, LTA EMAS 1800-2255-582) and authorized insurer assistance centers (Income, Tiq/Etiqa, MSIG).

---

### 7. Car Decision Tools (`/tools`)
- **NCD Protector** (`/tools/ncd-protector`): Finds the at-fault claim probability at which the rider pays for itself.
- **Renewal Quote Comparison** (`/tools/quote-compare`): Ranks quotes by expected cost, including excess and workshop surcharges.
- **COE Renewal** (`/tools/coe-renewal`): Compares 5-year renewal, 10-year renewal, and replacement using LTA PARF, COE rebate, and road tax surcharge rules.
- **Car Loan Early Settlement** (`/tools/loan-prepayment`): Estimates a Rule of 78 settlement and compares it with the return on idle cash.

### 8. My Car & Email Reminders (`/my-car`)
- **My Car**: Saves key dates and policy figures in the browser, or in Firestore for signed-in users, to prefill the tools. Registration numbers are not collected.
- **Email Reminders**: Double opt-in reminders for insurance renewal (45 days), COE expiry (365 and 90 days), and loan review (30 days). Unsubscribing deletes the email address and dates.
- **Configuration**: Reminders stay disabled until the `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`, `REMINDER_SITE_URL`, and `REMINDER_TOKEN_SECRET` variables are set. Setting `REMINDER_DISPATCH_SECRET` in Terraform creates the daily 09:00 Singapore time Cloud Scheduler job. See `.env.example`.

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

All endpoints below are available on the live production deployment:
```
Production Base URL: https://claimwise-sg-721110976915.asia-southeast1.run.app
Local Base URL:      http://localhost:3000
```

### `POST /api/decision`
Computes the actuarial comparison, break-even repair threshold, renewal schedule, and clause audit trail.

**Production Endpoint**: `https://claimwise-sg-721110976915.asia-southeast1.run.app/api/decision`

```json
{
  "insurer": "income",
  "currentPremium": 3200,
  "currentNcd": 50,
  "excess": 1500,
  "repairCost": 2500,
  "horizonYears": 3,
  "baseGrowthRate": 5,
  "discountRate": 3,
  "ncdProtector": false,
  "liability": "at_fault",
  "thirdPartyClaim": false,
  "workshopType": "authorized",
  "youngDriverInvolved": false,
  "repairType": "general",
  "vehicleUsage": "phv",
  "commercialClaimLoading": 15,
  "dailyDowntimeCost": 80,
  "claimDowntimeDays": 5,
  "selfPayDowntimeDays": 1
}
```

### `GET /api/clause-preview?id=<clauseId>&insurer=<insurerKey>`
Renders an HTML wrapper embedding the matching official policy wording PDF at its mapped source page (`income`, `etiqa`, `msig`) or a fallback notice when no local document is mapped.

**Production Endpoint**: `https://claimwise-sg-721110976915.asia-southeast1.run.app/api/clause-preview?id=workshop_surcharge&insurer=etiqa`

### Additional Endpoints
- `GET /api/rules` — Insurer profiles, deductibles, and standard GIA NCD step-down scale (`https://claimwise-sg-721110976915.asia-southeast1.run.app/api/rules`).
- `GET /api/benchmarks` — Singapore motor repair and premium benchmark statistics (`https://claimwise-sg-721110976915.asia-southeast1.run.app/api/benchmarks`).
- `GET /api/health` — Service health check returning uptime and timestamp (`https://claimwise-sg-721110976915.asia-southeast1.run.app/api/health`).

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
