import {
  discountFactor,
  equivalentAnnualCost,
  roundMoney,
  toBoundedNumber,
} from "./shared.mjs";

export const PARF_COHORTS = {
  BEFORE_FEB_2023: "before-feb-2023",
  FEB_2023_TO_FEB_2026: "feb-2023-to-feb-2026",
  FROM_FEB_2026: "from-feb-2026",
};

const LEGACY_PARF_RATES = [75, 70, 65, 60, 55, 50];
const REVISED_PARF_RATES = [30, 25, 20, 15, 10, 5];

const PARF_SCHEDULES = {
  [PARF_COHORTS.BEFORE_FEB_2023]: { rates: LEGACY_PARF_RATES, cap: Infinity },
  [PARF_COHORTS.FEB_2023_TO_FEB_2026]: { rates: LEGACY_PARF_RATES, cap: 60000 },
  [PARF_COHORTS.FROM_FEB_2026]: { rates: REVISED_PARF_RATES, cap: 30000 },
};

export const COE_RENEWAL_DEFAULTS = {
  pqp: 100000,
  parfCohort: PARF_COHORTS.BEFORE_FEB_2023,
  arfPaid: 25000,
  carAgeYears: 10,
  coeQuotaPremiumPaid: 0,
  coeUnusedMonths: 0,
  scrapValue: 0,
  endOfRenewalValue: 0,
  annualRoadTax: 750,
  currentCarAnnualCost: 4500,
  replacementPrice: 170000,
  replacementResaleValue: 90000,
  replacementYears: 5,
  replacementAnnualCost: 3000,
  discountRate: 3,
};

export function parfRatePct(ageYears, cohort) {
  const schedule = PARF_SCHEDULES[cohort] ?? PARF_SCHEDULES[PARF_COHORTS.BEFORE_FEB_2023];
  if (ageYears > 10) return 0;
  if (ageYears <= 5) return schedule.rates[0];
  return schedule.rates[Math.ceil(ageYears) - 5];
}

export function computeParfRebate({ arfPaid, ageYears, cohort }) {
  const schedule = PARF_SCHEDULES[cohort] ?? PARF_SCHEDULES[PARF_COHORTS.BEFORE_FEB_2023];
  const uncapped = arfPaid * (parfRatePct(ageYears, cohort) / 100);
  return roundMoney(Math.min(uncapped, schedule.cap));
}

export function computeCoeRebate({ quotaPremiumPaid, unusedMonths, periodMonths = 120 }) {
  return roundMoney(quotaPremiumPaid * (Math.min(unusedMonths, periodMonths) / periodMonths));
}

/**
 * Road tax surcharge for vehicles past their tenth year. A renewal made at the COE
 * expiry falls in the "more than 10 years" band, so whole years of age map directly
 * to the published 10% to 50% steps.
 */
export function roadTaxSurchargePct(ageYears) {
  if (ageYears < 10) return 0;
  return Math.min((Math.floor(ageYears) - 9) * 10, 50);
}

export function normalizeCoeRenewalInputs(raw = {}) {
  const defaults = COE_RENEWAL_DEFAULTS;
  const money = (key, max) =>
    toBoundedNumber(raw[key], { min: 0, max, fallback: defaults[key] });

  return {
    pqp: money("pqp", 500000),
    parfCohort: Object.values(PARF_COHORTS).includes(raw.parfCohort)
      ? raw.parfCohort
      : defaults.parfCohort,
    arfPaid: money("arfPaid", 1000000),
    carAgeYears: toBoundedNumber(raw.carAgeYears, { min: 0, max: 30, fallback: defaults.carAgeYears }),
    coeQuotaPremiumPaid: money("coeQuotaPremiumPaid", 500000),
    coeUnusedMonths: toBoundedNumber(raw.coeUnusedMonths, { min: 0, max: 120 }),
    scrapValue: money("scrapValue", 500000),
    endOfRenewalValue: money("endOfRenewalValue", 500000),
    annualRoadTax: money("annualRoadTax", 50000),
    currentCarAnnualCost: money("currentCarAnnualCost", 100000),
    replacementPrice: money("replacementPrice", 2000000),
    replacementResaleValue: money("replacementResaleValue", 2000000),
    replacementYears: toBoundedNumber(raw.replacementYears, {
      min: 1,
      max: 10,
      fallback: defaults.replacementYears,
    }),
    replacementAnnualCost: money("replacementAnnualCost", 100000),
    discountRate: toBoundedNumber(raw.discountRate, { min: 0, max: 20, fallback: defaults.discountRate }),
  };
}

