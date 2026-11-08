import test from "node:test";
import assert from "node:assert/strict";
import { calculateDecision } from "../src/decision-engine.mjs";
import { isNcdProtectorEligible } from "../src/ncd/premium-path.mjs";

const baseInputs = {
  insurer: "income",
  currentPremium: 1650,
  currentNcd: 50,
  excess: 600,
  repairCost: 1200,
  horizonYears: 3,
  baseGrowthRate: 5,
  ncdProtector: false,
};

test("calculates a three-year comparison and a recommendation", () => {
  const result = calculateDecision(baseInputs);

  assert.equal(result.inputs.horizonYears, 3);
  assert.equal(result.scenarios.length, 3);
  assert.equal(result.baseScenario.selfPayYears.length, 3);
  assert.equal(result.baseScenario.claimYears.length, 3);
  assert.equal(result.claimNcdAfter, 20);
  assert.ok(result.baseScenario.selfPayTotal > 0);
  assert.ok(result.baseScenario.claimTotal > 0);
  assert.ok(["claim", "self-pay"].includes(result.recommendation));
});

test("NCD Protector preserves the current NCD in the claim path", () => {
  const result = calculateDecision({ ...baseInputs, ncdProtector: true });

  assert.equal(result.claimNcdAfter, 50);
  assert.equal(result.baseScenario.claimYears[0].ncd, 50);
  assert.equal(result.baseScenario.claimYears[1].ncd, 50);
});

test("NCD Protector is ineffective when current NCD is below insurer minNcdForProtector", () => {
  // Income requires min 50% NCD for protector
  const incomeUnderThreshold = calculateDecision({
    ...baseInputs,
    insurer: "income",
    currentNcd: 40,
    ncdProtector: true,
  });
  // Should drop by 30% from 40 to 10 despite ncdProtector: true
  assert.equal(incomeUnderThreshold.claimNcdAfter, 10);
  const incomeProtectorAudit = incomeUnderThreshold.clauseAudit.find(
    (c) => c.id === "ncd_protector_rider"
  );
  assert.equal(incomeProtectorAudit.status, "warning");
  assert.equal(incomeProtectorAudit.statusLabel, "Eligibility Threshold Not Met");

  const incomeStepDownAudit = incomeUnderThreshold.clauseAudit.find(
    (c) => c.id === "ncd_step_down"
  );
  assert.equal(incomeStepDownAudit.status, "active");
  assert.equal(incomeStepDownAudit.value, "-30% (40% → 10%)");

  // Etiqa allows 40% NCD for protector
  const etiqaEligible = calculateDecision({
    ...baseInputs,
    insurer: "etiqa",
    currentNcd: 40,
    ncdProtector: true,
  });
  // Should be preserved at 40
  assert.equal(etiqaEligible.claimNcdAfter, 40);
  const etiqaProtectorAudit = etiqaEligible.clauseAudit.find(
    (c) => c.id === "ncd_protector_rider"
  );
  assert.equal(etiqaProtectorAudit.status, "active");
  assert.equal(etiqaProtectorAudit.statusLabel, "Rider Active");

  const etiqaStepDownAudit = etiqaEligible.clauseAudit.find(
    (c) => c.id === "ncd_step_down"
  );
  assert.equal(etiqaStepDownAudit.status, "protected");
  assert.equal(etiqaStepDownAudit.value, "0% (Shielded / Protected)");

  // Etiqa with 30% NCD is below 40% threshold
  const etiqaUnderThreshold = calculateDecision({
    ...baseInputs,
    insurer: "etiqa",
    currentNcd: 30,
    ncdProtector: true,
  });
  // 30% docks to 0%
  assert.equal(etiqaUnderThreshold.claimNcdAfter, 0);

  // Helper function test
  assert.equal(isNcdProtectorEligible({ insurer: "income", currentNcd: 40 }), false);
  assert.equal(isNcdProtectorEligible({ insurer: "income", currentNcd: 50 }), true);
  assert.equal(isNcdProtectorEligible({ insurer: "etiqa", currentNcd: 40 }), true);
  assert.equal(isNcdProtectorEligible({ insurer: "etiqa", currentNcd: 30 }), false);
});

test("break-even repair cost increases when a claim loses NCD", () => {
  const withoutProtector = calculateDecision(baseInputs);
  const withProtector = calculateDecision({ ...baseInputs, ncdProtector: true });

  assert.ok(withoutProtector.baseScenario.breakEvenRepairCost > withProtector.baseScenario.breakEvenRepairCost);
});

test("normalizes invalid values without producing NaN", () => {
  const result = calculateDecision({
    currentPremium: "not-a-number",
    currentNcd: 90,
    excess: -1,
    repairCost: -200,
    horizonYears: 4,
    baseGrowthRate: 1000,
  });

  assert.equal(result.inputs.currentPremium, 0);
  assert.equal(result.inputs.currentNcd, 50);
  assert.equal(result.inputs.excess, 0);
  assert.equal(result.inputs.repairCost, 0);
  assert.equal(result.inputs.horizonYears, 3);
  assert.ok(Number.isFinite(result.baseScenario.selfPayTotal));
});

