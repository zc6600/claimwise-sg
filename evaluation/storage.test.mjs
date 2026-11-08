import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/decision/route.js";

const inputs = {
  insurer: "income", currentPremium: 1650, currentNcd: 50, excess: 600,
  repairCost: 1200, horizonYears: 3, baseGrowthRate: 5, discountRate: 3,
  ncdProtector: false, liability: "at_fault", thirdPartyClaim: false,
  workshopType: "authorized", youngDriverInvolved: false, repairType: "general",
};

function request(userId, persist = true) {
  const claims = Buffer.from(JSON.stringify({ sub: userId })).toString("base64url");
  return new Request("http://localhost/api/decision", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer fixture.${claims}.fixture` },
    body: JSON.stringify({ inputs, persist }),
  });
}

async function withStorageMock(fetchMock, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("non-persistent load requests bypass storage even with an ID token", async () => {
  await withStorageMock(() => { throw new Error("Unexpected storage request"); }, async () => {
    const response = await POST(request("fixture-user", false));
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.meta.persistenceStatus, "not_requested");
    assert.equal(payload.meta.persisted, false);
  });
});

test("distinct user tokens route saved calculations to distinct user paths", async () => {
  const paths = [];
  await withStorageMock(async (url) => {
    paths.push(new URL(url).pathname);
    return new Response(null, { status: 200 });
  }, async () => {
    for (const userId of ["fixture-user-a", "fixture-user-b"]) {
      const payload = await (await POST(request(userId))).json();
      assert.equal(payload.meta.persisted, true);
      assert.match(paths.at(-1), new RegExp(`/users/${userId}/calculations/calc_`));
    }
    assert.notEqual(paths[0], paths[1]);
  });
});

test("storage timeout preserves a valid decision and reports persistence unavailable", async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await withStorageMock(async () => { throw new DOMException("Storage timed out", "TimeoutError"); }, async () => {
      const response = await POST(request("fixture-user"));
      const payload = await response.json();
      assert.equal(response.status, 200);
      assert.equal(payload.ok, true);
      assert.equal(payload.meta.persistenceStatus, "unavailable");
      assert.equal(payload.meta.persisted, false);
      assert.ok(Number.isFinite(payload.decision.baseScenario.claimTotal));
    });
  } finally {
    console.warn = originalWarn;
  }
});
