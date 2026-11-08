# Motivation

Owning a car in Singapore involves steep, rule-bound costs: COE premiums, PARF rebates, progressive road tax surcharges after year 10, Rule of 78 car loans, and a 0%–50% No-Claim Discount (NCD) scale. When an expensive decision arrives, the rules sit across GIA frameworks, LTA tables, and insurer PDFs, while workshops, insurers, and brokers each have commercial incentives tied to your choice.

ClaimWise SG gives motorists free, independent calculators that run on their own numbers and link straight to the underlying rules.

## 1. What each tool solves

- **Claim or self-pay (`/calculator`)**: An unprotected at-fault claim cuts NCD by 30 percentage points and recovers 10 points per claim-free year. Claiming only pays when the repair bill beats the effective excess plus discounted extra renewals and downtime:

$$R^* = E_{\text{own}} + \sum_{t=1}^{T} \frac{P_t^{\text{claim}} - P_t^{\text{self}}}{(1 + r)^t} + \Delta\text{Downtime}$$

  Also accounts for unauthorized-workshop and young-driver surcharges, windscreen and non-fault rules, commercial PHV loadings/downtime, and consecutive-claim exposure (`src/stress-test-calculator.mjs`).
- **NCD Protector (`/tools/ncd-protector`)**: Prices the five-year premium loss of one at-fault claim with and without the rider (`src/ncd/premium-path.mjs`). Worth buying when your annual claim risk exceeds `rider cost ÷ loss avoided`.
- **Quote comparison (`/tools/quote-compare`)**: Ranks quotes by `premium + accident probability × min(repair cost, effective excess + 5-year NCD loss)`. A low excess gets no credit when a claim would not be worth making.
- **Loan early settlement (`/tools/loan-prepayment`)**: Computes the Rule of 78 interest rebate less the 20% clawback penalty and fees, then finds the investment return needed for keeping cash to beat settling early.
- **COE renewal (`/tools/coe-renewal`)**: Converts 5-year renewal, 10-year renewal, and replacement into equivalent annual costs, charging today's PARF/COE rebates and scrap value as an opportunity cost and adding the 10%–50% road tax surcharge after age 10.

## 2. Public Singapore case context

These public cases illustrate the real disputes behind our benchmark fixtures (`tests/fixtures/benchmark_cases.json`), though neither publishes a full multi-year renewal ledger:

1. **S\$1,400 repair quote with an NCD Protector ([r/drivingsg](https://www.reddit.com/r/drivingsg/comments/1xe2mh1/need_advice_private_settlement_or_insurance/))**: A driver reversed into a parked car. The insurer suggested private settlement at ~S\$800, then advised claiming once the quote reached S\$1,400, leaving the driver unsure how renewal premiums would move even with an NCD Protector (`CASE-002`).
2. **Rear impact and non-fault NCD preservation ([*Lo Lee Len v Grand Interior Renovation Works* [2004] SGHC 22](https://www.elitigation.sg/gdviewer/s/2004_SGHC_22))**: Records S\$1,792.20 in repairs, S\$450 excess, and S\$600 transport allowance where a non-fault driver pursued third-party recovery and kept his NCD intact (`CASE-005`). Highlights why mandatory 24-hour [GIA MCF](https://gia.org.sg/motor-insurance/21-buying-a-motor.html) reporting is separate from filing an own-damage claim.

## 3. Product design choices

- **Independent**: No insurance or loan brokerage; `src/` contains only pure functions.
- **Traceable**: Clause audits open the cited page of official Etiqa, Income, MSIG, and GIA PDFs (`public/policies/`).
- **Focused navigation**: The home page (`/`) introduces the site; the top bar links **Car tools** (`/tools`), **My car** (`/my-car`), **Emergency** (`/emergency`, offline-cached via `public/sw.js` for basement carparks), **Settlement** (`/settlement`), **Rules** (`/rules`), and **Sign in**; **How it works** and **Privacy** stay in the footer.