test("discountRate discounts future premiums to present value", () => {
  const undiscounted = calculateDecision({ ...baseInputs, discountRate: 0 });
  const discounted = calculateDecision({ ...baseInputs, discountRate: 5 });

  // Nominal undiscounted sum is higher than present value discounted sum
  assert.ok(undiscounted.baseScenario.claimFutureDiscounted > discounted.baseScenario.claimFutureDiscounted);
  assert.equal(undiscounted.baseScenario.claimFutureDiscounted, undiscounted.baseScenario.claimFuturePremium);
});

test("100% non-fault accident preserves NCD even when claiming", () => {
  const result = calculateDecision({ ...baseInputs, liability: "non_fault" });

  assert.equal(result.claimNcdAfter, 50);
  assert.ok(result.advisories.some((a) => a.type === "success"));
});

test("third-party claim reduces self-pay NCD if insured is at-fault", () => {
  const normalSelfPay = calculateDecision(baseInputs);
  const thirdPartyClaim = calculateDecision({
    ...baseInputs,
    thirdPartyClaim: true,
    liability: "at_fault",
  });

  assert.equal(normalSelfPay.selfPayNcdAfter, 50);
  assert.equal(thirdPartyClaim.selfPayNcdAfter, 20); // 50 - 30 drop
  assert.ok(thirdPartyClaim.advisories.some((a) => a.title.includes("Third-party claim")));
});

test("repair cost below or equal to excess flags isBelowExcess and recommends self-pay", () => {
  const result = calculateDecision({ ...baseInputs, repairCost: 500, excess: 600 });

  assert.equal(result.isBelowExcess, true);
  assert.equal(result.recommendation, "self-pay");
  assert.ok(result.advisories.some((a) => a.title.toLowerCase().includes("below or equal to your")));
});

test("windscreen repair applies GIA S$100 excess and preserves 50% NCD", () => {
  const result = calculateDecision({
    ...baseInputs,
    repairType: "windscreen",
    repairCost: 850,
    excess: 600,
    currentNcd: 50,
  });

  assert.equal(result.effectiveExcess, 100);
  assert.equal(result.claimNcdAfter, 50); // NCD untouched
  assert.equal(result.recommendation, "claim"); // Pay $100 vs $850
  assert.ok(result.advisories.some((a) => a.title.includes("GIA Windscreen Clause")));
});

test("windscreen excess is independent of the standard policy excess", () => {
  const result = calculateDecision({
    ...baseInputs,
    repairType: "windscreen",
    excess: 0,
  });

  assert.equal(result.effectiveExcess, 100);
});

test("at-fault third-party claim reduces NCD even when own damage is windscreen", () => {
  const result = calculateDecision({
    ...baseInputs,
    repairType: "windscreen",
    thirdPartyClaim: true,
    liability: "at_fault",
  });

  assert.equal(result.selfPayNcdAfter, 20);
  assert.equal(result.claimNcdAfter, 20);
});

test("NCD Protector still shields a third-party claim involving windscreen damage", () => {
  const result = calculateDecision({
    ...baseInputs,
    repairType: "windscreen",
    thirdPartyClaim: true,
    liability: "at_fault",
    ncdProtector: true,
  });

  assert.equal(result.selfPayNcdAfter, 50);
  assert.equal(result.claimNcdAfter, 50);
});

test("unauthorized independent workshop adds insurer-specific excess surcharge", () => {
  const incomeResult = calculateDecision({
    ...baseInputs,
    insurer: "income",
    excess: 600,
    workshopType: "independent",
  });
  const etiqaResult = calculateDecision({
    ...baseInputs,
    insurer: "etiqa",
    excess: 600,
    workshopType: "independent",
  });

  assert.equal(incomeResult.excessDetails.unauthorizedWorkshopSurcharge, 1000);
  assert.equal(incomeResult.effectiveExcess, 1600);
  assert.equal(etiqaResult.excessDetails.unauthorizedWorkshopSurcharge, 2000);
  assert.equal(etiqaResult.effectiveExcess, 2600);
});

test("young/inexperienced driver (<25yo) adds mandatory excess surcharge", () => {
  const result = calculateDecision({
    ...baseInputs,
    excess: 600,
    youngDriverInvolved: true,
  });

  assert.equal(result.excessDetails.youngDriverSurcharge, 2500);
  assert.equal(result.effectiveExcess, 3100); // 600 + 2500
  assert.ok(result.advisories.some((a) => a.title.includes("Young / Inexperienced Driver")));
});

test("MSIG young driver advisory notice specifies 23 age threshold", () => {
  const result = calculateDecision({
    ...baseInputs,
    insurer: "msig",
    youngDriverInvolved: true,
  });
  const youngAdvisory = result.advisories.find((a) =>
    a.title.includes("Young / Inexperienced Driver")
  );
  assert.ok(youngAdvisory);
  assert.ok(youngAdvisory.message.includes("under 23"));
});

