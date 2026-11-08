import test from "node:test";
import assert from "node:assert/strict";
import { evaluateNcdProtector } from "../src/car-decisions/ncd-protector.mjs";
import { compareQuotes, ncdLossPresentValue } from "../src/car-decisions/quote-comparison.mjs";
import {
  PARF_COHORTS,
  compareCoeOptions,
  computeCoeRebate,
  computeParfRebate,
  parfRatePct,
  roadTaxSurchargePct,
} from "../src/car-decisions/coe-renewal.mjs";
import {
  evaluateLoanPrepayment,
  ruleOf78UnearnedInterest,
} from "../src/car-decisions/loan-prepayment.mjs";
import { equivalentAnnualCost } from "../src/numeric.mjs";

test("NCD Protector break-even equals rider cost divided by avoided premium loss", () => {
  const result = evaluateNcdProtector({
    currentPremium: 1000,
    currentNcd: 50,
    protectorCost: 100,
    claimProbabilityPct: 5,
    baseGrowthRate: 0,
    discountRate: 0,
  });
  // Base S$2,000; a 30-point drop gives NCD 20/30/40/50/50 against a flat 50%.
  assert.equal(result.premiumLossAvoided, 1200);
  assert.equal(result.breakEvenProbabilityPct, 8.33);
  assert.equal(result.claimEveryYears, 12);
  assert.equal(result.recommendation, "skip");
  assert.equal(result.netExpectedValue, -40);
});

test("NCD Protector recommends buying when claim risk exceeds break-even", () => {
  const result = evaluateNcdProtector({
    currentPremium: 1000,
    currentNcd: 50,
    protectorCost: 100,
    claimProbabilityPct: 12,
    baseGrowthRate: 0,
    discountRate: 0,
  });
  assert.equal(result.recommendation, "buy");
});

test("NCD Protector is neutral when claim risk sits on the break-even point", () => {
  const result = evaluateNcdProtector({
    currentPremium: 1000,
    currentNcd: 50,
    protectorCost: 100,
    claimProbabilityPct: 8.4,
    baseGrowthRate: 0,
    discountRate: 0,
  });
  assert.equal(result.recommendation, "neutral");
});

test("NCD Protector reports ineligibility below the insurer's minimum NCD", () => {
  const result = evaluateNcdProtector({ currentPremium: 1000, currentNcd: 40, protectorCost: 100 });
  assert.equal(result.eligible, false);
  assert.equal(result.recommendation, "ineligible");
});

test("NCD Protector handles a free rider and zero premium without dividing by zero", () => {
  const free = evaluateNcdProtector({
    currentPremium: 1000,
    currentNcd: 50,
    protectorCost: 0,
    claimProbabilityPct: 5,
  });
  assert.equal(free.breakEvenProbabilityPct, 0);
  assert.equal(free.claimEveryYears, null);
  assert.equal(free.recommendation, "buy");

  const zero = evaluateNcdProtector({ currentPremium: 0, currentNcd: 50, protectorCost: 50 });
  assert.equal(zero.ready, false);
  assert.equal(zero.recommendation, "incomplete");
});

test("quote comparison shows a cheaper premium can lose after excess is counted", () => {
  const result = compareQuotes({
    currentNcd: 0,
    incidentProbabilityPct: 20,
    typicalRepairCost: 3000,
    quotes: [
      { label: "Low premium", premium: 1000, excess: 2000 },
      { label: "Low excess", premium: 1100, excess: 500 },
    ],
  });
  assert.equal(result.bestLabel, "Low excess");
  assert.equal(result.lowestPremiumLabel, "Low premium");
  assert.equal(result.lowestPremiumIsBest, false);
  assert.equal(result.expectedSavingVsLowestPremium, 200);
  const lowExcess = result.quotes.find((quote) => quote.label === "Low excess");
  assert.equal(lowExcess.breakEvenProbabilityPct, 6.67);
});

test("quote comparison applies workshop surcharges only for non-authorised repairs", () => {
  const quotes = [
    { label: "A", premium: 1000, excess: 600, workshopSurcharge: 1000 },
    { label: "B", premium: 1050, excess: 600, workshopSurcharge: 0 },
  ];
  const authorised = compareQuotes({
    currentNcd: 0,
    incidentProbabilityPct: 10,
    typicalRepairCost: 3000,
    quotes,
  });
  assert.equal(authorised.bestLabel, "A");

  const independent = compareQuotes({
    currentNcd: 0,
    incidentProbabilityPct: 10,
    typicalRepairCost: 3000,
    usesNonAuthorisedWorkshop: true,
    quotes,
  });
  assert.equal(independent.bestLabel, "B");
});

test("quote comparison caps the cost of an accident at the repair bill", () => {
  const result = compareQuotes({
    currentNcd: 0,
    incidentProbabilityPct: 100,
    typicalRepairCost: 300,
    quotes: [
      { label: "A", premium: 1000, excess: 600 },
      { label: "B", premium: 1000, excess: 900 },
    ],
  });
  assert.ok(result.quotes.every((quote) => quote.costPerIncident === 300));
  assert.ok(result.quotes.every((quote) => quote.wouldClaim === false));
});

