import { INSURER_PROFILES, PHV_DEFAULTS } from "./decision-data.mjs";
import { buildAdvisories, generateClauseAudit } from "./claim-explanations.mjs";
import { clamp, roundMoney } from "./numeric.mjs";
import {
  buildPremiumPath,
  grossPremiumFromNet,
  insurerProfile,
  isNcdProtectorEligible,
  ncdAfterStepDown,
  sumPath,
} from "./ncd/premium-path.mjs";

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value) => value === true || value === 1 || value === "1" || value === "true";

export function normalizeInputs(raw = {}) {
  const insurer = INSURER_PROFILES[raw.insurer] ? raw.insurer : "other";
  const currentPremium = Math.max(0, parseNumber(raw.currentPremium, 0));
  const currentNcd = clamp(parseNumber(raw.currentNcd, 0), 0, 50);
  const excess = Math.max(0, parseNumber(raw.excess, 0));
  const repairCost = Math.max(0, parseNumber(raw.repairCost, 0));
  const horizonYears = [3, 5].includes(Number(raw.horizonYears)) ? Number(raw.horizonYears) : 3;
  const baseGrowthRate = clamp(parseNumber(raw.baseGrowthRate, 5), -20, 50);
  const discountRate = clamp(parseNumber(raw.discountRate, 3), 0, 20);
  const ncdProtector = parseBoolean(raw.ncdProtector);
  const liability = ["at_fault", "non_fault", "partial_fault"].includes(raw.liability)
    ? raw.liability
    : "at_fault";
  const thirdPartyClaim = parseBoolean(raw.thirdPartyClaim);
  const workshopType = ["authorized", "independent"].includes(raw.workshopType)
    ? raw.workshopType
    : "authorized";
  const youngDriverInvolved = parseBoolean(raw.youngDriverInvolved);
  const repairType = ["general", "windscreen"].includes(raw.repairType)
    ? raw.repairType
    : "general";
  const vehicleUsage = ["private", "phv"].includes(raw.vehicleUsage)
    ? raw.vehicleUsage
    : "private";
  const isPhv = vehicleUsage === "phv";
  const commercialClaimLoading = clamp(
    parseNumber(
      raw.commercialClaimLoading,
      isPhv ? PHV_DEFAULTS.defaultCommercialLoading : 0
    ),
    0,
    100
  );
  const dailyDowntimeCost = clamp(
    parseNumber(
      raw.dailyDowntimeCost,
      isPhv ? PHV_DEFAULTS.defaultDailyDowntimeCost : 0
    ),
    0,
    5000
  );
  const claimDowntimeDays = clamp(
    parseNumber(
      raw.claimDowntimeDays,
      isPhv ? PHV_DEFAULTS.defaultClaimDowntimeDays : 0
    ),
    0,
    60
  );
  const selfPayDowntimeDays = clamp(
    parseNumber(
      raw.selfPayDowntimeDays,
      isPhv ? PHV_DEFAULTS.defaultSelfPayDowntimeDays : 0
    ),
    0,
    60
  );

  return {
    insurer,
    currentPremium,
    currentNcd,
    excess,
    repairCost,
    horizonYears,
    baseGrowthRate,
    discountRate,
    ncdProtector,
    liability,
    thirdPartyClaim,
    workshopType,
    youngDriverInvolved,
    repairType,
    vehicleUsage,
    commercialClaimLoading,
    dailyDowntimeCost,
    claimDowntimeDays,
    selfPayDowntimeDays,
  };
}

export function ncdAfterSelfPay(inputs) {
  // GIA MCF Section 1.1 / Ref [3]: If a third party claims against the user and the user is
  // at fault or partial fault, the insurer must settle the third party claim.
  // This triggers an NCD reduction regardless of whether the user self-pays their own vehicle repair!
  if (inputs.thirdPartyClaim && inputs.liability !== "non_fault") {
    if (inputs.ncdProtector && isNcdProtectorEligible(inputs)) return inputs.currentNcd;
    return ncdAfterStepDown(inputs.currentNcd, inputs.insurer);
  }
  return inputs.currentNcd;
}

