import { clamp, roundMoney, toBoundedNumber } from "../numeric.mjs";
import {
  PARF_COHORTS,
  computeCoeRebate,
  computeParfRebate,
  roadTaxSurchargePct,
} from "./coe-renewal.mjs";
import { ruleOf78UnearnedInterest } from "./loan-prepayment.mjs";

export const POWERTRAINS = {
  PETROL: "petrol",
  HYBRID: "hybrid",
  ELECTRIC: "electric",
};

export const OWNERSHIP_COST_DEFAULTS = {
  powertrain: POWERTRAINS.PETROL,
  engineCc: 1598,
  powerKw: 110,
  price: 165000,
  omv: 22000,
  arfPaid: 22800,
  coePremiumPaid: 100000,
  parfCohort: PARF_COHORTS.FROM_FEB_2026,
  carAgeYears: 0,
  coeYearsLeft: 10,
  yearsOwned: 10,
  expectedEndValue: "",
  loanPct: 60,
  flatRatePct: 2.78,
  loanYears: 7,
  insurancePerYear: 1600,
  kmPerYear: 17500,
  consumptionPer100Km: 6.5,
  energyPrice: 3,
  parkingPerMonth: 110,
  erpPerMonth: 30,
  maintenancePerYear: 1200,
};

// LTA road tax: six-monthly amounts multiplied by 0.782, from the OneMotoring tax structure.
const ROAD_TAX_FACTOR = 0.782;
// Fully electric cars also pay an Additional Flat Component of S$350 every six months.
const EV_FLAT_COMPONENT_PER_YEAR = 700;
// MAS caps car loans at 70% of the price when OMV is S$20,000 or less, otherwise 60%.
const LOW_OMV_THRESHOLD = 20000;
const MAX_LOAN_YEARS = 7;
const COE_PERIOD_MONTHS = 120;

export function petrolRoadTaxPerYear(engineCc) {
  const cc = Math.max(0, engineCc);
  let sixMonthly;
  if (cc <= 600) sixMonthly = 200;
  else if (cc <= 1000) sixMonthly = 200 + 0.125 * (cc - 600);
  else if (cc <= 1600) sixMonthly = 250 + 0.375 * (cc - 1000);
  else if (cc <= 3000) sixMonthly = 475 + 0.75 * (cc - 1600);
  else sixMonthly = 1525 + (cc - 3000);
  return sixMonthly * ROAD_TAX_FACTOR * 2;
}

export function electricRoadTaxPerYear(powerKw) {
  const kw = Math.max(0, powerKw);
  let sixMonthly;
  if (kw <= 7.5) sixMonthly = 200;
  else if (kw <= 30) sixMonthly = 200 + 2 * (kw - 7.5);
  else if (kw <= 230) sixMonthly = 250 + 3.75 * (kw - 30);
  else sixMonthly = 1525 + 10 * (kw - 230);
  return sixMonthly * ROAD_TAX_FACTOR * 2;
}

/**
 * Base annual road tax before the age surcharge. Hybrids are assessed on both engine
 * capacity and motor power and pay the higher amount; fully electric cars are assessed
 * on motor power. The electric flat component is returned separately because the age
 * surcharge applies to road tax only.
 */
export function annualRoadTax({ powertrain, engineCc, powerKw }) {
  if (powertrain === POWERTRAINS.ELECTRIC) {
    return { base: electricRoadTaxPerYear(powerKw), flatComponent: EV_FLAT_COMPONENT_PER_YEAR };
  }
  if (powertrain === POWERTRAINS.HYBRID) {
    return {
      base: Math.max(petrolRoadTaxPerYear(engineCc), electricRoadTaxPerYear(powerKw)),
      flatComponent: 0,
    };
  }
  return { base: petrolRoadTaxPerYear(engineCc), flatComponent: 0 };
}

export function maxLoanPct(omv) {
  return omv <= LOW_OMV_THRESHOLD ? 70 : 60;
}

export function normalizeOwnershipCostInputs(raw = {}) {
  const d = OWNERSHIP_COST_DEFAULTS;
  const num = (key, min, max) => toBoundedNumber(raw[key], { min, max, fallback: d[key] });
  const coeYearsLeft = num("coeYearsLeft", 0.5, 10);
  const expectedEndValue =
    raw.expectedEndValue === "" || raw.expectedEndValue === undefined || raw.expectedEndValue === null
      ? null
      : toBoundedNumber(raw.expectedEndValue, { min: 0, max: 2000000 });
  return {
    powertrain: Object.values(POWERTRAINS).includes(raw.powertrain) ? raw.powertrain : d.powertrain,
    engineCc: num("engineCc", 0, 8000),
    powerKw: num("powerKw", 0, 1000),
    price: num("price", 0, 2000000),
    omv: num("omv", 0, 1000000),
    arfPaid: num("arfPaid", 0, 2000000),
    coePremiumPaid: num("coePremiumPaid", 0, 500000),
    parfCohort: Object.values(PARF_COHORTS).includes(raw.parfCohort) ? raw.parfCohort : d.parfCohort,
    carAgeYears: num("carAgeYears", 0, 20),
    coeYearsLeft,
    yearsOwned: clamp(num("yearsOwned", 0.5, 10), 0.5, coeYearsLeft),
    expectedEndValue,
    loanPct: num("loanPct", 0, 70),
    flatRatePct: num("flatRatePct", 0, 30),
    loanYears: num("loanYears", 0.5, MAX_LOAN_YEARS),
    insurancePerYear: num("insurancePerYear", 0, 100000),
    kmPerYear: num("kmPerYear", 0, 200000),
    consumptionPer100Km: num("consumptionPer100Km", 0, 100),
    energyPrice: num("energyPrice", 0, 20),
    parkingPerMonth: num("parkingPerMonth", 0, 10000),
    erpPerMonth: num("erpPerMonth", 0, 10000),
    maintenancePerYear: num("maintenancePerYear", 0, 100000),
  };
}

