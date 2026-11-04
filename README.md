# 🇸🇬 ClaimWise SG · Singapore Motor Insurance Decision Support SaaS

[![Tests](https://img.shields.io/badge/tests-13%2F13%20passed%20(100%25)-success)](tests/decision-engine.test.mjs)
[![Correctness Evaluation](https://img.shields.io/badge/correctness-13%2F13%20hand--checked-teal)](evaluation/correctness_results.tex)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1.0-black)](https://nextjs.org)
[![Cloud Engine](https://img.shields.io/badge/Cloud%20Engine-Next.js%20Route%20Handlers-blue)](app/api/decision/route.js)
[![Cloud Database](https://img.shields.io/badge/GCP%20Firestore-asia--southeast1%20(Singapore)-orange)](https://console.firebase.google.com/project/claimwise-sg)

**ClaimWise SG** is an actuarially rigorous, cloud-native post-accident decision-support platform designed for Singapore private car owners. When minor collision damage occurs, motorists face a complex trade-off: **pay out-of-pocket (Self-Pay) or file an Own-Damage insurance claim (Claim)**.

ClaimWise SG models multi-year No-Claim Discount (NCD) penalties, contractual workshop excess surcharges, young driver liabilities, GIA third-party subrogation protocols, and present value discounting to compute the exact break-even repair threshold ($R^*(S)$), backed by a **100% traceable legal clause audit trail** with **embedded iframe document previews**.

<!-- CI/CD: Automated PR verification enabled via PR Agent -->

---

## 🚀 Quick Access

Access the live application at **[https://claimwise-sg-721110976915.asia-southeast1.run.app](https://claimwise-sg-721110976915.asia-southeast1.run.app)** (or run locally at `http://localhost:3000`).

---

## 🌟 Key Features

### 1. Actuarially Rigorous Decision Engine (Equation 1)
- Implements the multi-year Discounted Cash Flow (DCF) net present value formula:
  $$R^*(S) = E_{own} + \sum_{t=1}^{T} \frac{P_t^{claim} - P_t^{self}}{(1 + r)^t}$$
- Discounts future renewal cash flows using Singapore's sovereign risk-free yield rate ($r=3.0\%$ p.a.) across 3-year or 5-year planning horizons.
- Evaluates sensitivity across Lower (-5%), Neutral (Base), and Higher (+5%) premium escalation bands.

### 2. Policy References & Calculation Assumptions
The audit panel shows the assumptions used by the model and references for users to verify against their own policy. Generated summaries are illustrative and are not verbatim contract extracts:
- **Base Excess ($E_{base}$)**: Section 1 (Own Damage) Policy Schedule.
- **Workshop Excess Surcharge ($E_{workshop}$)**: Etiqa Tiq Part 1 Clause 4.2 (+S$2,000) / Income Endorsement 101 (+S$1,000) / MSIG Endorsement M101 (+S$1,000) / FWD Network Clause (+S$1,000).
- **Young / Inexperienced Driver Surcharge ($E_{young}$)**: General Exceptions Clause 3(b) (+S$2,000 ~ S$2,500) for drivers aged <25 or licensed <2 years.
- **GIA Windscreen Endorsement W1**: S$100 fixed excess with 0% NCD penalty.
- **Third-Party Claim Scenario**: The model assumes an at-fault or partial-fault third-party claim can affect NCD even if own damage is self-paid; verify your insurer's handling.
- **Non-Fault Scenario**: The model assumes no NCD deduction for a 100% non-fault accident; confirm the claim route and terms with your insurer.

### 3. Interactive Multi-Page PDF Iframe Popover (Solution 2 ⭐⭐⭐)
- Hovering over any citation badge (e.g., `📜 Sec 1 Excess`, `📜 GIA MCF §1.1`, `📜 Actuarial Eq. (1)`) smoothly displays a floating card.
- **Direct Official Insurer PDF Rendering**: The embedded `<iframe>` loads policy documents sourced from insurers and GIA (for example `/policies/etiqa_tiq_motor_policy.pdf` and `/policies/income_drivo_policy.pdf`) with PDF page anchors (`#page=N&view=FitH`). Clause page references should be verified against the applicable policy version and schedule.
- **Dual-Mode Viewer**: Instant toggle between a referenced PDF and an illustrative clause summary.
- **Full Page Flipping**: Users can scroll up or down across the full multi-page legal contract (with official MAS headers, stamps, and schedules) to verify adjacent clauses and definitions.
- **Pin & Full Tab**: Supports **📌 One-Click Pinning**, **↗ Full Tab**, and **Viewport Collision Auto-Positioning**.

### 4. Singapore Market Calibration (Section 4.2)
- Compares user repair quotes and annual premiums against empirical Land Transport Authority (LTA) and General Insurance Association of Singapore (GIA) market statistics:
  - SG Private Car Repair Quote Median: **S$1,850**
  - SG Comprehensive Annual Premium Median: **S$1,650**
  - SG Typical Comprehensive Policy Excess: **S$500 – S$1,000**

### 5. Firebase Authentication & Singapore Firestore Cloud Sync
- Google and email/password sign-in via Firebase Authentication.
- Calculations can be saved to Google Cloud Firestore native instances in Singapore (`asia-southeast1`) with user-isolated security rules (`firestore.rules`).

---

## 🛠️ Tech Stack & Architecture

- **Web Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Vanilla Modern Responsive CSS (Glassmorphism, DM Mono typography, Dark accents)
- **State & Backend**: Next.js Route Handlers (`/api/decision`, `/api/clause-preview`)
- **Cloud Database**: Google Cloud Firestore Native in `asia-southeast1` (Singapore)
- **Authentication**: Firebase Authentication (Google and email/password)
- **Testing**: Node.js Native Test Runner (`node --test`)
- **Infrastructure as Code**: Terraform GCP & Firebase configuration in [`infra/terraform`](infra/terraform)

---

## 📦 Running & Deployment Instructions

### 1. Prerequisites
- Node.js `>= 20.0.0`
- Python 3 (`python`) for evaluation scripts

### 2. Local Production Mode (Currently Running)
```bash
# 1. Install dependencies
npm install

# 2. Build the optimized production bundle
npm run build

# 3. Start the production server on port 3000
npm run start -- -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Local Development Mode
```bash
npm run dev
```
Open [http://localhost:3000/calculator](http://localhost:3000/calculator).

### 4. Deploying Firestore Security Rules
```bash
firebase deploy --only firestore:rules --project claimwise-sg
```

### 5. Automated Infrastructure Deployment (GCP / Terraform)
```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Update your GCP project ID and region
terraform init
terraform plan
terraform apply
```

---

## 🧪 Evaluation Deliverables (CS5224 Section 4.3)

All empirical evaluation results have been generated and exported to LaTeX tables for report inclusion:

| Dimension | Method & Tool | Result & Metric | LaTeX Report File |
| :--- | :--- | :--- | :--- |
| **Mathematical Correctness** | 13 hand-checked boundary test cases ([`tests/fixtures/benchmark_cases.json`](tests/fixtures/benchmark_cases.json)) executed via [`scripts/run_correctness_eval.py`](scripts/run_correctness_eval.py) | **13/13 Passed (100.0%)**, mean engine latency **18.99 ms** | [`evaluation/correctness_results.tex`](evaluation/correctness_results.tex) |
| **Performance & Elasticity** | Locust headless load testing ([`tests/load/locustfile.py`](tests/load/locustfile.py)) executed via [`scripts/run_locust_evaluation.py`](scripts/run_locust_evaluation.py) | **357 requests**, **0.00% failures**, Median latency **8.00 ms**, 95th percentile **21.00 ms** | [`evaluation/performance_results.tex`](evaluation/performance_results.tex) |
| **Cloud TCO Evaluation** | 3-Year Total Cost of Ownership model ([`scripts/tco_calculator.py`](scripts/tco_calculator.py)) comparing Cloud Native Serverless vs. On-Premises | **78.4% Cost Reduction** (Cloud: US\$2,374 vs On-Prem: US\$11,000) | [`evaluation/tco_comparison.tex`](evaluation/tco_comparison.tex) |
| **User Usability Study** | Standard System Usability Scale (SUS, $N=20$ motorists) evaluated via [`scripts/analyze_user_study.py`](scripts/analyze_user_study.py) | **SUS Score: 89.6 / 100 (Grade A+, Excellent)** | [`evaluation/user_study_results.tex`](evaluation/user_study_results.tex) |

To re-run the entire evaluation pipeline:
```bash
# 1. Run unit tests
npm test

# 2. Run correctness evaluation
python scripts/run_correctness_eval.py

# 3. Run load test evaluation
python scripts/run_locust_evaluation.py

# 4. Run TCO evaluation
python scripts/tco_calculator.py

# 5. Run User Usability analysis
python scripts/analyze_user_study.py
```

---

## 📡 API Reference

### 1. `POST /api/decision`
Computes the actuarial comparison and returns the full clause audit trail.

**Request Body:**
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

**Response:**
```json
{
  "ok": true,
  "decision": {
    "recommendation": "self-pay",
    "effectiveExcess": 4600,
    "claimNcdAfter": 20,
    "selfPayNcdAfter": 50,
    "clauseAudit": [
      {
        "id": "workshop_surcharge",
        "category": "Excess & Deductibles",
        "dataPoint": "Workshop Choice Surcharge",
        "value": "+S$2,000",
        "status": "active",
        "clauseRef": "Etiqa Tiq Motor Policy Part 1 — Clause 4.2",
        "authority": "Etiqa (Tiq) Network Scheme",
        "statutoryBasis": "General Insurance Association of Singapore (GIA) Approved Workshop Guidelines",
        "illustrativeText": "Illustrative workshop surcharge summary; verify the amount and conditions against your policy schedule.",
        "rationale": "You selected an independent/unauthorised workshop. Under Etiqa (Tiq) Endorsement terms, an additional penalty of S$2,000 is added to your excess."
      }
    ]
  }
}
```

### 2. `GET /api/clause-preview`
Embeds the official insurer PDF at the mapped source page for embedding in the calculator's hover preview.

**Query Parameters:**
- `id`: Clause identifier (`base_excess`, `workshop_surcharge`, `young_driver_excess`, `windscreen_clause`, `effective_excess`, `ncd_step_down`, `ncd_protector_rider`, `third_party_liability`, `actuarial_model`).
- `insurer`: Insurer key (`income`, `etiqa`, `msig`, `fwd`, `other`). Official local PDFs are currently mapped for `income`, `etiqa`, and `msig`; the other keys show a no-source notice instead of another insurer's document.

---

## 🤝 Collaboration & Contribution

For guidelines on branch management, PR Agent automated review, and local development, see [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

---

## 📄 License & Disclaimer

This project was developed for **NUS CS5224 Cloud Computing (AY2025/2026)**. It provides objective actuarial modeling for informational post-accident decision support. Policyholders should consult their official insurance schedule and insurer claims department before formal settlement.
