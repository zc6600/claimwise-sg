# Business Model

Research checked: 7 November 2026. Scope: consumer acquisition and display advertising.

**Current status:** Production runs with **no live advertisements** (`public/ads.txt` uses a placeholder publisher ID pending AdSense approval, and `components/SponsoredAdUnit.jsx` is an unmounted prototype). **Google Ads buys traffic; Google AdSense monetizes traffic.** ClaimWise SG tests organic search, **My Car** reminder retention, and AdSense first, treating paid search only as optional demand research.

## 1. Google AdSense revenue model

Apply for AdSense with original Singapore guides and the five calculators, placing display units below guide text and completed results—away from calculator inputs and emergency instructions—while keeping `src/` pure. ([Eligibility](https://support.google.com/adsense/answer/9724?hl=en) · [Placement rules](https://support.google.com/adsense/answer/2660562?hl=en) · [Revenue share: 80% / ~68%](https://support.google.com/adsense/answer/180195?hl=en) · [S\$150 payout threshold](https://support.google.com/adsense/answer/1709871?hl=en))

From Google's [official Asia-Pacific calculator data](https://adsense.google.com/start/calculator-data.json) (`Autos & Vehicles` multiplier `2.18`, `Finance` multiplier `5.29` per 1,000 monthly page views; `$` denomination not specified as SGD), assuming **two monetizable page views per visit**:

| Monthly visits | Monthly page views | Autos reference (`2.18`) | Finance reference (`5.29`) |
| ---: | ---: | ---: | ---: |
| 1,000 | 2,000 | \$4.36 / mo | \$10.58 / mo |
| 10,000 | 20,000 | \$43.60 / mo | \$105.80 / mo |
| 25,000 | 50,000 | \$109.00 / mo | \$264.50 / mo |
| 50,000 | 100,000 | \$218.00 / mo | \$529.00 / mo |

Reaching \$1,000/month in the calculator's denomination requires **94,518–229,358 visits/month**. Offline PWA sessions generate no impressions. Replace regional multipliers with actual SGD [Page RPM](https://support.google.com/adsense/answer/190515?hl=en) after launch.

## 2. Search acquisition & lifecycle retention

Focused worked examples answer specific searches and lead into the matching tool, while **My Car** (`/my-car`) emails double opt-in reminders before renewal (45d), loan review (30d), and COE expiry (365d/90d):

| Keyword seeds (research seeds, unverified volume) | Route & offer |
| --- | --- |
| `should I claim car insurance singapore`, `claim or self pay car repair singapore` | `/calculator` — Claim vs. self-pay break-even and renewal schedule |
| `PHV accident downtime singapore` | `/calculator` (PHV) — Downtime loss and commercial loading |
| `NCD loss after accident singapore`, `NCD protector singapore` | `/tools/ncd-protector` — 5-year NCD loss and rider break-even |
| `car insurance excess singapore` | `/tools/quote-compare` — Expected cost across premium, excess, and NCD loss |
| `car loan early settlement rule of 78 singapore` | `/tools/loan-prepayment` — Rule of 78 rebate and break-even return |
| `COE renewal 5 or 10 years calculator singapore` | `/tools/coe-renewal` — Yearly cost with PARF opportunity cost |

**First milestone:** 1,000 relevant Singapore monthly visits via [Search Console](https://support.google.com/webmasters/answer/7576553?hl=en) to validate distribution and Page RPM.

## 3. Google Ads test math (S\$152/month cap)

Before spending, export 12-month Singapore search volumes and bids from [Keyword Planner](https://support.google.com/google-ads/answer/3022575?hl=en). A bounded 1-month test at S\$5/day caps spend at **S\$152** ([budget rules](https://support.google.com/google-ads/answer/10486637?hl=en), Singapore physical presence, exact/phrase match):

| Assumed CPC | Clicks for S\$152 | Page views (2/visit) | Break-even SGD Page RPM (`500 × CPC`) |
| ---: | ---: | ---: | ---: |
| S\$0.20 | 760 | 1,520 | S\$100 |
| S\$1.00 | 152 | 304 | S\$500 |
| S\$3.00 | 51 | 101 | S\$1,500 |

Do not scale bought traffic unless attributable SGD ad revenue per session exceeds CPC.

## 4. Competitor comparison & 4-week validation

| Dimension | ClaimWise SG | [interest.sg](https://interest.sg/car-cost/motor-insurance-ncd-calculator/) | [MoneyBees](https://themoneybees.co/calculators/car-insurance-ncd) |
| --- | --- | --- | --- |
| Scope | 5 car calculators + settlement, offline emergency kit, My Car reminders | 9 car tools within 34 finance calculators | NCD calculator within 220+ tools; adviser lead handoff |
| NCD & excess | Discounted cash flows (`src/ncd/premium-path.mjs`), base/workshop/young-driver excess | Custom annual base premiums, explicit excess & cap | 5-year extra premium; no excess field observed |
| PHV & clauses | Daily downtime, commercial loading, embedded policy PDFs | Not observed | Vehicle classes; no downtime input observed |

**Shared benchmark check:** S\$2,000 gross premium, 50% NCD, S\$1,500 repair, S\$600 excess, 0% growth/discount. Three-year NCD loss is $\text{S\$600}+\text{S\$400}+\text{S\$200}=\text{S\$1,200}$; adding S\$600 excess makes claiming **S\$1,800 vs. S\$1,500 self-pay** (self-pay saves S\$300).

**Four-week experiment (3 hrs/week):** Week 1: audit 10 motorist questions and [MyCarForum](https://www.mycarforum.com/forums/topic/2633796-guidelines-on-marketplace-posting/) / [r/drivingsg](https://www.reddit.com/r/drivingsg/comments/1ksgu3r/) rules. Week 2: share one worked example with ownership disclosure. Week 3: publish PHV downtime and workshop-excess guides. Week 4: review against a first-cycle target of **100 sessions and 20 completed calculations**.
