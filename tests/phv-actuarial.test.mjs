import test from "node:test";
import assert from "node:assert/strict";
import { calculateDecision, normalizeInputs } from "../src/decision-engine.mjs";
import { PHV_DEFAULTS, VEHICLE_USAGES } from "../src/decision-data.mjs";
import { validateDecisionInputs } from "../app/api/decision/route.js";

test("normalizeInputs initializes standard private vehicle defaults with zero commercial loadings", () => {
  const norm = normalizeInputs({ currentPremium: 1650, excess: 600, repairCost: 1200 });
  assert.equal(norm.vehicleUsage, VEHICLE_USAGES.PRIVATE);
  assert.equal(norm.commercialClaimLoading, 0);
  assert.equal(norm.dailyDowntimeCost, 0);
  assert.equal(norm.claimDowntimeDays, 0);
  assert.equal(norm.selfPayDowntimeDays, 0);
});

test("normalizeInputs initializes PHV commercial defaults when vehicleUsage is phv", () => {
  const norm = normalizeInputs({
    vehicleUsage: VEHICLE_USAGES.PHV,
    currentPremium: 3200,
    excess: 1500,
  });
  assert.equal(norm.vehicleUsage, VEHICLE_USAGES.PHV);
  assert.equal(norm.commercialClaimLoading, PHV_DEFAULTS.defaultCommercialLoading);
  assert.equal(norm.dailyDowntimeCost, PHV_DEFAULTS.defaultDailyDowntimeCost);
  assert.equal(norm.claimDowntimeDays, PHV_DEFAULTS.defaultClaimDowntimeDays);
  assert.equal(norm.selfPayDowntimeDays, PHV_DEFAULTS.defaultSelfPayDowntimeDays);
});

test("PHV at-fault claim route applies commercial claim loading and downtime loss-of-use", () => {
  const decision = calculateDecision({
    vehicleUsage: "phv",
    insurer: "income",
    currentPremium: 3200,
    currentNcd: 50,
    excess: 1500,
    repairCost: 2000,
    horizonYears: 3,
    baseGrowthRate: 5,
    discountRate: 3,
    commercialClaimLoading: 15,
    dailyDowntimeCost: 80,
    claimDowntimeDays: 5,
    selfPayDowntimeDays: 1,
    liability: "at_fault",
  });

  const baseScenario = decision.baseScenario;

  // Downtime costs: 5 * 80 = 400, 1 * 80 = 80, net = 320
  assert.equal(baseScenario.claimDowntimeCost, 400);
  assert.equal(baseScenario.selfPayDowntimeCost, 80);
  assert.equal(baseScenario.netDowntimeCost, 320);

  // Day 0 outflows include repair/excess plus downtime
  assert.equal(baseScenario.selfPayDay0Cost, 2080); // 2000 repair + 80 downtime
  assert.equal(baseScenario.claimDay0Cost, 1900); // 1500 excess + 400 downtime

  // Claim renewal premiums reflect the 15% commercial loading
  assert.equal(baseScenario.claimYears[0].commercialLoading, 15);
  assert.equal(baseScenario.selfPayYears[0].commercialLoading, 0);

  // Break-even threshold includes effective excess + PV renewal difference + net downtime cost
  const pvRenewalDifference =
    baseScenario.claimFutureDiscounted - baseScenario.selfPayFutureDiscounted;
  assert.equal(
    baseScenario.breakEvenRepairCost,
    Math.round((1500 + pvRenewalDifference + 320) * 100) / 100
  );

  // Clause audit includes PHV commercial terms
  const phvClause = decision.clauseAudit.find((c) => c.id === "phv_commercial_terms");
  assert.ok(phvClause, "PHV commercial terms entry should exist in clauseAudit");
  assert.equal(phvClause.status, "active");
});

