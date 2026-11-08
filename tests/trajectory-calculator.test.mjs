import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCumulativeTrajectory,
  findTrajectoryCrossover,
  computeNcdTrajectory,
} from "../src/trajectory-calculator.mjs";
import { calculateDecision } from "../src/decision-engine.mjs";

const sampleInputs = {
  insurer: "income",
  currentPremium: 1650,
  currentNcd: 50,
  excess: 600,
  repairCost: 1800,
  horizonYears: 3,
  discountRate: 3,
  baseGrowthRate: 5,
  liability: "at_fault",
  ncdProtector: false,
};

test("computeCumulativeTrajectory builds cumulative present-value data points from Day 0", () => {
  const decision = calculateDecision(sampleInputs);
  const points = computeCumulativeTrajectory(
    decision.baseScenario,
    decision.inputs,
    decision.effectiveExcess
  );

  assert.equal(points.length, 4); // Day 0, Year 1, Year 2, Year 3

  // Day 0 checks
  assert.equal(points[0].year, 0);
  assert.equal(points[0].selfPayOutflow, 1800);
  assert.equal(points[0].claimOutflow, 600); // Excess is 600

  // Monotonically increasing cumulative outflow
  for (let i = 1; i < points.length; i += 1) {
    assert.ok(points[i].selfPayOutflow > points[i - 1].selfPayOutflow);
    assert.ok(points[i].claimOutflow > points[i - 1].claimOutflow);
  }

  // Final point matches baseScenario totals
  const finalPoint = points[points.length - 1];
  assert.equal(finalPoint.selfPayOutflow, Math.round(decision.baseScenario.selfPayTotal));
  assert.equal(finalPoint.claimOutflow, Math.round(decision.baseScenario.claimTotal));
});

test("computeCumulativeTrajectory safely rejects mismatched or malformed scenario arrays", () => {
  assert.deepEqual(computeCumulativeTrajectory(null, {}, 600), []);
  assert.deepEqual(
    computeCumulativeTrajectory(
      { selfPayYears: [{ year: 1 }], claimYears: [] }, // Length mismatch
      {},
      600
    ),
    []
  );
  assert.deepEqual(
    computeCumulativeTrajectory(
      { selfPayYears: [{ year: 1 }], claimYears: [{ year: 2 }] }, // Year mismatch
      {},
      600
    ),
    []
  );
});

test("findTrajectoryCrossover accurately detects when claim cumulative cost overtakes self-pay", () => {
  const decision = calculateDecision(sampleInputs);
  const points = computeCumulativeTrajectory(
    decision.baseScenario,
    decision.inputs,
    decision.effectiveExcess
  );

  const crossover = findTrajectoryCrossover(points);
  assert.equal(crossover.hasCrossover, true);
  assert.equal(crossover.status, "claim_exceeds");
  assert.equal(crossover.crossoverYear, 2);
  assert.ok(crossover.description.includes("Year 2"));
});

test("findTrajectoryCrossover detects exact break-even point", () => {
  const points = [
    { year: 0, selfPayOutflow: 1000, claimOutflow: 500 },
    { year: 1, selfPayOutflow: 1500, claimOutflow: 1500 }, // Exact equality
    { year: 2, selfPayOutflow: 2000, claimOutflow: 2500 },
  ];
  const crossover = findTrajectoryCrossover(points);
  assert.equal(crossover.hasCrossover, true);
  assert.equal(crossover.status, "exact_breakeven");
  assert.equal(crossover.crossoverYear, 1);
  assert.ok(crossover.description.includes("exact break-even"));
});

test("findTrajectoryCrossover detects immediate self-pay advantage when repair is below excess", () => {
  const lowRepairInputs = { ...sampleInputs, repairCost: 400 };
  const decision = calculateDecision(lowRepairInputs);
  const points = computeCumulativeTrajectory(
    decision.baseScenario,
    decision.inputs,
    decision.effectiveExcess
  );

  const crossover = findTrajectoryCrossover(points);
  assert.equal(crossover.hasCrossover, false);
  assert.equal(crossover.status, "self_pay_cheaper");
  assert.equal(crossover.crossoverYear, 0);
  assert.ok(crossover.description.includes("Day 0"));
});

test("findTrajectoryCrossover handles insufficient data or empty array gracefully", () => {
  assert.equal(findTrajectoryCrossover([]).hasCrossover, false);
  assert.equal(findTrajectoryCrossover([{ year: 0 }]).hasCrossover, false);
});

test("computeNcdTrajectory tracks NCD step-down and annual recovery steps", () => {
  const decision = calculateDecision(sampleInputs);
  const ncdPath = computeNcdTrajectory(decision.baseScenario, decision.inputs);

  assert.equal(ncdPath.length, 4);
  assert.equal(ncdPath[0].selfPayNcd, 50);
  assert.equal(ncdPath[0].claimNcd, 50);

  // Year 1: Self-pay maintains 50%, Claim dropped 30% down to 20%
  assert.equal(ncdPath[1].selfPayNcd, 50);
  assert.equal(ncdPath[1].claimNcd, 20);

  // Year 2: Self-pay 50%, Claim recovers 10% to 30%
  assert.equal(ncdPath[2].selfPayNcd, 50);
  assert.equal(ncdPath[2].claimNcd, 30);

  // Year 3: Self-pay 50%, Claim recovers 10% to 40%
  assert.equal(ncdPath[3].selfPayNcd, 50);
  assert.equal(ncdPath[3].claimNcd, 40);
});

test("computeNcdTrajectory clamps out-of-range NCD values", () => {
  const customScenario = {
    selfPayYears: [{ year: 1, ncd: 90 }],
    claimYears: [{ year: 1, ncd: -10 }],
  };
  const path = computeNcdTrajectory(customScenario, { currentNcd: 70 });
  assert.equal(path[0].selfPayNcd, 50); // Clamped from 70 to 50
  assert.equal(path[1].selfPayNcd, 50); // Clamped from 90 to 50
  assert.equal(path[1].claimNcd, 0);   // Clamped from -10 to 0
});
