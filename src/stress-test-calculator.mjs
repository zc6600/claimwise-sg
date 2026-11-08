import { clamp, roundMoney } from "./numeric.mjs";
import { nextNcd } from "./ncd/premium-path.mjs";

function premiumAtNcdWithLoadings(
  basePremium,
  ncd,
  growthRate,
  year,
  commercialLoadingPct = 0,
  consecutiveLoadingPct = 0
) {
  const growthMultiplier = (1 + growthRate / 100) ** year;
  const commercialMultiplier = 1 + commercialLoadingPct / 100;
  const consecutiveMultiplier = 1 + consecutiveLoadingPct / 100;
  return (
    basePremium *
    (1 - ncd / 100) *
    growthMultiplier *
    commercialMultiplier *
    consecutiveMultiplier
  );
}

/**
 * Simulates a multi-incident consecutive claim risk scenario.
 * Evaluates the multi-year financial impact if a second at-fault accident occurs in Year 1.
 *
 * @param {Object} decision - The primary decision output from calculateDecision
 * @param {Object} options - Simulation options
 * @param {number} [options.secondRepairCost=1500] - Estimated workshop quotation for second collision
 * @param {number} [options.consecutiveLoadingPct=25] - Underwriting loading for 2 at-fault claims in 36 months
 * @returns {Object} Stress test evaluation metrics and trajectory schedules
 */
