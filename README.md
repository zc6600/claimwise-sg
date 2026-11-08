# ClaimWise SG · Car Ownership Decisions for Singapore

[![CI](https://github.com/zc6600/claimwise-sg/actions/workflows/ci.yml/badge.svg)](https://github.com/zc6600/claimwise-sg/actions/workflows/ci.yml)
[![Deploy](https://github.com/zc6600/claimwise-sg/actions/workflows/deploy.yml/badge.svg)](https://github.com/zc6600/claimwise-sg/actions/workflows/deploy.yml)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-asia--southeast1-blue?logo=googlecloud)](https://claimwise.zc6600.wiki)

**ClaimWise SG** helps Singapore private car owners and private hire (PHV) drivers make the money decisions of owning a car. Its core question: after a minor collision, is it cheaper to **pay for the repair yourself** or **file an own-damage claim**?

The decision engine models No-Claim Discount (NCD) step-downs, excess and workshop surcharges, commercial claim loadings, downtime, General Insurance Association (GIA) rules, and present-value discounting to find the break-even repair cost $R^*(S)$, with every rule traced to policy wording.

**Live site:** https://claimwise.zc6600.wiki

---

## Features

| Feature | Route | What it does |
| --- | --- | --- |
| Claim vs. self-pay calculator | `/calculator` | Multi-year cash-flow comparison, break-even threshold, renewal schedule, and clause audit; shareable links and printable report |
| Trajectory and stress test | `/calculator` results | Cumulative cost and NCD recovery charts; exposure if a second at-fault claim follows within 12 months |
| Car decision tools (landing page) | `/` | NCD Protector break-even, renewal quote comparison, COE renewal vs. replacement, car loan early settlement |
| My Car and reminders | `/my-car` | Saves key dates and policy figures to prefill the tools; optional email reminders before renewal, COE expiry, and loan review |
| Private settlement | `/settlement` | GIA Motor Claims Framework settlement agreement with statutory prerequisites |
| Emergency kit | `/emergency` | Offline on-scene checklist, reporting rules, tow-truck scam warnings, and hotlines for underground carparks |
| Insurer rules | `/rules` | Insurer profiles (Income, Etiqa, MSIG, FWD, GIA baseline), NCD scale, and official policy PDFs at the cited page |

Guests can use everything. Signing in (Google or email) syncs calculation history and My Car to Firestore in Singapore.

### Break-Even Model

$$R^*(S) = E_{\text{own}} + \sum_{t=1}^{T} \frac{P_t^{\text{claim}} - P_t^{\text{self}}}{(1 + r)^t} + (\text{Downtime}^{\text{claim}} - \text{Downtime}^{\text{self}})$$

Renewals are projected over 3 or 5 years (default discount rate 3% p.a.) with lower, base, and higher premium-growth scenarios.

---

## Quick Start

Requires Node.js 20 or later. No database or cloud credentials are needed: the decision engine is pure JavaScript, guest data stays in the browser, and `lib/firebase-config.js` ships public project defaults.

```bash
git clone https://github.com/zc6600/claimwise-sg.git
cd claimwise-sg
npm install
npm test        # Node's built-in test runner; all tests must pass
npm run dev     # http://localhost:3000
```

To use your own Firebase project, copy `.env.example` to `.env.local`.

---

## Repository Layout

| Path | Contents |
| --- | --- |
| `app/`, `components/` | Next.js App Router pages, route handlers (`app/api/`), and React components |
| `src/` | Pure, side-effect-free modules: claim engine, shared NCD premium path (`src/ncd/`), car decision tools, trajectory and stress-test calculators, My Car, reminder schedule |
| `lib/` | Firebase access, server storage, reminder service, settlement form, clause documents, and market data |
| `data/`, `public/policies/` | Market statistics and official policy wordings |
| `tests/` | `node:test` suites for every decision module and server component |
| `infra/terraform/` | Google Cloud infrastructure; `.github/workflows/` runs CI and deployment |
| `evaluation/` | Correctness, load, and user-study tooling |

---

## API

Base URL: `https://claimwise.zc6600.wiki`

| Endpoint | Purpose |
| --- | --- |
| `POST /api/decision` | Claim vs. self-pay comparison, break-even threshold, renewal schedule, and clause audit |
| `GET /api/clause-preview?id=<clause>&insurer=<income\|etiqa\|msig>` | Official policy PDF at the cited page |
| `GET /api/rules` | Insurer profiles, excesses, and the GIA NCD scale |
| `GET /api/benchmarks` | Singapore repair and premium benchmarks |
| `GET /api/health` | Service status |
| `/api/reminders/*` | Reminder sign-up, confirmation, management, and daily dispatch ([details](docs/architecture.md#5-email-reminders)) |

Example `POST /api/decision` body:

```json
{
  "insurer": "income", "currentPremium": 3200, "currentNcd": 50, "excess": 1500,
  "repairCost": 2500, "horizonYears": 3, "baseGrowthRate": 5, "discountRate": 3,
  "liability": "at_fault", "workshopType": "authorized", "repairType": "general",
  "ncdProtector": false, "thirdPartyClaim": false, "youngDriverInvolved": false,
  "vehicleUsage": "phv", "commercialClaimLoading": 15, "dailyDowntimeCost": 80,
  "claimDowntimeDays": 5, "selfPayDowntimeDays": 1
}
```

---

## Evaluation

| Evaluation | Command |
| --- | --- |
| Decision correctness (18 cases, plus 8 HTTP validation cases) | `node evaluation/correctness.mjs` |
| Load and latency | `bash evaluation/run_performance.sh <origin> [comparison\|steady]` |
| Cloud Run elasticity | `python evaluation/cloud_metrics.py --run-dir <run-directory>` |
| Participant scenario study | `python evaluation/simple_user_study.py prepare` / `analyze` |
| Illustrative cost model (not measured billing) | `python scripts/tco_calculator.py` |

See [evaluation/README.md](evaluation/README.md) and the [user study protocol](evaluation/USER_STUDY_PROTOCOL.md).

---

## Documentation

- [Architecture](docs/architecture.md): system design, data flows, and diagrams
- [Deployment guide](docs/DEPLOYMENT_GUIDE.md): local setup, releases, Terraform, troubleshooting
- [Contributing](CONTRIBUTING.md) · [Agent guidelines](AGENTS.md)
- [Advertising and revenue model](docs/ADVERTISING_AND_REVENUE_MODEL.md)

---

## Disclaimer

ClaimWise SG provides informational decision support. Check your Policy Schedule, endorsements, and insurer claims guidelines before deciding how to settle.
