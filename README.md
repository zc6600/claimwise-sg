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

The home page (`/`) walks through the tools by ownership stage with worked examples. Top navigation links **Car tools** (`/tools`, a plain list of every calculator and feature), **My car** (`/my-car`, saving key dates and policy figures once to prefill tools and send email reminders), and **After an accident** (`/accident`, which leads to the offline emergency checklist, the claim calculator, and the private settlement agreement). Footer links cover **Insurer rules** (`/rules`), **How it works** (`/how-it-works`), and **Privacy** (`/privacy`). Insurer rules also has one page per insurer (`/rules/{insurer}`), per insurer clause (`/rules/{insurer}/{topic}`), and per topic comparison (`/rules/compare/{topic}`), quoting Income, MSIG, Etiqa, and DirectAsia wordings with PDF page citations.

**For search engines and AI assistants:** every public page is listed in `/sitemap.xml` and `/llms.txt` (with `/llms-full.txt` carrying every quoted clause), carries schema.org JSON-LD, and the claim, NCD Protector, and quote comparison tools accept documented query parameters that prefill them. A stateless [Model Context Protocol](https://modelcontextprotocol.io) server at `/mcp` (Streamable HTTP, no sign-in) exposes `evaluate_claim`, `evaluate_ncd_protector`, `compare_quotes`, and `get_policy_wording`, each returning the same figures as the website plus a link that reopens the calculation.

Full details and real-world Singapore cases: **[docs/motivation.md](docs/motivation.md)**

## 2. Business Model

Car owners face a few expensive decisions, search for answers, and get a neutral calculation on their own figures; when an owner then switches insurer, ClaimWise earns a referral fee. Production runs with no live referral links or ads yet, so the figures below are forecasts.

- **Users**: Singapore car owners at an accident, a renewal, a loan review, or COE expiry; renewal recurs for ~996,000 vehicles every year.
- **Arrival**: Google search and AI assistants, through insurer rule pages quoting policy wording, JSON-LD, `llms.txt`, prefilled links, and the `/mcp` server; **My Car** reminders bring owners back before each decision.
- **Revenue**: a referral commission when an owner switches insurer after comparing quotes (~S\$100 per switch, S\$3.20 per member per year in the base case), plus vehicle-sale referrals and AdSense. Calculation modules in `src/` never read partner data.
- **Profit**: with the domain (~S\$50/year) as the only cost, base-case net is ~S\$1.2k, S\$6.4k, and S\$25.6k a year at 1,000, 5,000, and 20,000 monthly visits.
- **Next**: prove that 4% of My Car members switch insurer each year.

Full model, sources, and landscape: **[docs/business-model.md](docs/business-model.md)**

## 3. Architecture

Single Next.js 15 app on Google Cloud Run (`asia-southeast1`) behind a Cloudflare Worker (`infra/cloudflare/`) at `claimwise.zc6600.wiki`.

- `src/`: Pure calculation modules (`decision-engine.mjs`, `claim-explanations.mjs`, shared NCD path `src/ncd/premium-path.mjs`, `src/car-decisions/*.mjs`, calculator share links, settlement form, clause and market data, `my-car.mjs`, `src/reminders/*`).
- `lib/`: Side effects (Firebase Auth/Firestore, Resend email, HMAC reminder tokens).
- `infra/`: Terraform (`infra/terraform/`) and Cloudflare Worker (`infra/cloudflare/`), deployed via keyless GitHub Actions.

```bash
npm install
npm test        # 159 node:test checks across tests/*.test.mjs
npm run dev     # http://localhost:3000
```

Full design and deployment: **[docs/architecture.md](docs/architecture.md)** · **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)**

## 4. Evaluation

| Part | Evidence |
| --- | --- |
| Unit & actuarial suite (`npm test`) | 159/159 checks passing across 15 `node:test` files |
| Decision correctness (`evaluation/correctness.mjs`) | 18/18 model cases; 26/26 local HTTP checks |
| HTTP performance (`evaluation/PERFORMANCE_REPORT.md`) | Sustained (50 VUs, 60s): 91.8–95.3 req/s, P95 65–120 ms, 0% errors; Burst (200 journeys): 400/400 succeeded |
| Questionnaire (`evaluation/simple_user_study.py`) | Crossover study protocol and 26-record synthetic pipeline demo (`0` human participants) |

Full methods and results: **[docs/evaluation.md](docs/evaluation.md)** · **[evaluation/README.md](evaluation/README.md)**

## Disclaimer

ClaimWise SG gives general information from the figures you enter. It is not financial advice. Your policy schedule, loan agreement, and current official rules take precedence.