test("an equally priced quote with a lower accident cost wins at any claim chance", () => {
  const result = compareQuotes({
    currentNcd: 0,
    incidentProbabilityPct: 5,
    typicalRepairCost: 3000,
    quotes: [
      { label: "A", premium: 1000, excess: 1500 },
      { label: "B", premium: 1000, excess: 500 },
    ],
  });
  const b = result.quotes.find((quote) => quote.label === "B");
  assert.equal(result.lowestPremiumLabel, "A");
  assert.equal(b.breakEvenProbabilityPct, 0);
  assert.equal(result.bestLabel, "B");
});

test("quote comparison prices NCD loss with the same model as the NCD Protector tool", () => {
  const protector = evaluateNcdProtector({ currentPremium: 1000, currentNcd: 50, protectorCost: 100 });
  assert.equal(Math.round(ncdLossPresentValue(1000, 50) * 100) / 100, protector.premiumLossAvoided);
  assert.equal(ncdLossPresentValue(1000, 0), 0);
  assert.equal(ncdLossPresentValue(0, 50), 0);
});

test("quote comparison gives no credit for a low excess when claiming is not worth the NCD loss", () => {
  const result = compareQuotes({
    currentNcd: 50,
    incidentProbabilityPct: 20,
    typicalRepairCost: 1400,
    quotes: [
      { label: "High excess", premium: 1000, excess: 1000 },
      { label: "Low excess", premium: 1050, excess: 200 },
    ],
  });
  // Claiming would cost the excess plus about S$1,200 of NCD loss, above the S$1,400 bill.
  assert.ok(result.quotes.every((quote) => quote.wouldClaim === false));
  assert.ok(result.quotes.every((quote) => quote.costPerIncident === 1400));
  assert.equal(result.bestLabel, "High excess");
  assert.equal(result.lowestPremiumIsBest, true);
});

test("quote comparison claims once the repair bill exceeds excess plus NCD loss", () => {
  const result = compareQuotes({
    currentNcd: 50,
    incidentProbabilityPct: 10,
    typicalRepairCost: 5000,
    quotes: [
      { label: "A", premium: 1000, excess: 600 },
      { label: "B", premium: 1100, excess: 600 },
    ],
  });
  const a = result.quotes.find((quote) => quote.label === "A");
  assert.equal(a.wouldClaim, true);
  assert.equal(a.costPerIncident, Math.round((600 + ncdLossPresentValue(1000, 50)) * 100) / 100);
  assert.equal(result.bestLabel, "A");
});

test("quote comparison needs two priced quotes", () => {
  assert.equal(compareQuotes({ quotes: [{ premium: 1000 }, { premium: 0 }] }).ready, false);
  assert.equal(compareQuotes({}).ready, false);
});

test("PARF schedule matches each LTA registration cohort", () => {
  assert.equal(parfRatePct(5, PARF_COHORTS.BEFORE_FEB_2023), 75);
  assert.equal(parfRatePct(5.01, PARF_COHORTS.BEFORE_FEB_2023), 70);
  assert.equal(parfRatePct(10, PARF_COHORTS.BEFORE_FEB_2023), 50);
  assert.equal(parfRatePct(10.01, PARF_COHORTS.BEFORE_FEB_2023), 0);
  assert.equal(parfRatePct(5, PARF_COHORTS.FROM_FEB_2026), 30);
  assert.equal(parfRatePct(9.5, PARF_COHORTS.FROM_FEB_2026), 5);

  const arfPaid = 200000;
  const ageYears = 5.5;
  assert.equal(computeParfRebate({ arfPaid, ageYears, cohort: PARF_COHORTS.BEFORE_FEB_2023 }), 140000);
  assert.equal(computeParfRebate({ arfPaid, ageYears, cohort: PARF_COHORTS.FEB_2023_TO_FEB_2026 }), 60000);
  // The revised 25% rate gives S$50,000, which the S$30,000 cap then limits.
  assert.equal(computeParfRebate({ arfPaid, ageYears, cohort: PARF_COHORTS.FROM_FEB_2026 }), 30000);
});

test("replacement versus 5-year renewal matches the cash difference over an equal term", () => {
  const result = compareCoeOptions({
    pqp: 80000,
    arfPaid: 40000,
    carAgeYears: 10,
    scrapValue: 2000,
    annualRoadTax: 0,
    currentCarAnnualCost: 0,
    replacementPrice: 120000,
    replacementResaleValue: 0,
    replacementYears: 5,
    replacementAnnualCost: 0,
    discountRate: 0,
  });
  const [renew5, , replace] = result.options;
  const cashGap = replace.upfront - renew5.upfront;
  assert.equal(replace.presentValue - renew5.presentValue, cashGap);
});

test("COE rebate is pro-rated over the 120-month period", () => {
  assert.equal(computeCoeRebate({ quotaPremiumPaid: 60000, unusedMonths: 24 }), 12000);
  assert.equal(computeCoeRebate({ quotaPremiumPaid: 60000, unusedMonths: 0 }), 0);
});

