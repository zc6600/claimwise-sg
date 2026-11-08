import { clamp, roundMoney, toBoundedNumber } from "../numeric.mjs";

export const LOAN_PREPAYMENT_DEFAULTS = {
  originalPrincipal: 80000,
  flatRatePct: 2.78,
  tenureMonths: 84,
  monthsPaid: 36,
  rebateFeePct: 20,
  penaltyPctOfOriginal: 0,
  adminFee: 0,
  alternativeReturnPct: 3,
};

const MAX_BISECTION_STEPS = 80;
const BREAK_EVEN_SEARCH_LIMIT_PCT = 100;

export function normalizeLoanPrepaymentInputs(raw = {}) {
  const defaults = LOAN_PREPAYMENT_DEFAULTS;
  const tenureMonths = Math.round(
    toBoundedNumber(raw.tenureMonths, { min: 1, max: 120, fallback: defaults.tenureMonths })
  );
  return {
    originalPrincipal: toBoundedNumber(raw.originalPrincipal, { min: 0, max: 2000000 }),
    flatRatePct: toBoundedNumber(raw.flatRatePct, { min: 0, max: 30, fallback: defaults.flatRatePct }),
    tenureMonths,
    monthsPaid: clamp(Math.round(toBoundedNumber(raw.monthsPaid, { min: 0, max: 120 })), 0, tenureMonths),
    rebateFeePct: toBoundedNumber(raw.rebateFeePct, { min: 0, max: 100, fallback: defaults.rebateFeePct }),
    penaltyPctOfOriginal: toBoundedNumber(raw.penaltyPctOfOriginal, { min: 0, max: 20 }),
    adminFee: toBoundedNumber(raw.adminFee, { min: 0, max: 10000 }),
    alternativeReturnPct: toBoundedNumber(raw.alternativeReturnPct, {
      min: 0,
      max: 30,
      fallback: defaults.alternativeReturnPct,
    }),
  };
}

/**
 * Rule of 78: the share of total flat interest treated as unearned equals the sum of
 * the remaining month numbers divided by the sum of all month numbers.
 */
export function ruleOf78UnearnedInterest(totalInterest, tenureMonths, remainingMonths) {
  const allDigits = (tenureMonths * (tenureMonths + 1)) / 2;
  const remainingDigits = (remainingMonths * (remainingMonths + 1)) / 2;
  return totalInterest * (remainingDigits / allDigits);
}

function presentValueOfInstalments(instalment, months, annualRatePct) {
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return instalment * months;
  return instalment * ((1 - (1 + monthlyRate) ** -months) / monthlyRate);
}

/**
 * Finds the annual return on idle cash at which settling and continuing are equally
 * attractive. It is null when settlement costs at least as much as all remaining
 * instalments, because no positive return justifies settling in that case.
 */
function breakEvenReturnPct(instalment, months, settlementAmount) {
  if (settlementAmount >= instalment * months) return null;
  let low = 0;
  let high = BREAK_EVEN_SEARCH_LIMIT_PCT;
  for (let step = 0; step < MAX_BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (presentValueOfInstalments(instalment, months, middle) > settlementAmount) low = middle;
    else high = middle;
  }
  return roundMoney((low + high) / 2);
}

/**
 * Compares early settlement of a flat-rate car loan with continuing the instalments
 * while the same cash earns the alternative return.
 */
export function evaluateLoanPrepayment(rawInputs) {
  const inputs = normalizeLoanPrepaymentInputs(rawInputs);
  const remainingMonths = inputs.tenureMonths - inputs.monthsPaid;

  if (inputs.originalPrincipal <= 0 || remainingMonths <= 0) {
    return { inputs, ready: false, remainingMonths };
  }

  const years = inputs.tenureMonths / 12;
  const totalInterest = inputs.originalPrincipal * (inputs.flatRatePct / 100) * years;
  const instalment = (inputs.originalPrincipal + totalInterest) / inputs.tenureMonths;
  const remainingInstalments = instalment * remainingMonths;
  const grossInterestRebate = ruleOf78UnearnedInterest(
    totalInterest,
    inputs.tenureMonths,
    remainingMonths
  );
  const rebateFee = grossInterestRebate * (inputs.rebateFeePct / 100);
  const penalty = inputs.originalPrincipal * (inputs.penaltyPctOfOriginal / 100);
  const settlementAmount =
    remainingInstalments - grossInterestRebate + rebateFee + penalty + inputs.adminFee;
  const continuingPresentValue = presentValueOfInstalments(
    instalment,
    remainingMonths,
    inputs.alternativeReturnPct
  );
  const netPresentBenefit = continuingPresentValue - settlementAmount;

  return {
    inputs,
    ready: true,
    remainingMonths,
    instalment: roundMoney(instalment),
    totalInterest: roundMoney(totalInterest),
    remainingInstalments: roundMoney(remainingInstalments),
    grossInterestRebate: roundMoney(grossInterestRebate),
    rebateFee: roundMoney(rebateFee),
    penalty: roundMoney(penalty),
    settlementAmount: roundMoney(settlementAmount),
    nominalSaving: roundMoney(remainingInstalments - settlementAmount),
    netPresentBenefit: roundMoney(netPresentBenefit),
    breakEvenReturnPct: breakEvenReturnPct(instalment, remainingMonths, settlementAmount),
    recommendation: netPresentBenefit > 0 ? "settle" : "continue",
  };
}
