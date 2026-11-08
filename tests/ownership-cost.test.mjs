import test from "node:test";
import assert from "node:assert/strict";
import {
  annualRoadTax,
  electricRoadTaxPerYear,
  evaluateOwnershipCost,
  maxLoanPct,
  petrolRoadTaxPerYear,
} from "../src/car-decisions/ownership-cost.mjs";
import { PARF_COHORTS } from "../src/car-decisions/coe-renewal.mjs";

const round2 = (value) => Math.round(value * 100) / 100;

test("road tax follows the LTA six-monthly formulas", () => {
  // 1,598cc: [250 + 0.375 x 598] x 0.782 = 370.86 every six months.
  assert.equal(round2(petrolRoadTaxPerYear(1598)), 741.73);
  assert.equal(round2(petrolRoadTaxPerYear(600)), 312.8);
  // 2,000cc: [475 + 0.75 x 400] x 0.782 x 2.
  assert.equal(round2(petrolRoadTaxPerYear(2000)), 1212.1);
  // 110kW electric: [250 + 3.75 x 80] x 0.782 x 2, plus the S$700 flat component.
  assert.equal(round2(electricRoadTaxPerYear(110)), 860.2);
  const ev = annualRoadTax({ powertrain: "electric", engineCc: 0, powerKw: 110 });
  assert.equal(round2(ev.base + ev.flatComponent), 1560.2);
  // Hybrids pay the higher of the engine and motor assessments, without the flat component.
  const hybrid = annualRoadTax({ powertrain: "hybrid", engineCc: 1798, powerKw: 53 });
  assert.equal(round2(hybrid.base), round2(petrolRoadTaxPerYear(1798)));
  assert.equal(hybrid.flatComponent, 0);
});

test("the loan is capped at the MAS limit for the car's OMV", () => {
  assert.equal(maxLoanPct(20000), 70);
  assert.equal(maxLoanPct(20001), 60);
  const result = evaluateOwnershipCost({ price: 100000, omv: 25000, loanPct: 70 });
  assert.equal(result.loanPct, 60);
  assert.equal(result.loanCapped, true);
  assert.equal(result.loanAmount, 60000);
  assert.equal(result.downPayment, 40000);
});

test("without an estimate, the end value is the deregistration value", () => {
  const result = evaluateOwnershipCost({
    price: 165000,
    arfPaid: 22800,
    coePremiumPaid: 100000,
    parfCohort: PARF_COHORTS.FROM_FEB_2026,
    carAgeYears: 0,
    coeYearsLeft: 10,
    yearsOwned: 5,
  });
  // PARF at 5 years: 30% of S$22,800; COE rebate: 60 of 120 months unused.
  assert.equal(result.endValue, 6840 + 50000);
  assert.equal(result.endValueSource, "deregistration");
  const estimated = evaluateOwnershipCost({ yearsOwned: 5, expectedEndValue: 80000 });
  assert.equal(estimated.endValue, 80000);
  assert.equal(estimated.endValueSource, "estimate");
});

test("selling before the loan ends pays only the interest earned under the Rule of 78", () => {
  const full = evaluateOwnershipCost({ price: 100000, omv: 15000, loanPct: 70, flatRatePct: 3, loanYears: 7, yearsOwned: 10 });
  assert.equal(full.interestPaid, 14700);
  const early = evaluateOwnershipCost({ price: 100000, omv: 15000, loanPct: 70, flatRatePct: 3, loanYears: 7, yearsOwned: 3 });
  assert.ok(early.interestPaid < full.interestPaid);
  // The Rule of 78 front-loads interest, so three of seven years earn more than 3/7 of it.
  assert.ok(early.interestPaid > (full.interestPaid * 3) / 7);
});

test("the monthly total is the sum of its parts and running costs are counted once", () => {
  const result = evaluateOwnershipCost({});
  const sum = result.items.reduce((total, item) => total + item.monthly, 0);
  assert.equal(result.totalMonthly, round2(sum));
  const depreciation = result.items.find((item) => item.id === "depreciation");
  assert.equal(depreciation.monthly, round2((165000 - result.endValue) / 120));
  assert.ok(result.cashPerMonthDuringLoan > result.cashPerMonthAfterLoan);
  assert.equal(result.costPerKm, round2((result.totalMonthly * 12) / 17500));
});

test("road tax includes the age surcharge for a car kept past ten years", () => {
  const young = evaluateOwnershipCost({ carAgeYears: 0, coeYearsLeft: 2, yearsOwned: 2 });
  const old = evaluateOwnershipCost({ carAgeYears: 11, coeYearsLeft: 2, yearsOwned: 2 });
  const roadTax = (result) => result.items.find((item) => item.id === "roadTax").monthly;
  // Ages 11 and 12 carry 20% and 30% surcharges, so the average is 25% higher.
  assert.equal(roadTax(old), round2(roadTax(young) * 1.25));
});
