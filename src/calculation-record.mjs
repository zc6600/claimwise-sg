import { formatCurrency } from "./formatters.mjs";

export function buildHistoryResults(decision) {
  const scenario = decision?.baseScenario;
  const rawRec = String(decision?.recommendation || "self-pay").toLowerCase();
  const recommendation =
    rawRec === "claim" ? "CLAIM" : rawRec === "neutral" ? "NEUTRAL" : "SELF_PAY";

  return {
    recommendation,
    savings: Math.abs(Number(scenario?.difference ?? 0)),
    breakEvenCost: Number(scenario?.breakEvenRepairCost ?? 0),
    claimScenario: {
      threeYearTotal: Number(scenario?.claimFutureDiscounted ?? 0),
    },
    selfPayScenario: {
      threeYearTotal: Number(scenario?.selfPayFutureDiscounted ?? 0),
    },
  };
}

export function buildCalculationRecord(
  decision,
  { id, userId, title, createdAt } = {}
) {
  if (!decision || typeof decision !== "object" || !decision.inputs) {
    throw new TypeError("A calculated decision object with inputs is required.");
  }

  const inputs = decision.inputs;
  const calcId =
    id || `calc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const currentPremium = Number(inputs.currentPremium ?? inputs.annualPremium ?? 0);
  const ncdProtector =
    inputs.ncdProtector === true || inputs.hasNcdProtector === true;
  const rawTitle =
    title || `Repair quote ${formatCurrency(Number(inputs.repairCost || 0))}`;

  return {
    id: calcId,
    ...(userId ? { userId } : {}),
    title: String(rawTitle).slice(0, 100),
    createdAt: createdAt || new Date().toISOString(),
    inputs: {
      insurer: inputs.insurer || "other",
      repairCost: Number(inputs.repairCost),
      excess: Number(inputs.excess),
      currentNcd: Number(inputs.currentNcd),
      ncdProtector,
      hasNcdProtector: ncdProtector,
      currentPremium,
      annualPremium: currentPremium,
      horizonYears: Number(inputs.horizonYears ?? 3),
      baseGrowthRate: Number(inputs.baseGrowthRate ?? 5),
      discountRate: Number(inputs.discountRate ?? 3),
      liability: inputs.liability || "at_fault",
      thirdPartyClaim: inputs.thirdPartyClaim === true,
      workshopType: inputs.workshopType || "authorized",
      youngDriverInvolved: inputs.youngDriverInvolved === true,
      repairType: inputs.repairType || "general",
    },
    results: buildHistoryResults(decision),
    decision,
  };
}
