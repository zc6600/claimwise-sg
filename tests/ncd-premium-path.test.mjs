import test from "node:test";
import assert from "node:assert/strict";
import { calculateDecision } from "../src/decision-engine.mjs";
import {
  buildPremiumPath,
  claimPremiumLossPresentValue,
  isNcdProtectorEligible,
  meetsProtectorMinimum,
  ncdAfterStepDown,
  nextNcd,
  renewalPremium,
  stepDownNcd,
} from "../src/ncd/premium-path.mjs";

test("NCD steps up one tier per claim-free renewal and is capped at 50%", () => {
  assert.equal(nextNcd(0), 10);
  assert.equal(nextNcd(20), 30);
  assert.equal(nextNcd(50), 50);
  assert.equal(ncdAfterStepDown(50, "other"), 20);
  assert.equal(ncdAfterStepDown(20, "other"), 0);
  assert.equal(isNcdProtectorEligible({ insurer: "other", currentNcd: 50 }), true);
  assert.equal(isNcdProtectorEligible({ insurer: "other", currentNcd: 40 }), false);

  const path = buildPremiumPath({
    basePremium: 2000,
    startingNcd: 20,
    horizonYears: 5,
    growthRate: 0,
    discountRate: 0,
  });
  assert.deepEqual(path.map((year) => year.ncd), [20, 30, 40, 50, 50]);
  assert.deepEqual(path.map((year) => year.premium), [1600, 1400, 1200, 1000, 1000]);
});

test("claim premium loss matches the claim calculator's premium difference", () => {
  const inputs = {
    insurer: "income",
    currentPremium: 1650,
    currentNcd: 50,
    horizonYears: 5,
    baseGrowthRate: 4,
    discountRate: 3,
    liability: "at_fault",
  };
  const { baseScenario } = calculateDecision(inputs);
  const loss = claimPremiumLossPresentValue({
    currentPremium: 1650,
    currentNcd: 50,
    insurer: "income",
    horizonYears: 5,
    growthRate: 4,
    discountRate: 3,
  });
  assert.equal(
    loss,
    baseScenario.claimFutureDiscounted - baseScenario.selfPayFutureDiscounted
  );
  assert.equal(
    claimPremiumLossPresentValue({ currentPremium: 0, currentNcd: 50, horizonYears: 5, growthRate: 0, discountRate: 0 }),
    0
  );
});

test("step-down, protector minimum, and loadings follow the stated profile terms", () => {
  assert.equal(stepDownNcd(40, 30), 10);
  assert.equal(stepDownNcd(10, 30), 0);
  assert.equal(meetsProtectorMinimum(50, { minNcdForProtector: 50 }), true);
  assert.equal(meetsProtectorMinimum(40, { minNcdForProtector: 30 }), true);
  assert.equal(meetsProtectorMinimum(40, {}), false);

  // S$2,000 gross at 20% NCD, one year of 10% growth, then 15% and 25% loadings.
  assert.equal(Math.round(renewalPremium(2000, 20, 10, 1, [15, 25]) * 100) / 100, 2530);
  assert.equal(renewalPremium(2000, 50, 0, 3), 1000);
});
