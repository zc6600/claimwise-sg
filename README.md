# ClaimWise SG

Free, independent calculators for the expensive decisions of owning a car in Singapore.

**Live site:** https://claimwise.zc6600.wiki

ClaimWise does not sell insurance or loans. Every tool runs on the figures you enter, shows its method, and links to the official LTA, GIA, or insurer rules it relies on.

## What it answers

| When | Question | Route |
| --- | --- | --- |
| After an accident | Should I claim, or pay the workshop myself? | `/calculator` |
| At every renewal | Is the NCD Protector rider worth its price? | `/tools/ncd-protector` |
| At every renewal | Is the cheaper quote really cheaper once excess and NCD loss count? | `/tools/quote-compare` |
| During a car loan | Should I settle the loan early? | `/tools/loan-prepayment` |
| Before COE expiry | Renew for 5 years, 10 years, or replace the car? | `/tools/coe-renewal` |

The landing page (`/`) links all five. Supporting pages:

- **My Car** (`/my-car`): save renewal, COE, and loan dates once to prefill the tools and get email reminders before each date.
- **Emergency kit** (`/emergency`): an offline checklist for the accident scene, with reporting rules and hotlines.
- **Private settlement** (`/settlement`): a settlement agreement under the GIA Motor Claims Framework.
- **Insurer rules** (`/rules`): excesses, NCD scale, and the official policy PDFs at the cited page.

Everything works without an account. Signing in syncs history and My Car across devices.

## How the numbers work

**Claim or self-pay.** An at-fault claim cuts the No-Claim Discount (NCD) by 30 points, which then recovers 10 points per claim-free year. Claiming pays only when the repair bill exceeds the excess plus the discounted extra premiums:

$$R^* = E_{\text{own}} + \sum_{t=1}^{T} \frac{P_t^{\text{claim}} - P_t^{\text{self}}}{(1 + r)^t} + \Delta\text{Downtime}$$

The calculator also covers workshop and young-driver surcharges, windscreen claims, third-party claims, the NCD Protector, and loadings and downtime for private hire (PHV) cars.

**NCD Protector.** The rider is worth buying when your chance of an at-fault claim this year exceeds its price divided by the premium loss it prevents.

**Quote comparison.** Each quote's expected cost is its premium plus the accident probability times what an accident would cost under it. That cost is either the repair bill or the excess plus NCD loss, whichever is cheaper. A low excess therefore only helps when a claim would be worth making.

**Loan settlement.** The interest rebate follows the Rule of 78, less your lender's fees. Settling is compared with keeping the cash invested at a return you choose.

**COE renewal.** Each option is turned into an equivalent yearly cost. Keeping the car gives up today's PARF and COE rebates and scrap value. Road tax surcharges for cars over 10 years old are included.

All tools share one NCD model (`src/ncd/premium-path.mjs`), so the same claim is priced the same way on every page. See [docs/architecture.md](docs/architecture.md) for details.

## Run locally

Requires Node.js 20 or later. No credentials are needed: the calculations are plain JavaScript and guest data stays in the browser.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # node:test suites for every calculation module
```

To use your own Firebase project, copy `.env.example` to `.env.local`.

| Path | Contents |
| --- | --- |
| `app/`, `components/` | Next.js pages, API routes, and React components |
| `src/` | Pure calculation modules: claim engine, NCD model, car tools, My Car, reminder schedule |
| `lib/` | Code with side effects: Firebase, storage, email, policy documents |
| `data/`, `public/policies/` | Market data and official policy wordings |
| `tests/`, `evaluation/` | Unit tests; correctness, load, and user-study evaluation |
| `infra/terraform/` | Google Cloud infrastructure |

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/decision` | Claim vs. self-pay result, break-even repair cost, renewal schedule, and clause audit |
| `GET /api/rules` | Insurer profiles, excesses, and the NCD scale |
| `GET /api/clause-preview?id=<clause>&insurer=<insurer>` | Official policy PDF at the cited page |
| `GET /api/benchmarks` | Singapore repair and premium benchmarks |
| `GET /api/health` | Service status |

Minimal `POST /api/decision` body; omitted fields use defaults:

```json
{ "insurer": "income", "currentPremium": 1650, "currentNcd": 50, "excess": 600, "repairCost": 2500 }
```

## More

- [Architecture](docs/architecture.md) · [Deployment](docs/DEPLOYMENT_GUIDE.md) · [Evaluation](evaluation/README.md)
- [Contributing](CONTRIBUTING.md) · [Agent guidelines](AGENTS.md)

## Disclaimer

ClaimWise SG gives general information from the figures you enter. It is not financial advice. Your policy schedule, loan agreement, and current official rules take precedence.
