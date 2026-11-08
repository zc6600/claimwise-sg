# ClaimWise SG

Free, independent calculators for the expensive decisions of owning a car in Singapore.

**Live site:** https://claimwise.zc6600.wiki

ClaimWise does not sell insurance or loans. Every tool runs on the figures you enter, shows its method, and links to the official LTA, GIA, or insurer rules it relies on.

## 1. Motivation

Car ownership rules in Singapore are split across GIA frameworks, LTA schedules, insurer policy wordings, and Rule of 78 loan contracts, while workshops, insurers, and brokers each have commercial incentives tied to your choice.

| When | Question | Route |
| --- | --- | --- |
| After an accident | Should I claim, or pay the workshop myself? | `/calculator` |
| At every renewal | Is the NCD Protector rider worth its price? | `/tools/ncd-protector` |
| At every renewal | Is the cheaper quote really cheaper once excess and NCD loss count? | `/tools/quote-compare` |
| During a car loan | Should I settle the loan early? | `/tools/loan-prepayment` |
| Before COE expiry | Renew for 5 years, 10 years, or replace the car? | `/tools/coe-renewal` |

Top navigation links **Car tools** (`/`), **My car** (`/my-car`, saving key dates and policy figures once to prefill tools and send email reminders), and **Emergency** (`/emergency`, an offline checklist for the accident scene). Footer links cover **Private settlement** (`/settlement`), **How it works** (`/how-it-works`), **Insurer rules** (`/rules`), and **Privacy** (`/privacy`).

Full details and real-world Singapore cases: **[docs/motivation.md](docs/motivation.md)**

## 2. Business Model

The site currently runs with **no live ads** (`public/ads.txt` uses a placeholder ID pending AdSense onboarding, and `components/SponsoredAdUnit.jsx` is unmounted).

- **Revenue plan**: Apply for Google AdSense on guide and result views while keeping `src/` pure and independent of ads. Under Google's Asia-Pacific multipliers (`2.18` Autos, `5.29` Finance), reaching \$1,000/month at two page views per visit requires ~95k–229k monthly visits.
- **Acquisition & retention**: Search pages answer incident, renewal, loan, and COE questions; **My Car** email reminders bring owners back before renewal, loan review, and COE expiry.
- **Paid search**: Breaking even on Google Ads requires $\text{Page RPM} = 500 \times \text{CPC}$, so paid search is treated only as a bounded S\$152/month demand test.

Full analysis and competitor comparison: **[docs/business-model.md](docs/business-model.md)**

## 3. Architecture

Single Next.js 15 app on Google Cloud Run (`asia-southeast1`) behind a Cloudflare Worker (`infra/cloudflare/`) at `claimwise.zc6600.wiki`.

- `src/`: Pure calculation modules (`decision-engine.mjs`, `claim-explanations.mjs`, shared NCD path `src/ncd/premium-path.mjs`, `src/car-decisions/*.mjs`, calculator share links, settlement form, clause and market data, `my-car.mjs`, `src/reminders/*`).
- `lib/`: Side effects (Firebase Auth/Firestore, Resend email, HMAC reminder tokens).
- `infra/`: Terraform (`infra/terraform/`) and Cloudflare Worker (`infra/cloudflare/`), deployed via keyless GitHub Actions.

```bash
npm install
npm test        # 128 node:test checks across tests/*.test.mjs
npm run dev     # http://localhost:3000
```

Full design and deployment: **[docs/architecture.md](docs/architecture.md)** · **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)**

## 4. Evaluation

| Part | Evidence |
| --- | --- |
| Unit & actuarial suite (`npm test`) | 128/128 checks passing across 12 `node:test` files |
| Decision correctness (`evaluation/correctness.mjs`) | 18/18 model cases; 26/26 local HTTP checks |
| HTTP performance (`evaluation/PERFORMANCE_REPORT.md`) | Sustained (50 VUs, 60s): 91.8–95.3 req/s, P95 65–120 ms, 0% errors; Burst (200 journeys): 400/400 succeeded |
| Questionnaire (`evaluation/simple_user_study.py`) | Crossover study protocol and 26-record synthetic pipeline demo (`0` human participants) |

Full methods and results: **[docs/evaluation.md](docs/evaluation.md)** · **[evaluation/README.md](evaluation/README.md)**

## Disclaimer

ClaimWise SG gives general information from the figures you enter. It is not financial advice. Your policy schedule, loan agreement, and current official rules take precedence.
