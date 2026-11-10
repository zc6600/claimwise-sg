# Business Model

Research checked: 10 November 2026. Scope: organic acquisition (SEO and AI search), renewal-switch referral commissions, vehicle-sale referrals, and display advertising.

**Current status:** Production runs with **no live advertisements and no referral links** (`public/ads.txt` uses a placeholder publisher ID pending AdSense approval, and `components/SponsoredAdUnit.jsx` is an unmounted prototype). Every revenue figure below is a forecast built from published third-party prices and stated assumptions, not observed ClaimWise data.

## 1. Model summary

ClaimWise earns when an owner acts on a decision the tools have already priced, not when a page is viewed.

1. **Acquire** owners at expensive decision moments (accident, renewal, loan review, COE expiry) through organic search and AI assistants only. No money is spent on acquisition: no paid search, no paid SEO tools, and no commissioned content (Section 7).
2. **Retain** them with **My Car** (`/my-car`), which stores renewal, loan, and COE dates and emails double opt-in reminders 45 days before renewal, 30 days before loan review, and 365 and 90 days before COE expiry.
3. **Monetize** the action that follows:

| Stream | Trigger | Payout basis | Role |
| --- | --- | --- | --- |
| Renewal switch referral | Owner compares quotes in `/tools/quote-compare` and buys from a new insurer | Commission on new-customer motor policies | Primary |
| Vehicle-sale referral | Owner chooses to replace rather than renew COE in `/tools/coe-renewal` | Fee per inspection appointment and per completed sale | Secondary |
| Display advertising | Guide and result page views | AdSense Page RPM | Floor |
| Car-loan referral | Owner refinances after `/tools/loan-prepayment` | Lender-paid commission, rate unpublished | Excluded until terms are known |

Accident and workshop referrals are **out of scope**. A workshop or reporting-centre payout would bias the claim-versus-self-pay result, which is the product's core trust asset.

### Neutrality invariants

- `src/` calculation modules never read partner, commission, or placement data; results are identical with or without referral links.
- Referral links render only after a completed result, never beside inputs or emergency instructions.
- At least three insurers are listed side by side, ordered by the user's computed expected cost rather than by payout.
- Every referral block discloses that ClaimWise may receive a referral fee, and states the fee amount on request.
- When the calculation favours staying with the current insurer or declining a rider, the result says so and shows no switch prompt.

## 2. Market size