function presentValueOfRunningCosts(inputs, years, annualCostForYear) {
  let total = 0;
  for (let year = 1; year <= years; year += 1) {
    total += annualCostForYear(year) / discountFactor(inputs.discountRate, year);
  }
  return total;
}

function buildRenewalOption(inputs, deregistrationValue, { id, label, years, upfront, note }) {
  const runningPv = presentValueOfRunningCosts(inputs, years, (year) => {
    const ageInYear = inputs.carAgeYears + year - 1;
    const surcharge = roadTaxSurchargePct(ageInYear) / 100;
    return inputs.currentCarAnnualCost + inputs.annualRoadTax * (1 + surcharge);
  });
  const endValuePv = inputs.endOfRenewalValue / discountFactor(inputs.discountRate, years);
  const presentValue = upfront + deregistrationValue + runningPv - endValuePv;
  return {
    id,
    label,
    years,
    upfront: roundMoney(upfront),
    presentValue: roundMoney(presentValue),
    annualCost: roundMoney(equivalentAnnualCost(presentValue, inputs.discountRate, years)),
    note,
  };
}

function buildReplacementOption(inputs, deregistrationValue) {
  const years = inputs.replacementYears;
  const upfront = Math.max(0, inputs.replacementPrice - deregistrationValue);
  const runningPv = presentValueOfRunningCosts(inputs, years, () => inputs.replacementAnnualCost);
  const resalePv = inputs.replacementResaleValue / discountFactor(inputs.discountRate, years);
  const presentValue = inputs.replacementPrice + runningPv - resalePv;
  return {
    id: "replace",
    label: "Deregister and replace",
    years,
    upfront: roundMoney(upfront),
    presentValue: roundMoney(presentValue),
    annualCost: roundMoney(equivalentAnnualCost(presentValue, inputs.discountRate, years)),
    note: "Rebates and scrap value reduce the cash you need; the new car's resale value is credited at the end.",
  };
}

/**
 * Compares options with a standard replacement analysis. The value released by
 * deregistering today is an asset the owner already holds, so keeping the car gives it
 * up: it counts as a capital cost of both renewals and is not credited to replacement.
 * Each option's cost is then levelled over its own life, which assumes a like-for-like
 * choice would be available afterwards.
 */
export function compareCoeOptions(rawInputs) {
  const inputs = normalizeCoeRenewalInputs(rawInputs);
  const parfRebate = computeParfRebate({
    arfPaid: inputs.arfPaid,
    ageYears: inputs.carAgeYears,
    cohort: inputs.parfCohort,
  });
  const coeRebate = computeCoeRebate({
    quotaPremiumPaid: inputs.coeQuotaPremiumPaid,
    unusedMonths: inputs.coeUnusedMonths,
  });
  const deregistrationValue = roundMoney(parfRebate + coeRebate + inputs.scrapValue);

  const options = [
    buildRenewalOption(inputs, deregistrationValue, {
      id: "renew-5",
      label: "Renew COE for 5 years",
      years: 5,
      upfront: Math.ceil(inputs.pqp * 0.5),
      note: "Costs 50% of the PQP. Cars can take this renewal only once and must be deregistered afterwards.",
    }),
    buildRenewalOption(inputs, deregistrationValue, {
      id: "renew-10",
      label: "Renew COE for 10 years",
      years: 10,
      upfront: inputs.pqp,
      note: "Costs 100% of the PQP. Cars can renew again for another ten years.",
    }),
    buildReplacementOption(inputs, deregistrationValue),
  ];

  const ranked = [...options].sort((a, b) => a.annualCost - b.annualCost);
  return {
    inputs,
    parfRebate,
    coeRebate,
    deregistrationValue,
    options,
    bestOptionId: ranked[0].id,
    annualSavingVsNextBest: roundMoney(ranked[1].annualCost - ranked[0].annualCost),
  };
}