test("GET /api/rules route exposes all insurer parameters and thresholds", async () => {
  const { GET } = await import("../app/api/rules/route.js");
  const res = await GET();
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.profiles.length, 5);
  const msig = data.profiles.find((p) => p.id === "msig");
  assert.equal(msig.youngDriverAgeThreshold, 23);
  assert.equal(msig.minNcdForProtector, 50);
  const etiqa = data.profiles.find((p) => p.id === "etiqa");
  assert.equal(etiqa.minNcdForProtector, 40);
});

import { POST as handleDecisionPost } from "../app/api/decision/route.js";

test("Next.js Route Handler exposes the decision engine as a JSON API", async () => {
  const request = new Request("https://claimwise-sg.example/api/decision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(baseInputs),
  });
  const response = await handleDecisionPost(request);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.meta.runtime, "nextjs-route-handler");
  assert.equal(payload.meta.persisted, false);
  assert.equal(payload.decision.inputs.repairCost, 1200);
  assert.ok(Array.isArray(payload.decision.clauseAudit));
  assert.ok(payload.decision.clauseAudit.length >= 6);
});

test("clauseAudit provides policy references and illustrative summaries for calculated figures", () => {
  const result = calculateDecision({
    ...baseInputs,
    insurer: "etiqa",
    workshopType: "independent",
    youngDriverInvolved: true,
    thirdPartyClaim: true,
  });

  assert.ok(Array.isArray(result.clauseAudit));
  assert.ok(result.clauseAudit.length >= 7);

  // Every item must have legal and contractual provenance fields
  for (const item of result.clauseAudit) {
    assert.ok(item.id, "Audit item missing id");
    assert.ok(item.dataPoint, "Audit item missing dataPoint");
    assert.ok(item.value, "Audit item missing value");
    assert.ok(item.clauseRef, "Audit item missing clauseRef");
    assert.ok(item.authority, "Audit item missing authority");
    assert.ok(item.statutoryBasis, "Audit item missing statutoryBasis");
    assert.ok(item.illustrativeText, "Audit item missing illustrativeText");
    assert.ok(item.rationale, "Audit item missing rationale");
  }

  // Check specific clause references
  const workshopItem = result.clauseAudit.find((i) => i.id === "workshop_surcharge");
  assert.ok(workshopItem);
  assert.equal(workshopItem.status, "active");
  assert.ok(workshopItem.clauseRef.includes("Clause 4.2")); // Etiqa Tiq Clause 4.2
  assert.ok(workshopItem.value.includes("2,000"));

  const thirdPartyItem = result.clauseAudit.find((i) => i.id === "third_party_liability");
  assert.ok(thirdPartyItem);
  assert.ok(thirdPartyItem.clauseRef.includes("GIA Motor Claims Framework"));

  const actuarialItem = result.clauseAudit.find((i) => i.id === "actuarial_model");
  assert.ok(actuarialItem);
  assert.ok(actuarialItem.clauseRef.includes("break-even formula"));
});

import fs from "node:fs";

test("validates all 13 Singapore benchmark cases against decision engine", () => {
  const benchmarkCases = JSON.parse(
    fs.readFileSync(new URL("./fixtures/benchmark_cases.json", import.meta.url), "utf-8")
  );

  assert.equal(benchmarkCases.length, 13);

  for (const tc of benchmarkCases) {
    const res = calculateDecision(tc.inputs);

    if (tc.expected.claimNcdAfter !== undefined) {
      assert.equal(
        res.claimNcdAfter,
        tc.expected.claimNcdAfter,
        `[${tc.id}] claimNcdAfter mismatch`
      );
    }

    if (tc.expected.selfPayNcdAfter !== undefined) {
      assert.equal(
        res.selfPayNcdAfter,
        tc.expected.selfPayNcdAfter,
        `[${tc.id}] selfPayNcdAfter mismatch`
      );
    }

    if (tc.expected.isBelowExcess !== undefined) {
      assert.equal(
        res.isBelowExcess,
        tc.expected.isBelowExcess,
        `[${tc.id}] isBelowExcess mismatch`
      );
    }

    if (tc.expected.recommendedOption !== undefined) {
      assert.equal(
        res.recommendation,
        tc.expected.recommendedOption,
        `[${tc.id}] recommendation mismatch: expected ${tc.expected.recommendedOption}, got ${res.recommendation}`
      );
    }
  }
});

test("next.config.mjs exports security headers, disabled powered-by header, and strict mode", async () => {
  const nextConfigModule = await import("../next.config.mjs");
  const config = nextConfigModule.default;

  assert.equal(config.poweredByHeader, false);
  assert.equal(config.reactStrictMode, true);
  assert.equal(typeof config.headers, "function");

  const headerRules = await config.headers();
  assert.ok(Array.isArray(headerRules));
  const globalRule = headerRules.find((rule) => rule.source === "/:path*");
  assert.ok(globalRule);

  const headerKeys = globalRule.headers.map((h) => h.key.toLowerCase());
  assert.ok(headerKeys.includes("x-frame-options"));
  assert.ok(headerKeys.includes("x-content-type-options"));
  assert.ok(headerKeys.includes("referrer-policy"));
  assert.ok(headerKeys.includes("permissions-policy"));
  assert.ok(headerKeys.includes("strict-transport-security"));
});

