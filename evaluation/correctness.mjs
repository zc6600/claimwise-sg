import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { calculateDecision } from "../src/decision-engine.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// Expected renewal schedules are maintained independently of the engine's rule helpers.
export function referenceScenario(inputs, expected, growthRate) {
  const gross = inputs.currentPremium / (1 - inputs.currentNcd / 100);
  const path = (schedule) => schedule.map((ncd, index) => {
    const premium = gross * (1 - ncd / 100) * (1 + growthRate / 100) ** (index + 1);
    return { ncd, premium, presentValue: premium / (1 + (inputs.discountRate ?? 3) / 100) ** (index + 1) };
  });
  const self = path(expected.selfPayNcd);
  const claim = path(expected.claimNcd);
  const total = (years, field) => years.reduce((sum, year) => sum + year[field], 0);
  const selfFuture = total(self, "presentValue");
  const claimFuture = total(claim, "presentValue");
  const selfTotal = inputs.repairCost + selfFuture;
  const claimTotal = Math.min(inputs.repairCost, expected.effectiveExcess) + claimFuture;
  return { self, claim, selfFuture, claimFuture, selfTotal, claimTotal,
    selfNominal: total(self, "premium"), claimNominal: total(claim, "premium"),
    breakEven: expected.effectiveExcess + claimFuture - selfFuture,
    difference: selfTotal - claimTotal };
}

export function assessDecision(decision, inputs, expected) {
  const near = (actual, target, field) => {
    assert.ok(Number.isFinite(actual) && Math.abs(actual - target) <= 0.05,
      `${field}: expected ${target}, received ${actual}`);
  };
  assert.equal(decision.effectiveExcess, expected.effectiveExcess);
  assert.equal(decision.claimNcdAfter, expected.claimNcd[0]);
  assert.equal(decision.selfPayNcdAfter, expected.selfPayNcd[0]);
  assert.equal(decision.isBelowExcess, inputs.repairCost <= expected.effectiveExcess);
  assert.equal(decision.scenarios.length, 3);
  const baseGrowth = inputs.baseGrowthRate ?? 5;
  const rates = [Math.max(-20, baseGrowth - 5), baseGrowth, Math.min(50, baseGrowth + 5)];
  for (const [index, scenario] of decision.scenarios.entries()) {
    const reference = referenceScenario(inputs, expected, rates[index]);
    assert.equal(scenario.growthRate, rates[index]);
    for (const [actual, schedule, years] of [
      [scenario.selfPayYears, expected.selfPayNcd, reference.self],
      [scenario.claimYears, expected.claimNcd, reference.claim],
    ]) {
      assert.deepEqual(actual.map((year) => year.ncd), schedule);
      actual.forEach((year, yearIndex) => {
        assert.equal(year.year, yearIndex + 1);
        near(year.premium, years[yearIndex].premium, "annual premium");
        near(year.discountedPremium, years[yearIndex].presentValue, "discounted annual premium");
      });
    }
    for (const [field, target] of Object.entries({
      selfPayFuturePremium: reference.selfNominal, claimFuturePremium: reference.claimNominal,
      selfPayFutureDiscounted: reference.selfFuture, claimFutureDiscounted: reference.claimFuture,
      selfPayTotal: reference.selfTotal, claimTotal: reference.claimTotal,
      breakEvenRepairCost: reference.breakEven, difference: reference.difference,
      currentClaimCost: Math.min(inputs.repairCost, expected.effectiveExcess),
    })) near(scenario[field], target, field);
    const recommendation = money(reference.difference) > 0 ? "claim" : "self-pay";
    assert.equal(scenario.recommendedOption, recommendation);
  }
  assert.deepEqual(decision.baseScenario, decision.scenarios[1]);
  const baseReference = referenceScenario(inputs, expected, baseGrowth);
  const recommendation = inputs.repairCost <= expected.effectiveExcess || money(baseReference.difference) <= 0 ? "self-pay" : "claim";
  assert.equal(decision.recommendation, recommendation);
  assert.ok(Array.isArray(decision.clauseAudit) && decision.clauseAudit.length >= 6);
  for (const clause of decision.clauseAudit) {
    for (const field of ["id", "clauseRef", "rationale", "illustrativeText"]) assert.ok(clause[field]);
  }
}

