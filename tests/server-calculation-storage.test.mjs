import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  POST as handleDecisionPost,
  validateDecisionInputs,
} from "../app/api/decision/route.js";
import { calculateDecision } from "../src/decision-engine.mjs";
import { buildCalculationRecord } from "../src/calculation-record.mjs";
import { getClausePdfInfo } from "../lib/clause-documents.js";
import { persistCalculationDecision } from "../lib/server-calculation-storage.js";

const inputs = {
  insurer: "income",
  currentPremium: 1650,
  currentNcd: 50,
  excess: 600,
  repairCost: 1200,
  horizonYears: 3,
  baseGrowthRate: 5,
  discountRate: 3,
  ncdProtector: false,
  liability: "at_fault",
  thirdPartyClaim: false,
  workshopType: "authorized",
  youngDriverInvolved: false,
  repairType: "general",
};

function makeIdToken(userId, extraClaims = {}) {
  const claims = Buffer.from(
    JSON.stringify({ sub: userId, ...extraClaims })
  ).toString("base64url");
  return `test-header.${claims}.test-signature`;
}

function makeDecisionRequest({
  idToken,
  persist = true,
  customInputs = inputs,
} = {}) {
  const headers = { "content-type": "application/json" };
  if (idToken) headers.authorization = `Bearer ${idToken}`;

  return new Request("https://claimwise-sg.example/api/decision", {
    method: "POST",
    headers,
    body: JSON.stringify({ inputs: customInputs, persist }),
  });
}

async function withMockedFetch(mockFetch, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

/**
 * Mirrors the exact isValidCalculation(data, userId) predicate from firestore.rules
 */
function matchesFirestoreSecurityRules(data, userId) {
  return (
    data.userId === userId &&
    typeof data.title === "string" &&
    data.title.length > 0 &&
    data.title.length <= 100 &&
    typeof data.inputs === "object" &&
    typeof data.inputs.repairCost === "number" &&
    data.inputs.repairCost >= 0 &&
    typeof data.inputs.excess === "number" &&
    data.inputs.excess >= 0 &&
    typeof data.inputs.currentNcd === "number" &&
    data.inputs.currentNcd >= 0 &&
    data.inputs.currentNcd <= 50 &&
    typeof data.inputs.ncdProtector === "boolean" &&
    typeof data.inputs.currentPremium === "number" &&
    data.inputs.currentPremium > 0 &&
    [3, 5].includes(data.inputs.horizonYears) &&
    typeof data.inputs.baseGrowthRate === "number" &&
    data.inputs.baseGrowthRate >= -20 &&
    data.inputs.baseGrowthRate <= 50 &&
    typeof data.inputs.discountRate === "number" &&
    data.inputs.discountRate >= 0 &&
    data.inputs.discountRate <= 20 &&
    ["at_fault", "non_fault", "partial_fault"].includes(data.inputs.liability) &&
    typeof data.inputs.thirdPartyClaim === "boolean" &&
    ["authorized", "independent"].includes(data.inputs.workshopType) &&
    typeof data.inputs.youngDriverInvolved === "boolean" &&
    ["general", "windscreen"].includes(data.inputs.repairType) &&
    typeof data.results === "object" &&
    ["claim", "self-pay", "CLAIM", "SELF_PAY", "NEUTRAL"].includes(
      data.results.recommendation
    ) &&
    typeof data.results.savings === "number" &&
    typeof data.results.breakEvenCost === "number"
  );
}

test("authenticated calculation writes a Firestore-rules-compliant record to the user's path", async () => {
  const idToken = makeIdToken("test-user-42");
  let savedUrl;
  let savedOptions;

  const response = await withMockedFetch(
    async (url, options) => {
      savedUrl = String(url);
      savedOptions = options;
      return new Response(null, { status: 200 });
    },
    () => handleDecisionPost(makeDecisionRequest({ idToken }))
  );

  const payload = await response.json();
  const fields = JSON.parse(savedOptions.body).fields;

  assert.equal(response.status, 200);
  assert.equal(payload.meta.persisted, true);
  assert.equal(payload.meta.persistenceStatus, "saved");
  assert.match(savedUrl, /\/documents\/users\/test-user-42\/calculations\/calc_/);
  assert.equal(savedOptions.method, "PATCH");
  assert.equal(savedOptions.headers.authorization, `Bearer ${idToken}`);
  assert.equal(fields.userId.stringValue, "test-user-42");
  assert.equal(fields.inputs.mapValue.fields.repairCost.integerValue, "1200");
  assert.equal(
    fields.decision.mapValue.fields.recommendation.stringValue,
    payload.decision.recommendation
  );

  const sharedRecord = buildCalculationRecord(payload.decision, {
    userId: "test-user-42",
  });
  assert.equal(matchesFirestoreSecurityRules(sharedRecord, "test-user-42"), true);
});

test("calculation without an ID token is returned but not written to Firestore", async () => {
  let fetchCalled = false;

  const response = await withMockedFetch(
    async () => {
      fetchCalled = true;
      throw new Error("Firestore should not be called without an ID token.");
    },
    () => handleDecisionPost(makeDecisionRequest())
  );

  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.meta.persisted, false);
  assert.equal(payload.meta.persistenceStatus, "not_authenticated");
  assert.equal(fetchCalled, false);
});

