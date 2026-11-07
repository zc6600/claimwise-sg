import test from "node:test";
import assert from "node:assert/strict";
import { calculateDecision } from "../src/decision-engine.mjs";
import { computeConsecutiveClaimStressTest } from "../lib/stress-test-calculator.js";

test("consecutive claim stress test models severe NCD reduction to 0% and 25% loading when Incident 1 is claimed", () => {
  const decision = calculateDecision({
    insurer: "income",
    currentPremium: 1650,
    currentNcd: 50,
    excess: 600,
    repairCost: 1500,
    horizonYears: 3,
    baseGrowthRate: 5,
    discountRate: 3,
    ncdProtector: false,
    liability: "at_fault",
  });

  const stressResult = computeConsecutiveClaimStressTest(decision, {
    secondRepairCost: 1500,
    consecutiveLoadingPct: 25,
  });

  // When Incident 1 was claimed, Year 1 NCD was 20%. Second incident reduces NCD to 0% in Year 2.
  assert.equal(stressResult.claimYear2Ncd, 0);

  // When Incident 1 was self-paid, loss record was clean. Second incident drops NCD only to 20% in Year 2.
  assert.equal(stressResult.selfPayYear2Ncd, 20);

  // Claim path Year 2 applies the 25% consecutive claim loading
  assert.equal(stressResult.claimSchedule[1].loadingPct, 25);
  // Self-pay path Year 2 applies 0% consecutive loading (first claim on insurer record)
  assert.equal(stressResult.selfPaySchedule[1].loadingPct, 0);

  // Self-paying Incident 1 generates a substantial positive resilience buffer
  assert.ok(
    stressResult.resilienceBuffer > 0,
    `Resilience buffer should be positive, got ${stressResult.resilienceBuffer}`
  );
  assert.equal(stressResult.recommendedOption, "self-pay");
});

test("consecutive claim stress test preserves NCD for second claim if NCD Protector was intact on self-pay route", () => {
  const decision = calculateDecision({
    insurer: "income",
    currentPremium: 1650,
    currentNcd: 50,
    excess: 600,
    repairCost: 1800,
    horizonYears: 3,
    ncdProtector: true, // eligible at 50%
    liability: "at_fault",
  });

  const stressResult = computeConsecutiveClaimStressTest(decision, {
    secondRepairCost: 1500,
  });

  // On claim path: Protector was exhausted on Incident 1. Incident 2 drops NCD to 20% in Year 2.
  assert.equal(stressResult.claimYear2Ncd, 20);

  // On self-pay path: Protector was NEVER used on Incident 1. It absorbs Incident 2, keeping NCD at 50%!
  assert.equal(stressResult.selfPayYear2Ncd, 50);

  // Future premiums on self-pay path are substantially lower
  assert.ok(stressResult.selfPayFutureDiscounted < stressResult.claimFutureDiscounted);
});

test("computeConsecutiveClaimStressTest safely handles custom parameters and invalid input objects", () => {
  assert.throws(
    () => computeConsecutiveClaimStressTest(null),
    TypeError
  );

  assert.throws(
    () => computeConsecutiveClaimStressTest({}),
    TypeError
  );

  const decision = calculateDecision({
    currentPremium: 3200,
    excess: 1500,
    repairCost: 2000,
    vehicleUsage: "phv",
    commercialClaimLoading: 15,
  });

  const customStress = computeConsecutiveClaimStressTest(decision, {
    secondRepairCost: 3000,
    consecutiveLoadingPct: 30,
  });

  assert.equal(customStress.secondRepairCost, 3000);
  assert.equal(customStress.consecutiveLoadingPct, 30);
  // PHV commercial loading (15%) + consecutive loading (30%) = 45% in Year 2
  assert.equal(customStress.claimSchedule[1].loadingPct, 45);
});

test("non-fault Incident 1 does not trigger 2-claim consecutive loading upon Incident 2", () => {
  const decision = calculateDecision({
    insurer: "income",
    currentPremium: 1650,
    currentNcd: 50,
    excess: 600,
    repairCost: 3500,
    liability: "non_fault", // 100% subrogated under GIA knock-for-knock
  });

  const stressResult = computeConsecutiveClaimStressTest(decision, {
    secondRepairCost: 2000,
    consecutiveLoadingPct: 25,
  });

  // Incident 1 was non-fault, so claiming it logged 0 at-fault claims with insurer.
  // When Incident 2 occurs, it is only 1 at-fault claim, hence consecutive loading must be 0%.
  assert.equal(stressResult.incident1IsAtFault, false);
  assert.equal(stressResult.claimTriggersConsecutiveLoading, false);
  assert.equal(stressResult.claimSchedule[1].consecutiveLoadingPct, 0);
  assert.equal(stressResult.claimSchedule[1].loadingPct, 0);
});

test("third-party at-fault claim on Incident 1 consumes NCD protector even if own damage is self-paid", () => {
  const decision = calculateDecision({
    insurer: "income",
    currentPremium: 1650,
    currentNcd: 50,
    excess: 600,
    repairCost: 1200,
    ncdProtector: true,
    liability: "at_fault",
    thirdPartyClaim: true, // Third-party claimed against insured
  });

  const stressResult = computeConsecutiveClaimStressTest(decision, {
    secondRepairCost: 1500,
  });

  // Insurer paid third party in Incident 1, consuming the single annual protector.
  // On self-pay path, protector is no longer available to shield Incident 2!
  // Therefore, Year 2 NCD drops from 50% to 20%.
  assert.equal(stressResult.selfPayYear2Ncd, 20);
});

test("initial 0% NCD maintains lower bound clamping across consecutive claims without negative NCD", () => {
  const decision = calculateDecision({
    insurer: "income",
    currentPremium: 2500,
    currentNcd: 0,
    excess: 1000,
    repairCost: 2000,
    ncdProtector: false,
    liability: "at_fault",
  });

  const stressResult = computeConsecutiveClaimStressTest(decision, {
    secondRepairCost: 1500,
    consecutiveLoadingPct: 25,
  });

  assert.equal(stressResult.claimYear2Ncd, 0);
  assert.equal(stressResult.selfPayYear2Ncd, 0);
  assert.equal(stressResult.claimSchedule[1].consecutiveLoadingPct, 25);
  // Premium is calculated with 0% NCD and 25% consecutive loading
  assert.ok(stressResult.claimSchedule[1].premium > 2500);
});
