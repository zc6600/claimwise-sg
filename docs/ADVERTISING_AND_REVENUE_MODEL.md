# 🇸🇬 ClaimWise SG · Advertising & Monetization Architecture Guide

This document specifies the technical implementation, ethical neutrality constraints, and financial unit economics for advertising and partner monetization in **ClaimWise SG**, corresponding directly to **Section 2.1 (Monetization Strategy)** of the CS5224 Preliminary Report.

---

## 1. Executive Summary & Market Thesis

ClaimWise SG serves Singapore private motorists immediately after a minor traffic collision or bumper scrap. This user segment exhibits:
1. **Ultra-High Commercial Intent**: Motorists have an immediate repair quote (typically S$800 – S$3,500) and must make an urgent decision within the 24-hour Motor Claims Framework (MCF) reporting window.
2. **High Customer Lifetime Value (LTV)**: Motor insurance in Singapore averages S$1,650/year, and bodywork repairs average S$1,850 per incident.
3. **Severe Information Asymmetry**: Motorists rarely know which repair workshops are authorized, where insurer reporting centers are located, or whether their renewal premium will surge.

Under this dynamic, **generic programmatic display ads (e.g. Google AdSense) yield modest revenue**, whereas **contextual high-intent affiliate and lead generation partnerships generate outsized revenue**.

---

## 2. Technical Implementation Architecture

### 2.1 Component Architecture (`SponsoredAdUnit.jsx`)
The ad container is implemented as [`components/SponsoredAdUnit.jsx`](../components/SponsoredAdUnit.jsx) and rendered on [`app/calculator/page.jsx`](../app/calculator/page.jsx) directly following the primary decision output:

```
[ Actuarial Decision Engine ]
               │
               ▼
[ Primary Recommendation Card ] ──▶ (Self-Pay vs. Insurance Claim)
               │
               ▼
[ SponsoredAdUnit Component ]
   ├── Tab 1: Contextual Automotive Partner (Dynamic CPA/CPL)
   │     ├── If Self-Pay: GIA Accredited Workshop ($100 off voucher + 3-yr paint warranty)
   │     └── If Claim:    Authorized Reporting Centre + 3-day courtesy replacement car
   │
   ├── Tab 2: Programmatic Container (Google AdSense 728x90 / responsive)
   │     └── Script: `adsbygoogle.js` with client `ca-pub-0000000000000000`
   │
   └── Inviolable Actuarial Neutrality Guarantee Banner (Section 2.1 Compliance)
```