export function computeConsecutiveClaimStressTest(decision, options = {}) {
  if (!decision || typeof decision !== "object" || !decision.baseScenario || !decision.inputs) {
    throw new TypeError("A valid calculated decision object is required.");
  }

  const inputs = decision.inputs;
  const baseScenario = decision.baseScenario;
  const effectiveExcess = Math.max(0, Number(decision.effectiveExcess ?? inputs.excess ?? 600));
  const basePremium = Math.max(0, Number(decision.basePremium ?? inputs.currentPremium ?? 1650));
  const horizonYears = [3, 5].includes(Number(inputs.horizonYears)) ? Number(inputs.horizonYears) : 3;
  const discountRate = clamp(Number(inputs.discountRate ?? 3), 0, 20);
  const growthRate = clamp(Number(inputs.baseGrowthRate ?? 5), -20, 50);

  const secondRepairCost = clamp(
    Number.isFinite(Number(options.secondRepairCost))
      ? Number(options.secondRepairCost)
      : 1500,
    0,
    500000
  );
  const consecutiveLoadingPct = clamp(
    Number.isFinite(Number(options.consecutiveLoadingPct))
      ? Number(options.consecutiveLoadingPct)
      : 25,
    0,
    100
  );

  const isPhv = inputs.vehicleUsage === "phv";
  const commercialLoading = isPhv ? Number(inputs.commercialClaimLoading ?? 15) : 0;
  const dailyDowntime = isPhv ? Number(inputs.dailyDowntimeCost ?? 0) : 0;
  const claimDowntimeDays = isPhv ? Number(inputs.claimDowntimeDays ?? 5) : 0;
  const secondClaimDowntimeCost = roundMoney(dailyDowntime * claimDowntimeDays);

  const secondIncidentClaimOutflow = roundMoney(
    Math.min(secondRepairCost, effectiveExcess) + secondClaimDowntimeCost
  );

  // Check initial NCD protector status
  const profile = decision.profile || {};
  const minNcdForProtector = profile.minNcdForProtector ?? 50;
  const hasProtector = Boolean(inputs.ncdProtector && inputs.currentNcd >= minNcdForProtector);
  const ncdDropPoints = profile.ncdDropPoints || 30;

  // Determine whether Incident 1 was at-fault (or split-fault)
  const incident1IsAtFault = inputs.liability !== "non_fault";

  // -------------------------------------------------------------
  // Path 1: User CLAIMED Incident 1, and now Incident 2 occurs in Year 1
  // -------------------------------------------------------------
  const claimIncident1Day0 = baseScenario.claimDay0Cost ?? Math.min(inputs.repairCost, effectiveExcess);

  // In Year 1:
  // If driver had protector, protector absorbed Incident 1 -> Year 1 renewal NCD was preserved.
  // BUT the protector is now EXHAUSTED (covers only 1 claim per policy period).
  const claimPathYear1Ncd = decision.claimNcdAfter;
  const claimPathYear1CommercialLoading = incident1IsAtFault ? commercialLoading : 0;

  // When Incident 2 occurs during Year 1:
  // Protector is exhausted, so NCD drops by ncdDropPoints from Year 1 tier.
  const claimPathYear2Ncd = clamp(claimPathYear1Ncd - ncdDropPoints, 0, 50);

  // Consecutive loading applies ONLY if Incident 1 was at-fault (yielding 2 at-fault claims).
  // If Incident 1 was non-fault, Incident 2 is the driver's ONLY at-fault claim on record.
  const claimTriggersConsecutiveLoading = incident1IsAtFault;
  const claimPathConsecutiveLoading = claimTriggersConsecutiveLoading ? consecutiveLoadingPct : 0;

  const claimSchedule = [];
  let claimCurrentNcd = claimPathYear1Ncd;

  for (let year = 1; year <= horizonYears; year += 1) {
    let renewalNcd;
    let commercialPct = 0;
    let consecutivePct = 0;

    if (year === 1) {
      renewalNcd = claimPathYear1Ncd;
      commercialPct = claimPathYear1CommercialLoading;
      consecutivePct = 0;
    } else if (year === 2) {
      renewalNcd = claimPathYear2Ncd;
      commercialPct = commercialLoading;
      consecutivePct = claimPathConsecutiveLoading;
      claimCurrentNcd = renewalNcd;
    } else {
      claimCurrentNcd = nextNcd(claimCurrentNcd);
      renewalNcd = claimCurrentNcd;
      commercialPct = commercialLoading;
      consecutivePct = claimPathConsecutiveLoading;
    }

    const nominal = premiumAtNcdWithLoadings(
      basePremium,
      renewalNcd,
      growthRate,
      year,
      commercialPct,
      consecutivePct
    );
    const discountFactor = (1 + discountRate / 100) ** year;
    const discounted = nominal / discountFactor;

    claimSchedule.push({
      year,
      ncd: renewalNcd,
      commercialLoadingPct: commercialPct,
      consecutiveLoadingPct: consecutivePct,
      loadingPct: commercialPct + consecutivePct,
      premium: roundMoney(nominal),
      discountedPremium: roundMoney(discounted),
    });
  }

  // -------------------------------------------------------------
  // Path 2: User SELF-PAID Incident 1, and now Incident 2 occurs in Year 1
  // -------------------------------------------------------------
  const selfPayIncident1Day0 = baseScenario.selfPayDay0Cost ?? inputs.repairCost;

  // In Year 1:
  // Incident 1 was self-paid. If third-party claimed and user is at fault, insurer settled.
  const incident1ThirdPartyAtFault = Boolean(inputs.thirdPartyClaim && incident1IsAtFault);
  const selfPayPathYear1Ncd = decision.selfPayNcdAfter;
  const selfPayPathYear1CommercialLoading = incident1ThirdPartyAtFault ? commercialLoading : 0;

  // When Incident 2 occurs in Year 1, user claims Incident 2 (first claim for own damage).
  // If third-party claim occurred in Incident 1, the protector was consumed by the 3rd party claim.
  // Otherwise, the protector is fully intact and shields Incident 2!
  const selfPayProtectorSurvives = hasProtector && !incident1ThirdPartyAtFault;
  const selfPayProtectorEligible = selfPayProtectorSurvives && selfPayPathYear1Ncd >= minNcdForProtector;

  const selfPayPathYear2Ncd = selfPayProtectorEligible
    ? selfPayPathYear1Ncd
    : clamp(selfPayPathYear1Ncd - ncdDropPoints, 0, 50);

  // On self-pay route, Incident 2 is the ONLY at-fault claim on the loss record,
  // so consecutive adverse loading is strictly 0%.
  const selfPaySchedule = [];
  let selfPayCurrentNcd = selfPayPathYear1Ncd;

  for (let year = 1; year <= horizonYears; year += 1) {
    let renewalNcd;
    let commercialPct = 0;

    if (year === 1) {
      renewalNcd = selfPayPathYear1Ncd;
      commercialPct = selfPayPathYear1CommercialLoading;
    } else if (year === 2) {
      renewalNcd = selfPayPathYear2Ncd;
      commercialPct = commercialLoading;
      selfPayCurrentNcd = renewalNcd;
    } else {
      selfPayCurrentNcd = nextNcd(selfPayCurrentNcd);
      renewalNcd = selfPayCurrentNcd;
      commercialPct = commercialLoading;
    }

    const nominal = premiumAtNcdWithLoadings(
      basePremium,
      renewalNcd,
      growthRate,
      year,
      commercialPct,
      0
    );
    const discountFactor = (1 + discountRate / 100) ** year;
    const discounted = nominal / discountFactor;

    selfPaySchedule.push({
      year,
      ncd: renewalNcd,
      commercialLoadingPct: commercialPct,
      consecutiveLoadingPct: 0,
      loadingPct: commercialPct,
      premium: roundMoney(nominal),
      discountedPremium: roundMoney(discounted),
    });
  }

  // Sum future discounted premiums
  const claimFutureDiscounted = roundMoney(
    claimSchedule.reduce((sum, item) => sum + item.discountedPremium, 0)
  );
  const selfPayFutureDiscounted = roundMoney(
    selfPaySchedule.reduce((sum, item) => sum + item.discountedPremium, 0)
  );

  // Incident 2 claim cost occurs in Year 1 (discounted by 1 year)
  const discountFactorYear1 = 1 + discountRate / 100;
  const secondIncidentClaimPv = roundMoney(secondIncidentClaimOutflow / discountFactorYear1);

  // Total multi-year costs under consecutive claim scenario
  // Under Claim path: User paid Incident 1 excess + Incident 2 excess (in Year 1) + renewals with 2 claims
  const claimConsecutiveTotal = roundMoney(
    claimIncident1Day0 + secondIncidentClaimPv + claimFutureDiscounted
  );

  // Under Self-Pay path: User paid Incident 1 repair + Incident 2 excess (in Year 1) + renewals with 1 claim
  const selfPayConsecutiveTotal = roundMoney(
    selfPayIncident1Day0 + secondIncidentClaimPv + selfPayFutureDiscounted
  );

  const consecutiveDifference = roundMoney(selfPayConsecutiveTotal - claimConsecutiveTotal);
  const singleDifference = roundMoney(baseScenario.difference ?? 0);

  // The Resilience Buffer Value: The additional cost advantage of having self-paid Incident 1
  // when an adverse consecutive incident strikes.
  const resilienceBuffer = roundMoney(singleDifference - consecutiveDifference);

  return {
    secondRepairCost,
    consecutiveLoadingPct,
    secondIncidentClaimOutflow,
    claimSchedule,
    selfPaySchedule,
    claimFutureDiscounted,
    selfPayFutureDiscounted,
    claimConsecutiveTotal,
    selfPayConsecutiveTotal,
    consecutiveDifference,
    singleDifference,
    resilienceBuffer,
    claimYear2Ncd: claimPathYear2Ncd,
    selfPayYear2Ncd: selfPayPathYear2Ncd,
    incident1IsAtFault,
    claimTriggersConsecutiveLoading,
    claimHasConsecutiveLoading: claimTriggersConsecutiveLoading,
    selfPayHasConsecutiveLoading: false,
    recommendedOption: consecutiveDifference > 0 ? "claim" : "self-pay",
  };
}