test("road tax surcharge follows the published age bands", () => {
  assert.equal(roadTaxSurchargePct(9.9), 0);
  assert.equal(roadTaxSurchargePct(10), 10);
  assert.equal(roadTaxSurchargePct(11), 20);
  assert.equal(roadTaxSurchargePct(14), 50);
  assert.equal(roadTaxSurchargePct(19), 50);
});

test("COE comparison charges deregistration value to keeping the car", () => {
  const result = compareCoeOptions({
    pqp: 100001,
    parfCohort: PARF_COHORTS.BEFORE_FEB_2023,
    arfPaid: 20000,
    carAgeYears: 10,
    scrapValue: 1000,
    annualRoadTax: 1000,
    currentCarAnnualCost: 0,
    replacementPrice: 100000,
    replacementResaleValue: 50000,
    replacementYears: 5,
    replacementAnnualCost: 0,
    discountRate: 0,
  });
  const [renew5, renew10, replace] = result.options;

  assert.equal(result.parfRebate, 10000);
  assert.equal(result.deregistrationValue, 11000);
  assert.equal(renew5.upfront, 50001, "the 5-year renewal rounds 50% of PQP up to the dollar");
  // Surcharges of 10-50% add S$1,500 to five years of S$1,000 road tax.
  assert.equal(renew5.presentValue, 50001 + 11000 + 5000 + 1500);
  assert.equal(renew10.upfront, 100001);
  assert.equal(renew10.presentValue, 100001 + 11000 + 10000 + 1500 + 2500);
  assert.equal(replace.upfront, 89000);
  assert.equal(replace.presentValue, 50000);
  assert.equal(result.bestOptionId, "replace");
  assert.equal(result.annualSavingVsNextBest, 2500.1);
});

test("COE renewal cost is net of the car's value when the renewal ends", () => {
  const base = {
    pqp: 50000,
    arfPaid: 0,
    carAgeYears: 10,
    annualRoadTax: 0,
    currentCarAnnualCost: 0,
    replacementPrice: 100000,
    replacementResaleValue: 0,
    replacementAnnualCost: 0,
    discountRate: 0,
  };
  const without = compareCoeOptions(base).options[0];
  const withEndValue = compareCoeOptions({ ...base, endOfRenewalValue: 5000 }).options[0];
  assert.equal(without.presentValue - withEndValue.presentValue, 5000);
});

test("equivalent annual cost reduces to a simple average at a zero discount rate", () => {
  assert.equal(equivalentAnnualCost(1000, 0, 5), 200);
  assert.ok(equivalentAnnualCost(1000, 5, 5) > 200);
  assert.equal(equivalentAnnualCost(1000, 5, 0), 0);
});

test("Rule of 78 refunds less than a straight-line share of interest", () => {
  assert.equal(ruleOf78UnearnedInterest(7800, 12, 12), 7800);
  assert.equal(ruleOf78UnearnedInterest(7800, 12, 0), 0);
  assert.equal(ruleOf78UnearnedInterest(7800, 12, 6), 2100);
});

test("loan settlement charges the rebate fee and penalty", () => {
  const result = evaluateLoanPrepayment({
    originalPrincipal: 12000,
    flatRatePct: 5,
    tenureMonths: 12,
    monthsPaid: 6,
    rebateFeePct: 20,
    penaltyPctOfOriginal: 1,
    adminFee: 10,
    alternativeReturnPct: 0,
  });
  // Interest S$600; instalment S$1,050; six months left; unearned 21/78 of S$600.
  assert.equal(result.instalment, 1050);
  assert.equal(result.remainingInstalments, 6300);
  assert.equal(result.grossInterestRebate, 161.54);
  assert.equal(result.rebateFee, 32.31);
  assert.equal(result.penalty, 120);
  assert.equal(result.settlementAmount, 6300 - 161.54 + 32.31 + 120 + 10);
  assert.equal(result.recommendation, "continue");
  assert.equal(result.breakEvenReturnPct, null);
});

test("loan settlement is favoured when idle cash earns little and fees are low", () => {
  const result = evaluateLoanPrepayment({
    originalPrincipal: 80000,
    flatRatePct: 2.78,
    tenureMonths: 84,
    monthsPaid: 12,
    rebateFeePct: 0,
    alternativeReturnPct: 0,
  });
  assert.equal(result.recommendation, "settle");
  assert.ok(result.breakEvenReturnPct > 0);

  const highReturn = evaluateLoanPrepayment({
    originalPrincipal: 80000,
    flatRatePct: 2.78,
    tenureMonths: 84,
    monthsPaid: 12,
    rebateFeePct: 0,
    alternativeReturnPct: result.breakEvenReturnPct + 1,
  });
  assert.equal(highReturn.recommendation, "continue");
});

test("loan evaluation rejects finished or empty loans", () => {
  assert.equal(evaluateLoanPrepayment({ originalPrincipal: 0 }).ready, false);
  assert.equal(
    evaluateLoanPrepayment({ originalPrincipal: 1000, tenureMonths: 12, monthsPaid: 12 }).ready,
    false
  );
});
