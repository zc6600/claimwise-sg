import { calculateDecision, isNcdProtectorEligible } from "../decision-engine.mjs";
import { roundMoney, toBoundedNumber } from "./shared.mjs";

export const NCD_PROTECTOR_DEFAULTS = {
  insurer: "other",
  currentPremium: 1200,
  currentNcd: 50,
  protectorCost: 80,
  claimProbabilityPct: 5,
  baseGrowthRate: 5,
  discountRate: 3,
};

// A protected claim is compared over five renewals so the full NCD recovery is captured.
const COMPARISON_HORIZON_YEARS = 5;
const NEUTRAL_BAND_PCT_POINTS = 0.25;

export function normalizeNcdProtectorInputs(raw = {}) {
  return {
    insurer: typeof raw.insurer === "string" ? raw.insurer : NCD_PROTECTOR_DEFAULTS.insurer,
    currentPremium: toBoundedNumber(raw.currentPremium, { min: 0, max: 100000 }),
    currentNcd: toBoundedNumber(raw.currentNcd, { min: 0, max: 50 }),
    protectorCost: toBoundedNumber(raw.protectorCost, { min: 0, max: 10000 }),
    claimProbabilityPct: toBoundedNumber(raw.claimProbabilityPct, { min: 0, max: 100 }),
    baseGrowthRate: toBoundedNumber(raw.baseGrowthRate, {
      min: -20,
      max: 50,
      fallback: NCD_PROTECTOR_DEFAULTS.baseGrowthRate,
    }),
    discountRate: toBoundedNumber(raw.discountRate, {
      min: 0,
      max: 20,
      fallback: NCD_PROTECTOR_DEFAULTS.discountRate,
    }),
  };
}

function claimPremiumsPresentValue(inputs, ncdProtector) {
  const decision = calculateDecision({
    insurer: inputs.insurer,
    currentPremium: inputs.currentPremium,
    currentNcd: inputs.currentNcd,
    baseGrowthRate: inputs.baseGrowthRate,
    discountRate: inputs.discountRate,
    horizonYears: COMPARISON_HORIZON_YEARS,
    ncdProtector,
    liability: "at_fault",
    repairCost: 0,
    excess: 0,
  });
  return decision.baseScenario.claimFutureDiscounted;
}

/**
 * Prices the NCD Protector rider as insurance on the renewal-premium loss of one
 * at-fault claim. The rider is worthwhile when the chance of making such a claim this
 * policy year exceeds rider cost divided by the premium loss it avoids.
 */
export function evaluateNcdProtector(rawInputs) {
  const inputs = normalizeNcdProtectorInputs(rawInputs);

  if (!isNcdProtectorEligible(inputs)) {
    return { inputs, eligible: false, recommendation: "ineligible" };
  }

  const premiumLossAvoided = roundMoney(
    claimPremiumsPresentValue(inputs, false) - claimPremiumsPresentValue(inputs, true)
  );

  if (premiumLossAvoided <= 0) {
    return {
      inputs,
      eligible: true,
      premiumLossAvoided: 0,
      breakEvenProbabilityPct: null,
      claimEveryYears: null,
      expectedBenefit: 0,
      netExpectedValue: roundMoney(-inputs.protectorCost),
      recommendation: "skip",
    };
  }

  const breakEvenProbabilityPct = roundMoney((inputs.protectorCost / premiumLossAvoided) * 100);
  const expectedBenefit = roundMoney((inputs.claimProbabilityPct / 100) * premiumLossAvoided);
  const gap = inputs.claimProbabilityPct - breakEvenProbabilityPct;

  let recommendation = "neutral";
  if (gap > NEUTRAL_BAND_PCT_POINTS) recommendation = "buy";
  if (gap < -NEUTRAL_BAND_PCT_POINTS) recommendation = "skip";

  return {
    inputs,
    eligible: true,
    premiumLossAvoided,
    breakEvenProbabilityPct,
    claimEveryYears:
      breakEvenProbabilityPct > 0 ? roundMoney(100 / breakEvenProbabilityPct) : null,
    expectedBenefit,
    netExpectedValue: roundMoney(expectedBenefit - inputs.protectorCost),
    recommendation,
  };
}