export function ncdAfterClaim(inputs) {
  // GIA MCF: If 100% non-fault (clear third-party liability), NCD is protected.
  if (inputs.liability === "non_fault") return inputs.currentNcd;
  // A third-party liability claim can affect NCD even when the insured's own damage
  // is a windscreen claim. A valid protector still preserves the tier.
  if (inputs.ncdProtector && isNcdProtectorEligible(inputs)) return inputs.currentNcd;
  if (inputs.thirdPartyClaim) return ncdAfterStepDown(inputs.currentNcd, inputs.insurer);
  // GIA Windscreen Clause: Windscreen repair/replacement claims do not dock NCD
  if (inputs.repairType === "windscreen") return inputs.currentNcd;
  return ncdAfterStepDown(inputs.currentNcd, inputs.insurer);
}

export function computeEffectiveExcess(inputs) {
  const profile = insurerProfile(inputs.insurer);

  if (inputs.repairType === "windscreen") {
    const windscreenExcess = profile.windscreenExcess || 100;
    return {
      baseExcess: inputs.excess,
      windscreenExcessApplied: true,
      unauthorizedWorkshopSurcharge: 0,
      youngDriverSurcharge: 0,
      totalEffectiveExcess: windscreenExcess,
    };
  }

  const isUnauthorized = inputs.workshopType === "independent";
  const isYoungDriver = Boolean(inputs.youngDriverInvolved);

  const unauthorizedSurcharge = isUnauthorized ? (profile.unauthorizedWorkshopExcess || 1000) : 0;
  const youngDriverSurcharge = isYoungDriver ? (profile.youngDriverExcess || 2500) : 0;
  const total = inputs.excess + unauthorizedSurcharge + youngDriverSurcharge;

  return {
    baseExcess: inputs.excess,
    windscreenExcessApplied: false,
    unauthorizedWorkshopSurcharge: unauthorizedSurcharge,
    youngDriverSurcharge: youngDriverSurcharge,
    totalEffectiveExcess: total,
  };
}

function buildPath(inputs, startingNcd, growthRate, discountRate, commercialLoading = 0) {
  return buildPremiumPath({
    basePremium: grossPremiumFromNet(inputs.currentPremium, inputs.currentNcd),
    startingNcd,
    horizonYears: inputs.horizonYears,
    growthRate,
    discountRate,
    commercialLoading,
  });
}

