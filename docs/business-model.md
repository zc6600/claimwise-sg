# Business Model

Research checked: 10 November 2026. Every revenue figure is a forecast built from published third-party prices and stated assumptions; production runs with no live referral links or advertisements yet.

## Summary

Car owners face a few expensive decisions → they search for answers → ClaimWise prices each decision neutrally on their own figures → some owners act by switching insurer → each switch pays a referral fee → with the domain as the only cost, profit grows with traffic.

| Question | Answer | Key figure |
| --- | --- | --- |
| Who are the users? | Singapore car owners at an expensive decision, above all the yearly insurance renewal | ~996,000 vehicles, each renewing yearly |
| How do they arrive? | Google search and AI assistants, then My Car reminders bring them back | 34 insurer rule pages quoting policy wording |
| How does it earn? | A referral fee when an owner switches insurer after comparing quotes | ~S\$100 per switch; S\$3.20 per member per year |
| What does it make? | Net profit that scales with monthly visits | S\$1.2k / S\$6.4k / S\$25.6k a year at 1k / 5k / 20k visits |
| What comes next? | Prove the switch rate | 4% of members switching each year |

## 1. Who the users are

Owners meet four decisions that each cost hundreds to thousands of dollars:

| Moment | Frequency | Question | Tool |
| --- | --- | --- | --- |
| Accident | Occasional, urgent | Claim, or pay the workshop directly? | `/calculator` |
| **Renewal** | **Every car, every year** | Switch insurer? Buy the NCD Protector? | `/tools/quote-compare`, `/tools/ncd-protector` |
| Car loan | Once per loan | Settle early? | `/tools/loan-prepayment` |
| COE expiry | Once per decade | Renew for 5 or 10 years, or replace? | `/tools/coe-renewal` |

Renewal is the moment the business is built around, because it recurs for the whole fleet every year.

**Worked example.** With a S\$2,000 gross premium, 50% NCD, S\$600 excess and a S\$1,500 repair, claiming costs the S\$600 excess plus S\$1,200 of lost NCD over three renewals (S\$600 + S\$400 + S\$200), a total of S\$1,800. Paying the workshop directly saves S\$300.

