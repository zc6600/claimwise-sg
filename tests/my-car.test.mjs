import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { hasCarDetails, normalizeMyCar, upcomingDecisions } from "../src/my-car.mjs";

test("car details keep known fields and drop registration numbers", () => {
  const car = normalizeMyCar({
    label: "  Family car  ",
    plateNumber: "SGX1234A",
    insuranceRenewal: "2027-03-01",
    coeExpiry: "2027-02-31",
    currentPremium: "1200",
    currentNcd: "50",
    excess: -5,
  });
  assert.equal(car.label, "Family car");
  assert.equal(car.plateNumber, undefined);
  assert.equal(car.insuranceRenewal, "2027-03-01");
  assert.equal(car.coeExpiry, "");
  assert.equal(car.currentPremium, 1200);
  assert.equal(car.currentNcd, 50);
  assert.equal(car.excess, "");
});

test("an unset NCD stays empty and off-scale NCD values are dropped", () => {
  assert.equal(normalizeMyCar({ currentNcd: "" }).currentNcd, "");
  assert.equal(normalizeMyCar({ currentNcd: 35 }).currentNcd, "");
  assert.equal(normalizeMyCar({ currentNcd: 0 }).currentNcd, 0);
  assert.equal(hasCarDetails(normalizeMyCar({})), false);
  assert.equal(hasCarDetails(normalizeMyCar({ currentNcd: 0 })), true);
});

test("upcoming decisions are sorted by urgency and flag their planning window", () => {
  const decisions = upcomingDecisions(
    { coeExpiry: "2027-08-01", insuranceRenewal: "2026-12-01", loanReview: "2026-11-01" },
    "2026-11-07"
  );
  assert.deepEqual(
    decisions.map((decision) => decision.id),
    ["loanReview", "insuranceRenewal", "coeExpiry"]
  );
  assert.equal(decisions[0].isPast, true);
  assert.equal(decisions[0].actNow, false);
  assert.equal(decisions[1].actNow, true);
  assert.equal(decisions[1].daysAway, 24);
  assert.equal(decisions[2].actNow, true);
});

test("Firestore rules keep reminder subscriptions server-only", () => {
  const rules = fs.readFileSync("firestore.rules", "utf-8");
  assert.doesNotMatch(rules, /match \/reminderSubscriptions/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rules, /match \/users\/\{userId\}\/vehicles\/\{vehicleId\}/);
});
