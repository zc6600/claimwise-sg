import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { POST as handleDecisionPost } from "../app/api/decision/route.js";
import { calculateDecision } from "../src/decision-engine.mjs";
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

function makeIdToken(userId) {
  const claims = Buffer.from(JSON.stringify({ sub: userId })).toString("base64url");
  return `test-header.${claims}.test-signature`;
}

function makeDecisionRequest({ idToken, persist = true } = {}) {
  const headers = { "content-type": "application/json" };
  if (idToken) headers.authorization = `Bearer ${idToken}`;

  return new Request("https://claimwise-sg.example/api/decision", {
    method: "POST",
    headers,
    body: JSON.stringify({ inputs, persist }),
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

test("authenticated calculation writes the full decision to the user's Firestore path", async () => {
  const idToken = makeIdToken("test-user-42");
  let savedUrl;
  let savedOptions;

  const response = await withMockedFetch(async (url, options) => {
    savedUrl = String(url);
    savedOptions = options;
    return new Response(null, { status: 200 });
  }, () => handleDecisionPost(makeDecisionRequest({ idToken })));

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
});

test("calculation without an ID token is returned but not written to Firestore", async () => {
  let fetchCalled = false;

  const response = await withMockedFetch(async () => {
    fetchCalled = true;
    throw new Error("Firestore should not be called without an ID token.");
  }, () => handleDecisionPost(makeDecisionRequest()));

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
      async () => new Response(JSON.stringify({ error: "permission denied" }), { status: 403 }),
      () => handleDecisionPost(makeDecisionRequest({ idToken: makeIdToken("test-user-42") }))
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

test("malformed Firebase ID tokens are rejected before a Firestore request", async () => {
  const decision = calculateDecision(inputs);
  let fetchCalled = false;

  await withMockedFetch(async () => {
    fetchCalled = true;
    throw new Error("Firestore should not be called for malformed tokens.");
  }, async () => {
    await assert.rejects(
      persistCalculationDecision("malformed-token", decision),
      /Firebase ID token is malformed/
    );
  });

  assert.equal(fetchCalled, false);
});
