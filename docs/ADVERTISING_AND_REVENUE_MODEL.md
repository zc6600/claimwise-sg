# Advertising & Partner Revenue Architecture

This document outlines the monetization design, actuarial neutrality guardrails, and unit economics for **ClaimWise SG**.

---

## 1. Market Context

Motorists using ClaimWise SG have just experienced a minor vehicle collision and hold a workshop repair quotation (typically `S$800 – S$3,500`). Because they must decide how to proceed within the 24-hour Motor Claims Framework (MCF) reporting window, contextual automotive service referrals align closely with user intent while keeping the core calculator free for consumers.

---

## 2. Actuarial Neutrality Guardrails

1. **Pure Decision Engine**: [`src/decision-engine.mjs`](../src/decision-engine.mjs) is a deterministic pure function of the user's policy parameters and repair cost.
2. **Downstream Read-Only Consumption**: Any partner or sponsored placement ([`components/SponsoredAdUnit.jsx`](../components/SponsoredAdUnit.jsx)) only reads the completed `decision.recommendation` (`self-pay` vs. `claim`) and never alters the break-even threshold $R^*(S)$ or renewal projections.
3. **Publisher Verification**: [`public/ads.txt`](../public/ads.txt) is served at the root path for IAB / AdSense publisher verification.

---

## 3. Contextual Partner Channels

| Channel | Trigger Scenario | User Value | Revenue Model |
| :--- | :--- | :--- | :--- |
| **Accredited Bodywork Workshops** | `self-pay` recommended | Out-of-pocket repair quote comparison without insurer surcharges | Referral commission (`~8%` of invoice) |
| **Authorised Reporting Centres** | `claim` recommended | 24-hour GIA accident reporting & courtesy car arrangement | Qualified lead fee (`S$45 / lead`) |
| **Renewal Comparison Brokers** | Post-calculation | Multi-insurer comparison before next policy renewal | Affiliate lead payout (`S$35 / lead`) |
| **Programmatic Display** | General traffic | Automotive & personal finance display unit | RPM display revenue |

---

## 4. Baseline Annual Projection (Singapore Private Car Fleet)

Assuming `1,250` monthly post-accident evaluations (`~3%` of minor collision incidents across Singapore's private car fleet):

| Stream | Estimated Annual Revenue (Conservative) | Estimated Annual Revenue (Growth) |
| :--- | :---: | :---: |
| **Workshop Booking Commissions** | S$25,920 | S$86,400 |
| **Reporting Centre Referrals** | S$21,600 | S$72,000 |
| **Renewal Comparison Leads** | S$26,244 | S$87,480 |
| **Programmatic Display** | S$1,296 | S$4,320 |
| **Total Gross Revenue** | **S$75,060 / yr** | **S$250,200 / yr** |
