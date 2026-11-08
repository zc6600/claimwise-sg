import test from "node:test";
import assert from "node:assert/strict";
import {
  buildShareParams,
  parseSharedInputs,
  sameClaimInputs,
} from "../src/claim-share-link.mjs";

const DEFAULTS = {
  insurer: "income",
  currentPremium: 1650,
  currentNcd: 50,
  excess: 600,
  repairCost: "",
  horizonYears: 3,
  baseGrowthRate: 5,
  discountRate: 3,
  ncdProtector: false,
  liability: "at_fault",
  thirdPartyClaim: false,
  workshopType: "authorized",
  youngDriverInvolved: false,
  repairType: "general",
  vehicleUsage: "private",
  commercialClaimLoading: 15,
  dailyDowntimeCost: 80,
  claimDowntimeDays: 5,
  selfPayDowntimeDays: 1,
};

test("a shared link round-trips every calculator input", () => {
  const inputs = {
    ...DEFAULTS,
    insurer: "msig",
    repairCost: 2400,
    currentNcd: 50,
    horizonYears: 5,
    ncdProtector: true,
    liability: "partial_fault",
    workshopType: "independent",
    vehicleUsage: "phv",
    commercialClaimLoading: 20,
    baseGrowthRate: 7,
  };
  const { inputs: parsed, hasExplicitParams } = parseSharedInputs(buildShareParams(inputs), DEFAULTS);
  assert.equal(hasExplicitParams, true);
  assert.deepEqual(parsed, inputs);
  assert.equal(sameClaimInputs(parsed, inputs), true);
});

test("a shared link ignores invalid values and leaves defaults out", () => {
  const params = new URLSearchParams("insurer=bogus&currentNcd=45&excess=-1&horizonYears=4&liability=nope");
  const { inputs, hasExplicitParams } = parseSharedInputs(params, DEFAULTS);
  assert.equal(hasExplicitParams, false);
  assert.deepEqual(inputs, DEFAULTS);

  const query = buildShareParams({ ...DEFAULTS, repairCost: 1200 }).toString();
  assert.equal(query.includes("baseGrowthRate"), false);
  assert.equal(query.includes("vehicleUsage"), false);
  assert.equal(query.includes("repairCost=1200"), true);
});

test("a shared link cannot switch on an NCD Protector the NCD does not qualify for", () => {
  const params = new URLSearchParams("currentNcd=20&ncdProtector=1");
  const { inputs } = parseSharedInputs(params, DEFAULTS);
  assert.equal(inputs.currentNcd, 20);
  assert.equal(inputs.ncdProtector, false);
});