function buildScenario(inputs, growthRate, effectiveExcess) {
  const selfPayStartingNcd = ncdAfterSelfPay(inputs);
  const claimStartingNcd = ncdAfterClaim(inputs);

  // If third-party claims against insured and liability is at_fault or partial_fault,
  // the insurer settles the claim and records a loss, incurring commercial loading on renewal.
  const selfPayCommercialLoading = (inputs.thirdPartyClaim && inputs.liability !== "non_fault")
    ? inputs.commercialClaimLoading
    : 0;
  // An own-damage claim incurs commercial loading unless 100% non-fault (subrogated).
  const claimCommercialLoading = inputs.liability === "non_fault"
    ? 0
    : inputs.commercialClaimLoading;

  const selfPayYears = buildPath(
    inputs,
    selfPayStartingNcd,
    growthRate,
    inputs.discountRate,
    selfPayCommercialLoading
  );
  const claimYears = buildPath(
    inputs,
    claimStartingNcd,
    growthRate,
    inputs.discountRate,
    claimCommercialLoading
  );

  const selfPayDowntimeCost = roundMoney(inputs.dailyDowntimeCost * inputs.selfPayDowntimeDays);
  const claimDowntimeCost = roundMoney(inputs.dailyDowntimeCost * inputs.claimDowntimeDays);
  const netDowntimeCost = roundMoney(claimDowntimeCost - selfPayDowntimeCost);

  // Present Value (Discounted) totals per Formula (1) in Preliminary.pdf
  const selfPayFutureDiscounted = sumPath(selfPayYears, true);
  const claimFutureDiscounted = sumPath(claimYears, true);

  // Nominal undiscounted totals for reference
  const selfPayFuturePremium = sumPath(selfPayYears, false);
  const claimFuturePremium = sumPath(claimYears, false);

  const currentClaimCost = Math.min(inputs.repairCost, effectiveExcess);

  const selfPayDay0Cost = roundMoney(inputs.repairCost + selfPayDowntimeCost);
  const claimDay0Cost = roundMoney(currentClaimCost + claimDowntimeCost);

  const selfPayTotal = roundMoney(selfPayDay0Cost + selfPayFutureDiscounted);
  const claimTotal = roundMoney(claimDay0Cost + claimFutureDiscounted);
  const difference = roundMoney(selfPayTotal - claimTotal);

  // Formula (1) extended for commercial vehicle loss-of-use downtime:
  // R*(S) = max(Eown, Eown + sum_{t=1}^T (Pt^claim - Pt^self) / (1 + r)^t + (Downtime^claim - Downtime^self))
  const breakEvenRepairCost = roundMoney(
    Math.max(
      effectiveExcess,
      effectiveExcess + (claimFutureDiscounted - selfPayFutureDiscounted) + netDowntimeCost
    ),
  );

  return {
    growthRate,
    selfPayYears,
    claimYears,
    selfPayFuturePremium,
    claimFuturePremium,
    selfPayFutureDiscounted,
    claimFutureDiscounted,
    selfPayDowntimeCost,
    claimDowntimeCost,
    netDowntimeCost,
    selfPayDay0Cost,
    claimDay0Cost,
    currentClaimCost: roundMoney(currentClaimCost),
    selfPayTotal,
    claimTotal,
    difference,
    breakEvenRepairCost,
    recommendedOption: difference > 0 ? "claim" : "self-pay",
  };
}

export function calculateDecision(rawInputs) {
  const inputs = normalizeInputs(rawInputs);
  const profile = insurerProfile(inputs.insurer);
  const excessDetails = computeEffectiveExcess(inputs);
  const effectiveExcess = excessDetails.totalEffectiveExcess;

  const baseGrowth = inputs.baseGrowthRate;
  const scenarioRates = [
    Math.max(-20, baseGrowth - 5),
    baseGrowth,
    Math.min(50, baseGrowth + 5),
  ];
  const scenarios = scenarioRates.map((growthRate) => buildScenario(inputs, growthRate, effectiveExcess));
  const baseScenario = scenarios[1];
  const isBelowExcess = inputs.repairCost <= effectiveExcess;
  const selfPayNcdAfterValue = ncdAfterSelfPay(inputs);
  const claimNcdAfterValue = ncdAfterClaim(inputs);

  const advisories = buildAdvisories({
    inputs,
    profile,
    excessDetails,
    effectiveExcess,
    baseScenario,
    isBelowExcess,
  });

  const clauseAudit = generateClauseAudit(
    inputs,
    profile,
    excessDetails,
    baseScenario,
    effectiveExcess,
    isBelowExcess,
    claimNcdAfterValue,
    selfPayNcdAfterValue
  );

  return {
    inputs,
    profile,
    excessDetails,
    effectiveExcess,
    scenarios,
    baseScenario,
    recommendation: isBelowExcess ? "self-pay" : baseScenario.recommendedOption,
    // Kept for API compatibility; it has always equalled isBelowExcess.
    isNearExcess: isBelowExcess,
    isBelowExcess,
    advisories,
    clauseAudit,
    selfPayNcdAfter: selfPayNcdAfterValue,
    claimNcdAfter: claimNcdAfterValue,
    basePremium: roundMoney(grossPremiumFromNet(inputs.currentPremium, inputs.currentNcd)),
  };
}