test("PHV 100% non-fault claim preserves NCD and incurs zero commercial loading", () => {
  const decision = calculateDecision({
    vehicleUsage: "phv",
    insurer: "income",
    currentPremium: 3200,
    currentNcd: 50,
    excess: 1500,
    repairCost: 2500,
    liability: "non_fault",
    commercialClaimLoading: 15,
  });

  assert.equal(decision.claimNcdAfter, 50);
  assert.equal(decision.baseScenario.claimYears[0].commercialLoading, 0);
});

test("third-party claim against PHV driver triggers commercial loading on self-pay path", () => {
  const decision = calculateDecision({
    vehicleUsage: "phv",
    currentPremium: 3200,
    currentNcd: 50,
    excess: 1500,
    repairCost: 2000,
    thirdPartyClaim: true,
    liability: "at_fault",
    commercialClaimLoading: 15,
  });

  // Because third party files a claim and driver is at fault, insurer settles,
  // triggering commercial claim loading even if driver self-pays own repair
  assert.equal(decision.baseScenario.selfPayYears[0].commercialLoading, 15);
  assert.equal(decision.baseScenario.claimYears[0].commercialLoading, 15);
});

test("API route validation enforces vehicleUsage and commercial parameters constraints", () => {
  const baseValid = {
    currentPremium: 3200,
    excess: 1500,
    repairCost: 2000,
  };

  // Invalid vehicleUsage
  assert.deepEqual(
    validateDecisionInputs({ ...baseValid, vehicleUsage: "invalid_type" }),
    { field: "vehicleUsage", message: "vehicleUsage must be one of private, phv." }
  );

  // Invalid commercialClaimLoading (< 0 or > 100)
  assert.deepEqual(
    validateDecisionInputs({ ...baseValid, commercialClaimLoading: 120 }),
    { field: "commercialClaimLoading", message: "commercialClaimLoading must be a percentage between 0 and 100." }
  );

  // Invalid dailyDowntimeCost (< 0 or > 5000)
  assert.deepEqual(
    validateDecisionInputs({ ...baseValid, dailyDowntimeCost: -50 }),
    { field: "dailyDowntimeCost", message: "dailyDowntimeCost must be a number between S$0 and S$5,000." }
  );

  // Invalid claimDowntimeDays (> 60)
  assert.deepEqual(
    validateDecisionInputs({ ...baseValid, claimDowntimeDays: 90 }),
    { field: "claimDowntimeDays", message: "claimDowntimeDays must be a number of days between 0 and 60." }
  );

  // Valid PHV parameters
  assert.equal(
    validateDecisionInputs({
      ...baseValid,
      vehicleUsage: "phv",
      commercialClaimLoading: 15,
      dailyDowntimeCost: 80,
      claimDowntimeDays: 5,
      selfPayDowntimeDays: 1,
    }),
    null
  );
});

test("break-even threshold is strictly bounded below by effectiveExcess even when repair is below excess", () => {
  const decision = calculateDecision({
    vehicleUsage: "phv",
    currentPremium: 3200,
    currentNcd: 50,
    excess: 1500,
    repairCost: 800, // strictly below excess
    dailyDowntimeCost: 0,
    liability: "non_fault",
  });

  assert.equal(decision.isBelowExcess, true);
  assert.equal(decision.recommendation, "self-pay");
  assert.ok(
    decision.baseScenario.breakEvenRepairCost >= decision.effectiveExcess,
    "Break-even threshold should never drop below effective excess"
  );
});

test("PHV with zero downtime cost preserves actuarial continuity", () => {
  const decision = calculateDecision({
    vehicleUsage: "phv",
    currentPremium: 3200,
    currentNcd: 50,
    excess: 1500,
    repairCost: 2500,
    dailyDowntimeCost: 0,
    claimDowntimeDays: 5,
    selfPayDowntimeDays: 1,
  });

  assert.equal(decision.baseScenario.claimDowntimeCost, 0);
  assert.equal(decision.baseScenario.selfPayDowntimeCost, 0);
  assert.equal(decision.baseScenario.netDowntimeCost, 0);
  assert.equal(decision.baseScenario.selfPayDay0Cost, 2500);
  assert.equal(decision.baseScenario.claimDay0Cost, 1500);
});