test("Firestore rejects an invalid ID token without discarding the calculation", async () => {
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    const response = await withMockedFetch(
      async () =>
        new Response(JSON.stringify({ error: "permission denied" }), {
          status: 403,
        }),
      () =>
        handleDecisionPost(
          makeDecisionRequest({ idToken: makeIdToken("test-user-42") })
        )
    );

    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.meta.persisted, false);
    assert.equal(payload.meta.persistenceStatus, "unavailable");
    assert.equal(payload.decision.inputs.repairCost, inputs.repairCost);
  } finally {
    console.warn = originalWarn;
  }
});

test("malformed, expired, or mismatched Firebase ID tokens are rejected before a Firestore request", async () => {
  const decision = calculateDecision(inputs);
  let fetchCalled = false;

  await withMockedFetch(
    async () => {
      fetchCalled = true;
      throw new Error("Firestore should not be called for invalid tokens.");
    },
    async () => {
      await assert.rejects(
        persistCalculationDecision("malformed-token", decision),
        /Firebase ID token is malformed/
      );

      const expiredToken = makeIdToken("test-user-42", {
        exp: Math.floor(Date.now() / 1000) - 60,
      });
      await assert.rejects(
        persistCalculationDecision(expiredToken, decision),
        /Firebase ID token has expired/
      );

      const wrongAudToken = makeIdToken("test-user-42", {
        aud: "other-project",
      });
      await assert.rejects(
        persistCalculationDecision(wrongAudToken, decision),
        /audience mismatch/
      );

      const traversalToken = makeIdToken("../admin");
      await assert.rejects(
        persistCalculationDecision(traversalToken, decision),
        /valid user/
      );
    }
  );

  assert.equal(fetchCalled, false);
});

test("POST /api/decision enforces strict input validation and rejects invalid fields", async () => {
  assert.ok(validateDecisionInputs({ ...inputs, currentPremium: -100 }));
  assert.ok(validateDecisionInputs({ ...inputs, excess: -50 }));
  assert.ok(validateDecisionInputs({ ...inputs, repairCost: 0 }, { persist: true }));
  assert.ok(validateDecisionInputs({ ...inputs, insurer: "unknown_insurer" }));
  assert.ok(validateDecisionInputs({ ...inputs, currentNcd: 25 }));
  assert.ok(validateDecisionInputs({ ...inputs, horizonYears: 4 }));

  const badResponse = await handleDecisionPost(
    makeDecisionRequest({
      persist: true,
      customInputs: { ...inputs, currentPremium: "invalid" },
    })
  );
  const badPayload = await badResponse.json();
  assert.equal(badResponse.status, 400);
  assert.equal(badPayload.ok, false);
  assert.equal(badPayload.field, "currentPremium");
});

test("insurer profiles and clauseAudit references align with mapped PDF documents", () => {
  for (const insurer of ["income", "msig", "etiqa"]) {
    const decision = calculateDecision({
      ...inputs,
      insurer,
      workshopType: "independent",
      youngDriverInvolved: true,
      thirdPartyClaim: true,
    });

    for (const item of decision.clauseAudit) {
      const pdfInfo = getClausePdfInfo(item.id, insurer);
      assert.ok(pdfInfo, `Missing PDF mapping for ${insurer}:${item.id}`);
      assert.ok(pdfInfo.page >= 1);
    }
  }

  const incomeDecision = calculateDecision({ ...inputs, insurer: "income" });
  assert.match(incomeDecision.profile.planName, /Drivo/);

  const msigDecision = calculateDecision({
    ...inputs,
    insurer: "msig",
    youngDriverInvolved: true,
  });
  const msigYoungClause = msigDecision.clauseAudit.find(
    (c) => c.id === "young_driver_excess"
  );
  assert.match(msigYoungClause.rationale, /under age 23/);
});
