import test from "node:test";
import assert from "node:assert/strict";
import { assessDecision, referenceScenario } from "./correctness.mjs";
import { calculateDecision } from "../src/decision-engine.mjs";

const inputs = { insurer: "income", currentPremium: 1000, currentNcd: 50,
  excess: 500, repairCost: 1700, horizonYears: 3, baseGrowthRate: 0, discountRate: 0 };
const expected = { effectiveExcess: 500, selfPayNcd: [50,50,50], claimNcd: [20,30,40] };

test("independent cash-flow reference matches a manually calculated equality", () => {
  const reference = referenceScenario(inputs, expected, 0);
  assert.equal(reference.selfFuture, 3000);
  assert.equal(reference.claimFuture, 4200);
  assert.equal(reference.breakEven, 1700);
  assert.equal(reference.difference, 0);
  assessDecision(calculateDecision(inputs), inputs, expected);
});

test("assessment rejects a corrupted amount even when the recommendation is unchanged", () => {
  const decision = calculateDecision(inputs);
  decision.scenarios[0].claimTotal += 100;
  assert.throws(() => assessDecision(decision, inputs, expected), /claimTotal/);
});
