/**
 * Trajectory calculations for multi-year cash outflows and NCD recovery.
 * Provides deterministic data points for the interactive SVG comparison visualizer.
 */

/**
 * Computes cumulative present-value cash outflow milestones across the decision horizon.
 * @param {Object} baseScenario - Scenario calculation from decision-engine
 * @param {Object} inputs - Decision inputs
 * @param {number} effectiveExcess - Total effective excess payable on claim
 * @returns {Array<{ label: string, year: number, selfPayOutflow: number, claimOutflow: number, difference: number }>}
 */
export function computeCumulativeTrajectory(baseScenario, inputs, effectiveExcess) {
  if (
    !baseScenario ||
    !Array.isArray(baseScenario.selfPayYears) ||
    !Array.isArray(baseScenario.claimYears) ||
    baseScenario.selfPayYears.length !== baseScenario.claimYears.length
  ) {
    return [];
  }

  const initialRepairCost = Number(inputs?.repairCost);
  const excessNum = Number(effectiveExcess);

  const repairCostSafe = Number.isFinite(initialRepairCost) && initialRepairCost >= 0 ? initialRepairCost : 0;
  const excessSafe = Number.isFinite(excessNum) && excessNum >= 0 ? excessNum : 0;
  const initialClaimCost = Math.min(repairCostSafe, excessSafe);

  const selfPayDay0 = Number.isFinite(baseScenario?.selfPayDay0Cost)
    ? baseScenario.selfPayDay0Cost
    : repairCostSafe;
  const claimDay0 = Number.isFinite(baseScenario?.claimDay0Cost)
    ? baseScenario.claimDay0Cost
    : initialClaimCost;

  const points = [
    {
      label: "Day 0",
      year: 0,
      selfPayOutflow: Math.round(selfPayDay0),
      claimOutflow: Math.round(claimDay0),
      difference: Math.round(selfPayDay0 - claimDay0),
    },
  ];

  let cumulativeSelfPay = selfPayDay0;
  let cumulativeClaim = claimDay0;

  for (let i = 0; i < baseScenario.selfPayYears.length; i += 1) {
    const spYear = baseScenario.selfPayYears[i];
    const clYear = baseScenario.claimYears[i];

    if (!spYear || !clYear || spYear.year !== clYear.year) {
      return []; // Reject mismatched year data
    }

    const spPremium = Number.isFinite(spYear.discountedPremium) ? spYear.discountedPremium : 0;
    const clPremium = Number.isFinite(clYear.discountedPremium) ? clYear.discountedPremium : 0;

    cumulativeSelfPay += spPremium;
    cumulativeClaim += clPremium;

    points.push({
      label: `Year ${spYear.year}`,
      year: spYear.year,
      selfPayOutflow: Math.round(cumulativeSelfPay),
      claimOutflow: Math.round(cumulativeClaim),
      difference: Math.round(cumulativeSelfPay - cumulativeClaim),
    });
  }

  return points;
}

/**
 * Finds the crossover milestone where the cumulative cost curve of claiming surpasses self-paying.
 * @param {Array<{ label: string, year: number, selfPayOutflow: number, claimOutflow: number }>} points
 * @returns {{ hasCrossover: boolean, crossoverYear: number|null, status: 'claim_exceeds'|'exact_breakeven'|'self_pay_cheaper'|'claim_cheaper'|'insufficient_data', description: string }}
 */
export function findTrajectoryCrossover(points = []) {
  if (!Array.isArray(points) || points.length < 2) {
    return {
      hasCrossover: false,
      crossoverYear: null,
      status: "insufficient_data",
      description: "Insufficient data points for trajectory comparison.",
    };
  }

  const day0 = points[0];

  // If repair cost was already less than or equal to claim cost at Day 0,
  // self-pay is always equal or cheaper throughout without a crossover from below.
  if (day0.selfPayOutflow <= day0.claimOutflow) {
    return {
      hasCrossover: false,
      crossoverYear: 0,
      status: "self_pay_cheaper",
      description:
        day0.selfPayOutflow === day0.claimOutflow
          ? "Day 0 costs are identical (quote is within excess); self-paying avoids renewal penalties."
          : "Self-paying is cheaper from Day 0 onwards.",
    };
  }

  // Day 0: claim was strictly cheaper (excess < repair). Search for subsequent crossover.
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];

    if (curr.claimOutflow === curr.selfPayOutflow) {
      return {
        hasCrossover: true,
        crossoverYear: curr.year,
        status: "exact_breakeven",
        description: `Cumulative costs reach exact break-even at Year ${curr.year}.`,
      };
    }

    if (prev.claimOutflow < prev.selfPayOutflow && curr.claimOutflow > curr.selfPayOutflow) {
      return {
        hasCrossover: true,
        crossoverYear: curr.year,
        status: "claim_exceeds",
        description: `Claiming becomes more expensive overall starting in Year ${curr.year}.`,
      };
    }
  }

  return {
    hasCrossover: false,
    crossoverYear: null,
    status: "claim_cheaper",
    description: "Claim remains cheaper throughout the modeled horizon.",
  };
}

/**
 * Computes step-by-step NCD recovery percentages across modeled years.
 * @param {Object} baseScenario
 * @param {Object} inputs
 * @returns {Array<{ label: string, year: number, selfPayNcd: number, claimNcd: number }>}
 */
export function computeNcdTrajectory(baseScenario, inputs) {
  if (
    !baseScenario ||
    !Array.isArray(baseScenario.selfPayYears) ||
    !Array.isArray(baseScenario.claimYears) ||
    baseScenario.selfPayYears.length !== baseScenario.claimYears.length
  ) {
    return [];
  }

  const rawNcd = Number(inputs?.currentNcd);
  const currentNcd = Number.isFinite(rawNcd) ? Math.max(0, Math.min(50, rawNcd)) : 0;

  const trajectory = [
    {
      label: "Current",
      year: 0,
      selfPayNcd: currentNcd,
      claimNcd: currentNcd,
    },
  ];

  for (let i = 0; i < baseScenario.selfPayYears.length; i += 1) {
    const spYear = baseScenario.selfPayYears[i];
    const clYear = baseScenario.claimYears[i];

    if (!spYear || !clYear || spYear.year !== clYear.year) {
      return [];
    }

    trajectory.push({
      label: `Year ${spYear.year}`,
      year: spYear.year,
      selfPayNcd: Math.max(0, Math.min(50, Number(spYear.ncd) || 0)),
      claimNcd: Math.max(0, Math.min(50, Number(clYear.ncd) || 0)),
    });
  }

  return trajectory;
}