| Measure | Figure | Source |
| --- | --- | --- |
| Motor vehicle population | ~996,000 (end-2023) | [Statista, citing LTA](https://www.statista.com/statistics/956271/singapore-total-motor-vehicle-population) |
| New vehicle registrations | 62,671 in 2025 (+21% YoY) | [Just Auto](https://www.just-auto.com/newsletters/singapore-vehicle-sales-surge-21-in-2025) |
| Motor gross written premium | S\$1.28 billion in 2025 (+5.2% YoY), largest domestic general insurance line | [GIA 2025 results](https://gia.org.sg/images/media-center/company-news/Press-Release-GIA-Annual-Sector-Results-Announcement-2025.pdf) |
| Motor accidents recorded by GIA | Stable in 2025 while motor claims rose 11%; latest published count 161,361 (2016) | [GIA 2025 results](https://gia.org.sg/images/media-center/company-news/Press-Release-GIA-Annual-Sector-Results-Announcement-2025.pdf), [Insurance Business](https://insurancebusinessmag.com/asia/news/breaking-news/despite-more-car-accidents-in-singapore-insurance-claims-are-down-62885.aspx) |
| Car COE renewals | 2,834 in Q1 2025; prior annual record 37,114 | [Straits Times](https://www.magzter.com/en/stories/newspaper/The-Straits-Times/CAR-COE-RENEWALS-IN-Q1-HIGHEST-FOR-SAME-QUARTER-SINCE-2020), [Torque](https://torque.com.sg/?p=67813) |

Every insured vehicle renews once a year, so renewal is the only decision moment that recurs annually for the whole fleet. The addressable audience is a few hundred thousand owners, which caps any model priced per page view.

## 3. Payout evidence

| Partner | Published terms | Source | Caveat |
| --- | --- | --- | --- |
| DirectAsia (Impact, MCANISM) | 8% of new-customer motor, motorcycle, and travel premiums, 30-day cookie | [FlexOffers](https://www.flexoffers.com/affiliate-programs/direct-asia-insurance-affiliate-program/), [affi.io](https://affi.io/m/directasia-singapore) | An older post cites a flat 10% ([Lodestar](https://lodestar-marketing.com/blog/direct-asia-signup/)); confirm in the Impact dashboard |
| Etiqa via ShopBack | S\$64.50 consumer cashback on car insurance | [ShopBack Etiqa](https://www.shopback.sg/etiqa) | Cashback is the share passed to the consumer, so the insurer's payout to ShopBack is higher; in-app renewals are excluded |
| DirectAsia via ShopBack | Up to S\$108 consumer cashback | [ShopBack comparison](https://www.shopback.sg/blog/finance/sg-car-insurance-income-vs-directasia-vs-fwd-vs-etiqa-2026) | Product mapping of the figure is not stated |
| Quotz | S\$20 per completed inspection appointment, S\$100 per completed sale and handover | [Quotz referral](https://www.quotz.com.sg/referral) | Published as a consumer refer-a-friend scheme; publisher use requires a partner agreement |
| Lendela | Lender-paid commission on approved loans | [FlexOffers](https://www.flexoffers.com/affiliate-programs/lendela-affiliate-program/), [Roshi](https://www.roshi.sg/?p=14807) | No published rate; excluded from the model |

**Commission per switched policy.** An 8–10% rate on a typical S\$1,000–1,500 private-car premium yields S\$80–150, and the S\$64.50–108 consumer cashback figures set a floor on what insurers pay channels. The model uses **S\$60 / S\$100 / S\$150** for conservative, base, and optimistic cases. Payouts apply only to **new customers**: an owner who renews with the current insurer earns nothing.

## 4. Profit and loss model

### 4.1 Unit yields

Each yield is expected revenue per unit per year (or per completed session), after attribution loss. The credit factor covers broken cookies across the 45-day reminder window, cancellations, and the 90-day confirmation clawback.

**Renewal yield per My Car member per year**

$$Y_{\text{member}} = p_{\text{open}} \times p_{\text{compare}} \times p_{\text{click}} \times p_{\text{buy}} \times C \times k$$

**Yield per completed non-member quote comparison**

$$Y_{\text{compare}} = p_{\text{click}} \times p_{\text{buy}} \times C \times k$$

**Yield per completed COE decision**

$$Y_{\text{COE}} = p_{\text{appointment}} \times \text{S\$20} + p_{\text{sale}} \times \text{S\$100}$$

| Parameter | Conservative | Base | Optimistic |
| --- | ---: | ---: | ---: |
| Reminder opened (`p_open`) | 40% | 50% | 60% |
| Opened reminder leads to a comparison (`p_compare`) | 25% | 40% | 50% |
| Comparison leads to an outbound click (`p_click`), members | 50% | 50% | 60% |
| Outbound click buys a new-customer policy (`p_buy`), members | 30% | 40% | 45% |
| **Member switch rate (product)** | **1.5%** | **4.0%** | **8.1%** (modelled as 8%) |
| Non-member outbound click rate | 15% | 25% | 35% |
| Non-member purchase rate per click | 10% | 15% | 20% |
| Commission per switched policy (`C`) | S\$60 | S\$100 | S\$150 |
| Credit factor (`k`) | 70% | 80% | 90% |
| COE decision → sale-inspection appointment | 1% | 3% | 5% |
| COE decision → completed sale | 0.3% | 1% | 2% |
| AdSense Page RPM (S\$ per 1,000 page views) | 1.00 | 2.18 | 5.29 |
| **`Y_member` per year** | **S\$0.63** | **S\$3.20** | **S\$10.80** |
| **`Y_compare` per session** | **S\$0.63** | **S\$3.00** | **S\$9.45** |
| **`Y_COE` per decision** | **S\$0.50** | **S\$1.60** | **S\$3.00** |

The base and optimistic RPMs are Google's Asia-Pacific `Autos & Vehicles` (`2.18`) and `Finance` (`5.29`) reference multipliers from the [AdSense calculator data](https://adsense.google.com/start/calculator-data.json), whose currency is unspecified and is treated here as SGD.

### 4.2 Traffic stages

| Stage | Monthly visits | My Car members (10% of monthly visits) | Non-member comparisons / month (2% of visits) | COE decisions / month (1% of visits) | Page views / month (2 per visit) |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 1,000 | 100 | 20 | 10 | 2,000 |
| B | 5,000 | 500 | 100 | 50 | 10,000 |
| C | 20,000 | 2,000 | 400 | 200 | 40,000 |

Stage C is treated as a ceiling. At 20,000 visits it implies about 260 switched policies a year in the base case before attribution loss, roughly 0.03% of the national vehicle population.

### 4.3 Cost basis

The model counts one cost: the domain.

| Item | Cost / year | Basis |
| --- | ---: | --- |
| Dedicated domain | S\$50 | A `.com` at cost is about US\$11/year and `.com.sg` renews at S\$45–80/year before GST ([Cloudflare `.com`](https://domainoffer.net/tld/com/cloudflare), [`.com.sg` comparison](https://www.qoxy.com/compare-pricing/)); S\$50 covers either |

Deliberately excluded:

- **Acquisition spend.** Growth comes from SEO and AI-search visibility built into the product (Section 7). Rankings and AI citations are not bought; paid search, paid SEO and GEO tools, and outsourced writing are out of scope.
- **Hosting and email.** Cloud Run (`min_instance_count = 0`), Firestore, Cloud Scheduler, the Cloudflare Worker, and Resend run inside free-tier quotas at Stage A–C volumes.
- **Founder time and professional fees,** including any legal review of referral disclosures (Section 5).

### 4.4 Annual results by stage (base case)

| Line (S\$ / year) | Stage A | Stage B | Stage C |
| --- | ---: | ---: | ---: |
| Renewal switches, My Car members | 320 | 1,600 | 6,400 |
| Renewal switches, non-member comparisons | 720 | 3,600 | 14,400 |
| Vehicle-sale referrals | 192 | 960 | 3,840 |
| AdSense | 52 | 262 | 1,046 |
| **Revenue** | **1,284** | **6,422** | **25,686** |
| Domain | (50) | (50) | (50) |
| **Net** | **1,234** | **6,372** | **25,636** |

### 4.5 Scenario summary

| Scenario | Revenue per visit | Stage A net / yr | Stage B net / yr | Stage C net / yr | Monthly visits for S\$1,000/month revenue |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conservative | S\$0.025 | 248 | 1,441 | 5,914 | ~40,200 |
| Base | S\$0.107 | 1,234 | 6,372 | 25,636 | ~9,300 |
| Optimistic | S\$0.320 | 3,785 | 19,125 | 76,649 | ~3,100 |

For comparison, AdSense alone at the `2.18` reference RPM earns S\$0.0044 per visit and needs ~229,000 monthly visits for S\$1,000/month. The base referral model earns ~25× more per visit and needs ~9,300 visits for the same revenue.

### 4.6 Sensitivity and break-even

- **The domain is covered by about 470 visits a year** in the base case (S\$50 ÷ S\$0.107), so every scenario is profitable from Stage A; the open question is how much revenue organic reach delivers, not whether costs are recovered.
- **Non-member comparisons drive ~56% of base revenue.** Halving the comparison rate (2% → 1% of visits) cuts base Stage C revenue from S\$25,686 to S\$18,486.
- **Revenue scales linearly with commission and credit factor.** A move from S\$100 to S\$60 per policy cuts all referral lines by 40%.
- **Per-member value** clears the S\$1-per-user-per-year threshold in the base (S\$3.20) and optimistic (S\$10.80) cases, but not in the conservative case (S\$0.63). The member switch rate is the assumption to measure first.
- **Paid acquisition stays unprofitable.** Singapore car-insurance keywords bid at roughly S\$2–14 per click ([MarketingAgency.sg](https://marketingagency.sg/insurance-google-ads-cpc-singapore/)), while even the optimistic model earns S\$0.32 per visit. A S\$500 commissioned article would need ~4,700 base-case visits to repay itself.

## 5. Regulatory and execution risks

- **Introducer boundaries.** The Financial Advisers Act framework lets introducers refer clients and share factual product information, but not give advice, and requires remuneration disclosure ([MAS FAQ](https://www.mas.gov.sg/-/media/mas/regulations-and-financial-stability/regulations-guidance-and-licensing/financial-advisers/faq/faqs-on-financial-advisers-act-financial-advisers-regulations-notices-and-guidelines-281124.pdf), [Caproasia](https://www.caproasia.com/2023/10/05/singapore-mas-chairman-lawrence-wong-on-disclosure-of-introducer-fees-commissions-to-clients-introducers-required-to-disclose-fee-to-clients-to-further-disclose-actual-fee-when-asked-by-clients/)). MAS digital advertising guidelines are reported to cover general insurance ([guide](https://singaporedigitalmarketing.sg/blog/insurance-advertising-singapore/)). No source confirms the position of an unlicensed calculator site taking motor referral fees, so a legal review precedes the first live link (its fee is outside the cost basis in Section 4.3). Calculators must output figures, never "buy insurer X".
- **New-customer-only payouts.** Revenue depends on owners switching insurers. Owners who renew in place, or renew inside an insurer app, generate nothing.
- **Attribution gaps.** Cookie windows (30 days at DirectAsia) are shorter than the 45-day reminder lead time, so tracked links must be issued from the comparison result, not from the reminder email alone.
- **Search competition.** SingSaver and MoneySmart dominate head terms such as `car insurance singapore`; ClaimWise targets decision queries they do not answer in depth.
- **Closest competitor.** [Motorist](https://www.motorist.sg/) already combines reminders, insurance quotes, COE renewal, and car sales, with third-party revenue estimates near US\$4.2 million ([Gaps](https://gaps.com/automotive/), unverified). This validates the category but requires ClaimWise to differentiate on neutral decision math.

## 6. Validation milestones and kill criteria

| Milestone | Measure | Proceed if | Stop or rethink if |
| --- | --- | --- | --- |
| Partner terms | Approved programs with published motor rates | ≥3 insurers approved, base commission ≥ S\$80 | Fewer than 2 programs accept the site |
| Zero-commission funnel test | Reminder open → comparison → outbound click, using untracked insurer links for one renewal cycle | Member open × compare × click ≥ 10% (base: 10%) | Below 4% (conservative: 5%) |
| Legal review | Written opinion on introducer disclosure and placement | Disclosure-only regime confirmed | Licence required for referral fees |
| First paid cycle | Confirmed new-customer policies per 100 members | ≥ 2.5 (base: 4) | Below 1 after 12 months |
| Organic reach | Search Console monthly Singapore visits | 5,000 within 12 months (Stage B) | Below 1,000 after 12 months |

## 7. Organic acquisition: SEO and AI search

Google's ordinary results and AI-assistant citations cannot be bought; they reward pages that answer the query, come from a credible source, are linked from other sites, and are easy to crawl and quote. ClaimWise competes on those signals with work built into the product rather than paid services:

| Lever | What ships | Signal it targets |
| --- | --- | --- |
| Primary-source pages | `/rules/{insurer}/{topic}` and `/rules/compare/{topic}`: verbatim policy wording with PDF page numbers | Relevance and credibility for insurer-specific renewal queries that comparison sites do not answer in depth |
| Programmatic coverage | Each newly verified insurer wording adds an insurer page and six clause pages, and extends six comparison pages | Long-tail reach at near-zero marginal cost |
| Structured data | schema.org JSON-LD on every page (WebApplication, Article with document citations, BreadcrumbList) | Machine-readable page purpose and sources |
| AI-assistant access | `/llms.txt`, `/llms-full.txt`, prefilled calculator links, and the MCP server at `/mcp` | Assistants can cite the wording and hand users a ready-made calculation |
| Built-in sharing | Settlement agreement seen by both drivers; calculator share links | Referral traffic and natural links without promotion |
| Retention | My Car reminders before each priced decision | Repeat visits that need no new acquisition |

The main handicap is a new domain with few inbound links, so stable rankings typically take 6–12 months. Moving to a dedicated domain early (the only cost in the model) avoids losing accumulated authority in a later migration.

### Query map

Focused worked examples answer specific searches and lead into the matching tool:

| Keyword seeds (research seeds, unverified volume) | Route & offer |
| --- | --- |
| `should I claim car insurance singapore`, `claim or self pay car repair singapore` | `/calculator` — Claim vs. self-pay break-even and renewal schedule |
| `PHV accident downtime singapore` | `/calculator` (PHV) — Downtime loss and commercial loading |
| `NCD loss after accident singapore`, `NCD protector singapore` | `/tools/ncd-protector` — 5-year NCD loss and rider break-even |
| `car insurance excess singapore` | `/tools/quote-compare` — Expected cost across premium, excess, and NCD loss |
| `car loan early settlement rule of 78 singapore` | `/tools/loan-prepayment` — Rule of 78 rebate and break-even return |
| `COE renewal 5 or 10 years calculator singapore` | `/tools/coe-renewal` — Yearly cost with PARF opportunity cost |

The settlement agreement (`/settlement`) is the only route seen by two drivers per use, which gives it built-in distribution without promotion.

**First milestone:** 1,000 relevant Singapore monthly visits via [Search Console](https://support.google.com/webmasters/answer/7576553?hl=en) (free) to validate distribution, comparison rate, and Page RPM.

## 8. Google AdSense reference

AdSense remains the revenue floor. Display units sit below guide text and completed results, away from calculator inputs and emergency instructions, while `src/` stays independent of ads. ([Eligibility](https://support.google.com/adsense/answer/9724?hl=en) · [Placement rules](https://support.google.com/adsense/answer/2660562?hl=en) · [Revenue share: 80% / ~68%](https://support.google.com/adsense/answer/180195?hl=en) · [S\$150 payout threshold](https://support.google.com/adsense/answer/1709871?hl=en))

| Monthly visits | Monthly page views | Autos reference (`2.18`) | Finance reference (`5.29`) |
| ---: | ---: | ---: | ---: |
| 1,000 | 2,000 | \$4.36 / mo | \$10.58 / mo |
| 10,000 | 20,000 | \$43.60 / mo | \$105.80 / mo |
| 25,000 | 50,000 | \$109.00 / mo | \$264.50 / mo |
| 50,000 | 100,000 | \$218.00 / mo | \$529.00 / mo |

Reaching \$1,000/month from AdSense alone requires **94,518–229,358 visits/month**. Offline PWA sessions generate no impressions. Replace regional multipliers with actual SGD [Page RPM](https://support.google.com/adsense/answer/190515?hl=en) after launch.

## 9. Why paid search is excluded

Paid search is not used. Each click must cost less than the revenue a visit earns, and Singapore car-insurance keywords bid at roughly S\$2–14 per click ([MarketingAgency.sg](https://marketingagency.sg/insurance-google-ads-cpc-singapore/)):

| Scenario | Revenue per visit | Highest affordable cost per click |
| --- | ---: | ---: |
| Conservative | S\$0.025 | S\$0.025 |
| Base | S\$0.107 | S\$0.107 |
| Optimistic | S\$0.320 | S\$0.320 |

Even the optimistic yield covers a click of only about S\$0.32, far below observed bids, so bought traffic loses money in every scenario.

## 10. Competitor comparison

| Dimension | ClaimWise SG | [interest.sg](https://interest.sg/car-cost/motor-insurance-ncd-calculator/) | [MoneyBees](https://themoneybees.co/calculators/car-insurance-ncd) | [Motorist](https://www.motorist.sg/) |
| --- | --- | --- | --- | --- |
| Scope | 5 car calculators + settlement, offline emergency kit, My Car reminders | 9 car tools within 34 finance calculators | NCD calculator within 220+ tools; adviser lead handoff | Reminders, insurance quotes, COE renewal, used-car sales |
| NCD & excess | Discounted cash flows (`src/ncd/premium-path.mjs`), base/workshop/young-driver excess | Custom annual base premiums, explicit excess & cap | 5-year extra premium; no excess field observed | Quote handoff; no published decision model observed |
| PHV & clauses | Daily downtime, commercial loading, embedded policy PDFs | Not observed | Vehicle classes; no downtime input observed | Not observed |
| Revenue | Planned referral commissions + AdSense | Display ads | Adviser leads | Service fees, commissions, car-sale fees |

**Shared benchmark check:** S\$2,000 gross premium, 50% NCD, S\$1,500 repair, S\$600 excess, 0% growth/discount. Three-year NCD loss is $\text{S\$600}+\text{S\$400}+\text{S\$200}=\text{S\$1,200}$; adding S\$600 excess makes claiming **S\$1,800 vs. S\$1,500 self-pay** (self-pay saves S\$300).