async function apiRequest(baseUrl, body) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/decision`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, payload: await response.json() };
}

async function main() {
  const { values } = parseArgs({ options: {
    "base-url": { type: "string" }, "output-root": { type: "string", default: resolve(root, "evaluation/results") },
  } });
  const fixtures = JSON.parse(await readFile(resolve(root, "tests/fixtures/benchmark_cases.json"), "utf8"));
  const paths = JSON.parse(await readFile(new URL("./expected_paths.json", import.meta.url), "utf8"));
  assert.deepEqual(fixtures.map((item) => item.id), paths.map((item) => item.id), "Fixture IDs and expected paths must match");
  const cases = fixtures.map((item, index) => ({ ...item, path: paths[index] }));
  const base = { ...fixtures[0].inputs, workshopType: "authorized", youngDriverInvolved: false, repairType: "general" };
  const extras = [
    ["ETIQA-PROTECTOR-40", { insurer: "etiqa", currentNcd: 40, ncdProtector: true }, 600, [40,50,50], [40,50,50]],
    ["INCOME-PROTECTOR-INELIGIBLE", { currentNcd: 40, ncdProtector: true }, 600, [40,50,50], [10,20,30]],
    ["WINDSCREEN-THIRD-PARTY", { repairType: "windscreen", thirdPartyClaim: true }, 100, [20,30,40], [20,30,40]],
    ["WINDSCREEN-PROTECTED", { repairType: "windscreen", thirdPartyClaim: true, ncdProtector: true }, 100, [50,50,50], [50,50,50]],
    ["BREAK-EVEN-TIE", { currentPremium: 1000, excess: 500, repairCost: 1700, baseGrowthRate: 0, discountRate: 0 }, 500, [50,50,50], [20,30,40]],
  ];
  for (const [id, changes, effectiveExcess, selfPayNcd, claimNcd] of extras) {
    cases.push({ id, inputs: { ...base, ...changes }, path: { effectiveExcess, selfPayNcd, claimNcd } });
  }
  const runDir = resolve(values["output-root"], `correctness-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0,8)}`);
  await mkdir(runDir, { recursive: true });
  const results = [];
  for (const item of cases) {
    const started = performance.now();
    let decision;
    try {
      if (values["base-url"]) {
        const response = await apiRequest(values["base-url"], { inputs: item.inputs, persist: false });
        assert.equal(response.status, 200);
        assert.equal(response.payload.ok, true);
        assert.equal(response.payload.meta.persisted, false);
        decision = response.payload.decision;
      } else decision = calculateDecision(item.inputs);
      assessDecision(decision, item.inputs, item.path);
      results.push({ id: item.id, passed: true, durationMs: performance.now() - started, decision });
    } catch (error) {
      results.push({ id: item.id, passed: false, durationMs: performance.now() - started, error: error.message, decision });
    }
  }
  if (values["base-url"]) {
    const invalid = [
      ["MALFORMED-JSON", "{", 400], ["ARRAY-BODY", [], 400],
      ["ZERO-PREMIUM", { ...base, currentPremium: 0 }, 400],
      ["NEGATIVE-EXCESS", { ...base, excess: -1 }, 400],
      ["INVALID-NCD", { ...base, currentNcd: 25 }, 400],
      ["INVALID-INSURER", { ...base, insurer: "unsupported" }, 400],
      ["INVALID-HORIZON", { ...base, horizonYears: 4 }, 400],
      ["OVERSIZED-BODY", JSON.stringify({ padding: "x".repeat(17000) }), 413],
    ];
    for (const [id, body, status] of invalid) {
      try {
        const result = await apiRequest(values["base-url"], body);
        assert.equal(result.status, status);
        assert.equal(result.payload.ok, false);
        results.push({ id, passed: true });
      } catch (error) { results.push({ id, passed: false, error: error.message }); }
    }
  }
  const report = { generatedAt: new Date().toISOString(), mode: values["base-url"] ? "http" : "engine",
    baseUrl: values["base-url"] || null, nodeVersion: process.version,
    scope: "Configured-rule correctness and independent cash-flow checks; not external verification of policy terms.",
    total: results.length, passed: results.filter((item) => item.passed).length, results };
  await writeFile(resolve(runDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(resolve(runDir, "summary.md"), `# Decision correctness\n\n${report.passed}/${report.total} checks passed (${report.mode}).\n\n` +
    results.map((item) => `- ${item.passed ? "PASS" : "FAIL"}: ${item.id}${item.error ? `: ${item.error}` : ""}`).join("\n") + "\n");
  console.log(`${report.passed}/${report.total} checks passed; artifacts: ${runDir}`);
  if (report.passed !== report.total) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