| Market measure | Figure | Source |
| --- | --- | --- |
| Motor vehicle population | ~996,000 (end-2023) | [Statista, citing LTA](https://www.statista.com/statistics/956271/singapore-total-motor-vehicle-population) |
| New vehicle registrations | 62,671 in 2025 (+21% YoY) | [Just Auto](https://www.just-auto.com/newsletters/singapore-vehicle-sales-surge-21-in-2025) |
| Motor gross written premium | S\$1.28 billion in 2025 (+5.2% YoY), the largest domestic general insurance line | [GIA 2025 results](https://gia.org.sg/images/media-center/company-news/Press-Release-GIA-Annual-Sector-Results-Announcement-2025.pdf) |
| Motor accidents recorded by GIA | Stable in 2025 while motor claims rose 11%; latest published count 161,361 (2016) | [GIA 2025 results](https://gia.org.sg/images/media-center/company-news/Press-Release-GIA-Annual-Sector-Results-Announcement-2025.pdf), [Insurance Business](https://insurancebusinessmag.com/asia/news/breaking-news/despite-more-car-accidents-in-singapore-insurance-claims-are-down-62885.aspx) |
| Car COE renewals | 2,834 in Q1 2025; prior annual record 37,114 | [Straits Times](https://www.magzter.com/en/stories/newspaper/The-Straits-Times/CAR-COE-RENEWALS-IN-Q1-HIGHEST-FOR-SAME-QUARTER-SINCE-2020), [Torque](https://torque.com.sg/?p=67813) |

## 2. How they arrive

Owners search before they decide. Google's ordinary results and AI-assistant citations reward pages that answer the query, come from a credible source, are linked from other sites, and are easy to crawl and quote. ClaimWise earns those signals through the product itself:

| Path | What ships | Why it works |
| --- | --- | --- |
| Google search | `/rules/{insurer}/{topic}` and `/rules/compare/{topic}`: verbatim policy wording with PDF page numbers; JSON-LD on every page | Primary-source answers to insurer-specific renewal questions |
| Coverage growth | Each newly verified insurer wording adds an insurer page and six clause pages, and extends six comparison pages | Long-tail reach at near-zero marginal cost |
| AI assistants | `/llms.txt`, `/llms-full.txt`, prefilled calculator links, and the MCP server at `/mcp` | Assistants cite the wording and hand users a ready-made calculation |
| Sharing | Settlement agreements seen by both drivers; calculator share links | Referral visits and natural links |
| Return visits | **My Car** (`/my-car`) emails double opt-in reminders 45 days before renewal, 30 days before loan review, and 365 and 90 days before COE expiry | Owners come back at each priced decision |

A dedicated domain, adopted early, keeps accumulated search authority in one place; stable rankings for a new domain typically take 6–12 months.

| Query seeds (unverified volume) | Route |
| --- | --- |
| `should I claim car insurance singapore`, `claim or self pay car repair singapore` | `/calculator`: claim versus self-pay break-even |
| `PHV accident downtime singapore` | `/calculator` (PHV): downtime loss and commercial loading |
| `NCD loss after accident singapore`, `NCD protector singapore` | `/tools/ncd-protector`, `/rules/compare/ncd-protector` |
| `car insurance excess singapore`, `{insurer} excess young driver` | `/tools/quote-compare`, `/rules/{insurer}/young-driver-excess` |
| `car loan early settlement rule of 78 singapore` | `/tools/loan-prepayment` |
| `COE renewal 5 or 10 years calculator singapore` | `/tools/coe-renewal` |

## 3. How it earns

Revenue comes from the action that follows a priced decision.

| Stream | Trigger | Payout basis | Role |
| --- | --- | --- | --- |
| Renewal switch referral | Owner compares quotes in `/tools/quote-compare` and buys from a new insurer | Commission on new-customer motor policies | Primary |
| Vehicle-sale referral | Owner chooses to replace rather than renew the COE in `/tools/coe-renewal` | Fee per inspection appointment and per completed sale | Secondary |
| Display advertising | Guide and result page views | AdSense Page RPM | Floor |
| Car-loan referral | Owner refinances after `/tools/loan-prepayment` | Lender-paid commission | Added once a published rate is available |

### Neutrality

- `src/` calculation modules never read partner, commission, or placement data; results are identical with or without referral links.
- Referral links render only after a completed result, never beside inputs or emergency instructions.
- At least three insurers are listed side by side, ordered by the owner's computed expected cost.
- Every referral block discloses that ClaimWise may receive a referral fee, and states the amount on request.
- When the calculation favours staying with the current insurer or declining a rider, the result says so with no switch prompt.
- Workshop and accident referrals are not offered, so the claim-versus-self-pay result has no paying party behind it.

### Payout evidence

| Partner | Published terms | Source |
| --- | --- | --- |
| DirectAsia (Impact, MCANISM) | 8% of new-customer motor premium, 30-day cookie (an older post cites 10%) | [FlexOffers](https://www.flexoffers.com/affiliate-programs/direct-asia-insurance-affiliate-program/), [affi.io](https://affi.io/m/directasia-singapore), [Lodestar](https://lodestar-marketing.com/blog/direct-asia-signup/) |
| Etiqa via ShopBack | S\$64.50 consumer cashback on car insurance | [ShopBack Etiqa](https://www.shopback.sg/etiqa) |
| DirectAsia via ShopBack | Up to S\$108 consumer cashback | [ShopBack comparison](https://www.shopback.sg/blog/finance/sg-car-insurance-income-vs-directasia-vs-fwd-vs-etiqa-2026) |
| Quotz | S\$20 per inspection appointment, S\$100 per completed sale (consumer scheme; publisher terms by agreement) | [Quotz referral](https://www.quotz.com.sg/referral) |
| Lendela | Lender-paid commission on approved loans; rate on application | [FlexOffers](https://www.flexoffers.com/affiliate-programs/lendela-affiliate-program/) |

An 8–10% rate on a typical S\$1,000–1,500 private-car premium yields S\$80–150, and consumer cashback of S\$64.50–108 sets a floor on what insurers pay channels. The model uses **S\$60 / S\$100 / S\$150** per switched policy. Payouts apply to new customers.

### Unit yields

$$Y_{\text{member}} = p_{\text{open}} \times p_{\text{compare}} \times p_{\text{click}} \times p_{\text{buy}} \times C \times k$$

$$Y_{\text{compare}} = p_{\text{click}} \times p_{\text{buy}} \times C \times k \qquad Y_{\text{COE}} = p_{\text{appointment}} \times \text{S\$20} + p_{\text{sale}} \times \text{S\$100}$$

`C` is the commission per switched policy and `k` the share credited after cookie loss, cancellations, and the 90-day confirmation.

| Parameter | Conservative | Base | Optimistic |
| --- | ---: | ---: | ---: |
| Reminder opened (`p_open`) | 40% | 50% | 60% |
| Opened reminder leads to a comparison (`p_compare`) | 25% | 40% | 50% |
| Comparison leads to an outbound click (`p_click`), members | 50% | 50% | 60% |
| Outbound click buys a new-customer policy (`p_buy`), members | 30% | 40% | 45% |
| **Member switch rate** | **1.5%** | **4.0%** | **8.1%** (modelled as 8%) |
| Non-member outbound click rate | 15% | 25% | 35% |
| Non-member purchase rate per click | 10% | 15% | 20% |
| Commission per switched policy (`C`) | S\$60 | S\$100 | S\$150 |
| Credit factor (`k`) | 70% | 80% | 90% |
| COE decision → inspection appointment | 1% | 3% | 5% |
| COE decision → completed sale | 0.3% | 1% | 2% |
| AdSense Page RPM (S\$ per 1,000 page views) | 1.00 | 2.18 | 5.29 |
| **`Y_member` per year** | **S\$0.63** | **S\$3.20** | **S\$10.80** |
| **`Y_compare` per session** | **S\$0.63** | **S\$3.00** | **S\$9.45** |
| **`Y_COE` per decision** | **S\$0.50** | **S\$1.60** | **S\$3.00** |

The base and optimistic RPMs are Google's Asia-Pacific `Autos & Vehicles` (`2.18`) and `Finance` (`5.29`) reference multipliers from the [AdSense calculator data](https://adsense.google.com/start/calculator-data.json), treated as SGD.

## 4. What it makes

### Cost

| Item | Cost / year | Basis |
| --- | ---: | --- |
| Dedicated domain | S\$50 | A `.com` at cost is about US\$11/year and `.com.sg` renews at S\$45–80/year before GST ([Cloudflare `.com`](https://domainoffer.net/tld/com/cloudflare), [`.com.sg` comparison](https://www.qoxy.com/compare-pricing/)) |

Hosting and email (Cloud Run with `min_instance_count = 0`, Firestore, Cloud Scheduler, the Cloudflare Worker, Resend) run within free-tier quotas at these volumes. Founder time and professional fees are outside the model.

### Traffic stages

| Stage | Monthly visits | My Car members (10% of monthly visits) | Non-member comparisons / month (2%) | COE decisions / month (1%) | Page views / month (2 per visit) |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 1,000 | 100 | 20 | 10 | 2,000 |
| B | 5,000 | 500 | 100 | 50 | 10,000 |
| C | 20,000 | 2,000 | 400 | 200 | 40,000 |

Stage C implies about 260 switched policies a year in the base case before attribution loss, roughly 0.03% of the national vehicle population.

### Annual results (base case)

| Line (S\$ / year) | Stage A | Stage B | Stage C |
| --- | ---: | ---: | ---: |
| Renewal switches, My Car members | 320 | 1,600 | 6,400 |
| Renewal switches, non-member comparisons | 720 | 3,600 | 14,400 |
| Vehicle-sale referrals | 192 | 960 | 3,840 |
| AdSense | 52 | 262 | 1,046 |
| **Revenue** | **1,284** | **6,422** | **25,686** |
| Domain | (50) | (50) | (50) |
| **Net** | **1,234** | **6,372** | **25,636** |

### Scenarios

| Scenario | Revenue per visit | Stage A net / yr | Stage B net / yr | Stage C net / yr | Monthly visits for S\$1,000/month revenue |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conservative | S\$0.025 | 248 | 1,441 | 5,914 | ~40,200 |
| Base | S\$0.107 | 1,234 | 6,372 | 25,636 | ~9,300 |
| Optimistic | S\$0.320 | 3,785 | 19,125 | 76,649 | ~3,100 |

### What moves the result

- **Switch rate.** Per-member value is S\$0.63, S\$3.20, or S\$10.80 a year across the three scenarios; it is the first assumption to measure.
- **Non-member comparisons** drive ~56% of base revenue. Halving the comparison rate (2% → 1% of visits) moves base Stage C revenue from S\$25,686 to S\$18,486.
- **Commission and credit factor** scale every referral line linearly; S\$60 instead of S\$100 per policy lowers referral revenue by 40%.
- **Cost** is covered by about 470 visits a year in the base case, so each stage is profitable and growth goes straight to margin.

## 5. What to prove next

| Milestone | Measure | Proceed if |
| --- | --- | --- |
| Partner terms | Approved programs with published motor rates | ≥3 insurers approved, base commission ≥ S\$80 |
| Funnel | Reminder open → comparison → outbound click, measured over one renewal cycle with untracked insurer links | Open × compare × click ≥ 10% |
| Disclosure | Written opinion on introducer disclosure and link placement | Disclosure-only regime confirmed |
| First paid cycle | Confirmed new-customer policies per 100 members | ≥ 2.5 (base: 4) |
| Organic reach | Search Console monthly Singapore visits | 5,000 within 12 months (Stage B) |

### Conditions the model depends on

- **Introducer rules.** The Financial Advisers Act framework lets introducers refer clients and share factual product information, not advice, with remuneration disclosed ([MAS FAQ](https://www.mas.gov.sg/-/media/mas/regulations-and-financial-stability/regulations-guidance-and-licensing/financial-advisers/faq/faqs-on-financial-advisers-act-financial-advisers-regulations-notices-and-guidelines-281124.pdf), [Caproasia](https://www.caproasia.com/2023/10/05/singapore-mas-chairman-lawrence-wong-on-disclosure-of-introducer-fees-commissions-to-clients-introducers-required-to-disclose-fee-to-clients-to-further-disclose-actual-fee-when-asked-by-clients/)), and MAS digital advertising guidelines cover general insurance ([guide](https://singaporedigitalmarketing.sg/blog/insurance-advertising-singapore/)). Calculators output figures, never "buy insurer X".
- **New-customer payouts.** Revenue comes from owners who switch; renewals in place or inside an insurer app are not paid.
- **Attribution window.** Cookies last 30 days at DirectAsia, shorter than the 45-day reminder lead time, so tracked links are issued from the comparison result.

## Landscape

| Dimension | ClaimWise SG | [interest.sg](https://interest.sg/car-cost/motor-insurance-ncd-calculator/) | [MoneyBees](https://themoneybees.co/calculators/car-insurance-ncd) | [Motorist](https://www.motorist.sg/) |
| --- | --- | --- | --- | --- |
| Scope | 6 car calculators, insurer rule pages, settlement agreement, offline emergency kit, My Car reminders, MCP server | 9 car tools within 34 finance calculators | NCD calculator within 220+ tools; adviser lead handoff | Reminders, insurance quotes, COE renewal, used-car sales |
| Decision model | Discounted NCD cash flows (`src/ncd/premium-path.mjs`); base, workshop, and young-driver excess; PHV downtime and loading | Custom base premiums, explicit excess and cap | 5-year extra premium | Quote handoff |
| Policy wording | Verbatim excerpts with PDF page citations for four insurers | Not observed | Not observed | Not observed |
| Revenue | Referral commissions, vehicle-sale referrals, AdSense | Display ads | Adviser leads | Service fees, commissions, car-sale fees (third-party estimate near US\$4.2 million revenue, [Gaps](https://gaps.com/automotive/)) |

Comparison sites such as SingSaver and MoneySmart rank for broad terms like `car insurance singapore`; ClaimWise answers the narrower decision and insurer-clause questions.