### 2.2 Standard `ads.txt` Publisher Verification
As required by the Interactive Advertising Bureau (IAB Tech Lab) and Google AdSense, [`public/ads.txt`](../public/ads.txt) is deployed at the web root:
```
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

### 2.3 Regulatory & Ethical Neutrality Guardrail
Preliminary Report Section 2.1 strictly mandates:
> *"Clearly labelled advertisements may be shown for relevant automotive services, but advertising does not affect the financial result."*

**Architectural Guarantee**:
- The decision engine (`src/decision-engine.mjs`) is an **isolated pure function** taking only policy parameters and repair cost.
- Partner offers are **downstream read-only consumers** of `decision.recommendation` and `inputs.repairCost`.
- No partner bidder or sponsor can modify threshold $R^*(S)$ or recommendation output.

---

## 3. Financial Unit Economics & Revenue Projections

### 3.1 Singapore Market Sizing
- **Total Singapore Private Cars**: 524,312 vehicles (LTA Annual Statistics 2025).
- **Annual Collision & Minor Damage Rate**: ~8% of fleet = **41,945 incidents/year**.
- **ClaimWise SG Target Market Penetration**:
  - *Conservative Baseline (Year 1)*: 3.0% of post-accident decisions = **1,250 decisions/month** (15,000/yr).
  - *Growth Target (Year 2)*: 10.0% market share = **4,166 decisions/month** (50,000/yr).

---

### 3.2 Channel-by-Channel Revenue Model

#### Channel A: GIA Workshop Booking Commission (Self-Pay Flow)
When ClaimWise recommends **Self-Pay** (approx. 60% of runs):
- **User Need**: Looking for reliable, fair-priced independent workshop without insurer surcharges.
- **Conversion Funnel**:
  - Monthly Self-Pay Runs: $1,250 \times 60\% = 750$
  - Voucher Claim / Click Rate: $15\% = 112$ motorists
  - Workshop Visit & Booking Rate: $20\% = 22.5$ cars repaired
  - Average Repair Ticket: S$1,200
  - Commercial Partner Commission: **8% of invoice** (~S$96 / car)
- **Monthly Revenue**: $22.5 \times \text{S}\$96 = \mathbf{S\$2,160 / \text{month}}$

#### Channel B: Insurer Reporting Centre & Courtesy Car Referral (Claim Flow)
When ClaimWise recommends **Claim** (approx. 40% of runs):
- **User Need**: Must file GIA report within 24 hours; desires courtesy replacement vehicle.
- **Conversion Funnel**:
  - Monthly Claim Runs: $1,250 \times 40\% = 500$
  - Reporting Booking Rate: $8\% = 40$ leads
  - Partner Fee per Qualified Reporting Visit: **S$45 / lead**
- **Monthly Revenue**: $40 \times \text{S}\$45 = \mathbf{S\$1,800 / \text{month}}$

#### Channel C: Next-Year Insurance Renewal Brokerage Leads
All users (100%) face future premium uncertainty:
- **Lead Type**: Qualified motor renewal comparison submission (Motorist enters renewal month).
- **Conversion Funnel**:
  - 1,250 users $\times 5\%$ form completion = $62.5$ leads/month
  - Partner Affiliate Payout (SingSaver / MoneySmart API / Direct Broker): **S$35 / lead**
- **Monthly Revenue**: $62.5 \times \text{S}\$35 = \mathbf{S\$2,187 / \text{month}}$

#### Channel D: Google AdSense Programmatic Display
- **Audience**: High-income Singapore finance/automotive demographic.
- **Traffic**: 1,250 users $\times 3.2$ pageviews = 4,000 PV/month.
- **Singapore Niche Finance RPM**: US$20 (~S$27) per 1,000 impressions.
- **Monthly Revenue**: $4 \times \text{S}\$27 = \mathbf{S\$108 / \text{month}}$

---

### 3.3 Consolidated Annual P&L and ROI vs. Cloud Hosting Costs

| Revenue Stream | Conservative (3% Share) | Growth (10% Share) |
| :--- | :---: | :---: |
| **GIA Bodywork Commissions** | S$25,920 / yr | S$86,400 / yr |
| **Accident Reporting Referrals** | S$21,600 / yr | S$72,000 / yr |
| **Motor Insurance Renewal Leads** | S$26,244 / yr | S$87,480 / yr |
| **Programmatic AdSense Display** | S$1,296 / yr | S$4,320 / yr |
| **Gross Annual Revenue** | **S$75,060 / yr** | **S$250,200 / yr** |
| *Cloud Infrastructure Cost (Table 1 Single-AZ)* | *(S$2,488 / yr)* | *(S$3,850 / yr)* |
| **Net Operating Profit** | **S$72,572 / yr** | **S$246,350 / yr** |
| **Operating Margin** | **96.7%** | **98.5%** |

---

## 4. How to Activate Google AdSense Live

1. **Sign Up**: Register on [Google AdSense](https://adsense.google.com) with the production domain (e.g. `claimwise.sg`).
2. **Update `public/ads.txt`**:
   Replace `pub-0000000000000000` in [`public/ads.txt`](../public/ads.txt) with your assigned Publisher ID.
3. **Configure Next.js Script**:
   In [`app/layout.jsx`](../app/layout.jsx), add the asynchronous AdSense loader:
   ```jsx
   <Script
     async
     src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_ID"
     crossOrigin="anonymous"
     strategy="afterInteractive"
   />
   ```
4. **Deploy**: Push changes to production hosting (Vercel / Cloud Run). Google will crawl `https://claimwise.sg/ads.txt` and review the site within 24–48 hours.