/**
 * The car's value when ownership ends. Without the owner's own estimate it is the
 * deregistration value: the PARF rebate for the age reached plus the pro-rated COE
 * rebate for unused COE months. That is the floor; a resale to a dealer can be higher.
 */
function endValue(inputs) {
  if (inputs.expectedEndValue !== null) {
    return { value: inputs.expectedEndValue, source: "estimate" };
  }
  const parf = computeParfRebate({
    arfPaid: inputs.arfPaid,
    ageYears: inputs.carAgeYears + inputs.yearsOwned,
    cohort: inputs.parfCohort,
  });
  const coe = computeCoeRebate({
    quotaPremiumPaid: inputs.coePremiumPaid,
    unusedMonths: Math.round((inputs.coeYearsLeft - inputs.yearsOwned) * 12),
    periodMonths: COE_PERIOD_MONTHS,
  });
  return { value: parf + coe, source: "deregistration" };
}

/**
 * Flat-rate interest actually paid while the car is owned. Selling before the loan ends
 * settles it early, and the unearned interest is refunded under the Rule of 78; lender
 * fees on early settlement are left out.
 */
function loanCosts(inputs, loanAmount) {
  const loanMonths = Math.round(inputs.loanYears * 12);
  const totalInterest = loanAmount * (inputs.flatRatePct / 100) * inputs.loanYears;
  const instalment = loanMonths > 0 ? (loanAmount + totalInterest) / loanMonths : 0;
  const ownedMonths = Math.round(inputs.yearsOwned * 12);
  const remainingMonths = Math.max(0, loanMonths - ownedMonths);
  const interestPaid =
    remainingMonths > 0
      ? totalInterest - ruleOf78UnearnedInterest(totalInterest, loanMonths, remainingMonths)
      : totalInterest;
  return { instalment, interestPaid, loanMonths: Math.min(loanMonths, ownedMonths) };
}

function roadTaxOverOwnership(inputs) {
  const { base, flatComponent } = annualRoadTax(inputs);
  const wholeYears = Math.floor(inputs.yearsOwned);
  const partYear = inputs.yearsOwned - wholeYears;
  let total = 0;
  for (let year = 0; year < Math.ceil(inputs.yearsOwned); year += 1) {
    const share = year < wholeYears ? 1 : partYear;
    const surcharge = roadTaxSurchargePct(inputs.carAgeYears + year) / 100;
    total += share * (base * (1 + surcharge) + flatComponent);
  }
  return { total, firstYear: base + flatComponent };
}

/**
 * Spreads every cost of owning the car over the months it is kept: depreciation of
 * the purchase price down to its end value, loan interest, road tax, and running
 * costs. Loan principal is not counted separately because it is part of the price.
 */
export function evaluateOwnershipCost(rawInputs) {
  const inputs = normalizeOwnershipCostInputs(rawInputs);
  const months = inputs.yearsOwned * 12;

  const capPct = maxLoanPct(inputs.omv);
  const loanPct = Math.min(inputs.loanPct, capPct);
  const loanAmount = inputs.price * (loanPct / 100);
  const loan = loanCosts(inputs, loanAmount);
  const end = endValue(inputs);
  const roadTax = roadTaxOverOwnership(inputs);

  const energyPerMonth =
    (inputs.kmPerYear * (inputs.consumptionPer100Km / 100) * inputs.energyPrice) / 12;
  const runningPerMonth =
    inputs.insurancePerYear / 12 +
    roadTax.total / months +
    energyPerMonth +
    inputs.parkingPerMonth +
    inputs.erpPerMonth +
    inputs.maintenancePerYear / 12;

  const items = [
    { id: "depreciation", label: "Depreciation", monthly: Math.max(0, inputs.price - end.value) / months },
    { id: "interest", label: "Loan interest", monthly: loan.interestPaid / months },
    { id: "insurance", label: "Insurance", monthly: inputs.insurancePerYear / 12 },
    { id: "roadTax", label: "Road tax", monthly: roadTax.total / months },
    {
      id: "energy",
      label: inputs.powertrain === POWERTRAINS.ELECTRIC ? "Charging" : "Fuel",
      monthly: energyPerMonth,
    },
    { id: "parking", label: "Parking, ERP and tolls", monthly: inputs.parkingPerMonth + inputs.erpPerMonth },
    { id: "maintenance", label: "Servicing and repairs", monthly: inputs.maintenancePerYear / 12 },
  ].map((item) => ({ ...item, monthly: roundMoney(item.monthly) }));

  const totalMonthly = roundMoney(items.reduce((sum, item) => sum + item.monthly, 0));

  return {
    inputs,
    months,
    loanCapPct: capPct,
    loanPct,
    loanCapped: inputs.loanPct > capPct,
    loanAmount: roundMoney(loanAmount),
    downPayment: roundMoney(inputs.price - loanAmount),
    instalment: roundMoney(loan.instalment),
    interestPaid: roundMoney(loan.interestPaid),
    endValue: roundMoney(end.value),
    endValueSource: end.source,
    firstYearRoadTax: roundMoney(roadTax.firstYear),
    items,
    totalMonthly,
    totalOverOwnership: roundMoney(totalMonthly * months),
    cashPerMonthDuringLoan: roundMoney(loan.instalment + runningPerMonth),
    cashPerMonthAfterLoan: roundMoney(runningPerMonth),
    costPerKm: inputs.kmPerYear > 0 ? roundMoney((totalMonthly * 12) / inputs.kmPerYear) : null,
  };
}
