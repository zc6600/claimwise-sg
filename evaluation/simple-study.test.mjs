import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateDecision } from "../src/decision-engine.mjs";
import { assessDecision, referenceScenario } from "./correctness.mjs";

const design = JSON.parse(await readFile(new URL("./simple_study_scenarios.json", import.meta.url)));
const expectedPaths = {
  effectiveExcess: 600,
  selfPayNcd: design.assumptions.self_pay_ncd,
  claimNcd: design.assumptions.claim_ncd,
};

for (const scenario of design.scenarios) {
  test(`short-study scenario ${scenario.id} matches its frozen independent cost answer`, () => {
    const reference = referenceScenario(scenario.inputs, expectedPaths, 5);
    for (const [field, actual] of Object.entries({
      selfPayTotal: reference.selfTotal,
      claimTotal: reference.claimTotal,
      breakEvenRepairCost: reference.breakEven,
    })) {
      assert.ok(Math.abs(actual - scenario.expected[field]) < 0.05, field);
    }
    const decision = calculateDecision(scenario.inputs);
    assessDecision(decision, scenario.inputs, expectedPaths);
    assert.equal(decision.recommendation, scenario.expected.decision);
    assert.equal(decision.baseScenario.selfPayTotal, scenario.expected.selfPayTotal);
    assert.equal(decision.baseScenario.claimTotal, scenario.expected.claimTotal);
  });
}
