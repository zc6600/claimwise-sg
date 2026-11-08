import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateSettlementInputs,
  formatSettlementAmount,
  generateSettlementClauseText,
  isValidCalendarDate,
  SETTLEMENT_MODES,
  PAYMENT_METHODS,
} from "../src/settlement-form.mjs";

const validBaseInputs = {
  noInjuryConfirmed: true,
  noGovPropertyDamageConfirmed: true,
  accidentDate: "2026-11-01",
  accidentLocation: "PIE towards Changi before Tampines Ave 5 Exit",
  settlementDate: "2026-11-02",
  partyAName: "Tan Ah Teck",
  partyAVehicle: "SBA1234A",
  partyANric: "S1234567A",
  partyBName: "Lee Wei Ling",
  partyBVehicle: "SKL5678B",
  partyBNric: "T9876543Z",
  settlementMode: SETTLEMENT_MODES.PARTY_A_PAYS_PARTY_B,
  settlementAmount: "1250.00",
  paymentMethod: PAYMENT_METHODS.PAYNOW,
};

test("validateSettlementInputs accepts clean Singapore GIA settlement inputs", () => {
  const result = validateSettlementInputs(validBaseInputs);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test("validateSettlementInputs enforces statutory prerequisites (no injury, no gov property damage)", () => {
  const injuryUnconfirmed = validateSettlementInputs({
    ...validBaseInputs,
    noInjuryConfirmed: false,
  });
  assert.equal(injuryUnconfirmed.isValid, false);
  assert.ok(injuryUnconfirmed.errors.noInjuryConfirmed);

  const govPropertyUnconfirmed = validateSettlementInputs({
    ...validBaseInputs,
    noGovPropertyDamageConfirmed: false,
  });
  assert.equal(govPropertyUnconfirmed.isValid, false);
  assert.ok(govPropertyUnconfirmed.errors.noGovPropertyDamageConfirmed);
});

test("isValidCalendarDate rejects impossible calendar dates and non-string inputs", () => {
  assert.equal(isValidCalendarDate("2026-02-31"), false);
  assert.equal(isValidCalendarDate("2026-04-31"), false);
  assert.equal(isValidCalendarDate("invalid-date"), false);
  assert.equal(isValidCalendarDate("2026-11-01"), true);
  assert.equal(isValidCalendarDate("2024-02-29"), true); // Leap year
  assert.equal(isValidCalendarDate("2025-02-29"), false); // Non-leap year
});

test("validateSettlementInputs validates that settlementDate is on or after accidentDate", () => {
  const precedingDateResult = validateSettlementInputs({
    ...validBaseInputs,
    accidentDate: "2026-11-05",
    settlementDate: "2026-11-02",
  });
  assert.equal(precedingDateResult.isValid, false);
  assert.ok(precedingDateResult.errors.settlementDate);

  const sameDateResult = validateSettlementInputs({
    ...validBaseInputs,
    accidentDate: "2026-11-05",
    settlementDate: "2026-11-05",
  });
  assert.equal(sameDateResult.isValid, true);
});

test("validateSettlementInputs validates Singapore vehicle registration formats", () => {
  const invalidVehicleResult = validateSettlementInputs({
    ...validBaseInputs,
    partyAVehicle: "INVALID_PLATE_99999",
  });
  assert.equal(invalidVehicleResult.isValid, false);
  assert.ok(invalidVehicleResult.errors.partyAVehicle);
});

test("validateSettlementInputs validates Singapore NRIC/FIN formats when provided", () => {
  const invalidNricResult = validateSettlementInputs({
    ...validBaseInputs,
    partyBNric: "1234567",
  });
  assert.equal(invalidNricResult.isValid, false);
  assert.ok(invalidNricResult.errors.partyBNric);

  const cleanNoNricResult = validateSettlementInputs({
    ...validBaseInputs,
    partyANric: "",
    partyBNric: "",
  });
  assert.equal(cleanNoNricResult.isValid, true);
});

test("validateSettlementInputs enforces settlement amount and decimal constraints", () => {
  // Missing amount
  const missingAmount = validateSettlementInputs({
    ...validBaseInputs,
    settlementAmount: "",
  });
  assert.equal(missingAmount.isValid, false);
  assert.ok(missingAmount.errors.settlementAmount);

  // Negative amount
  const negativeAmount = validateSettlementInputs({
    ...validBaseInputs,
    settlementAmount: -100,
  });
  assert.equal(negativeAmount.isValid, false);
  assert.ok(negativeAmount.errors.settlementAmount);

  // Non-finite amount
  const nonFiniteAmount = validateSettlementInputs({
    ...validBaseInputs,
    settlementAmount: "Infinity",
  });
  assert.equal(nonFiniteAmount.isValid, false);
  assert.ok(nonFiniteAmount.errors.settlementAmount);

  // More than 2 decimal places (fractional cents)
  const fractionalCents = validateSettlementInputs({
    ...validBaseInputs,
    settlementAmount: "1250.555",
  });
  assert.equal(fractionalCents.isValid, false);
  assert.ok(fractionalCents.errors.settlementAmount);

  // Valid 2 decimal places
  const validCents = validateSettlementInputs({
    ...validBaseInputs,
    settlementAmount: "1250.50",
  });
  assert.equal(validCents.isValid, true);

  // Exceeding S$500,000 threshold
  const excessiveAmount = validateSettlementInputs({
    ...validBaseInputs,
    settlementAmount: 600000,
  });
  assert.equal(excessiveAmount.isValid, false);
  assert.ok(excessiveAmount.errors.settlementAmount);

  // Mutual discharge allows empty/zero amount
  const mutualDischarge = validateSettlementInputs({
    ...validBaseInputs,
    settlementMode: SETTLEMENT_MODES.MUTUAL_DISCHARGE,
    settlementAmount: 0,
  });
  assert.equal(mutualDischarge.isValid, true);
  assert.equal(mutualDischarge.errors.settlementAmount, undefined);
});

test("formatSettlementAmount formats values to Singapore currency standard", () => {
  assert.equal(formatSettlementAmount(1250), "S$1,250.00");
  assert.equal(formatSettlementAmount(0), "S$0.00");
  assert.equal(formatSettlementAmount("invalid"), "S$0.00");
});

test("generateSettlementClauseText produces legally aligned wording with receipt conditionality", () => {
  const textPartyAPaysB = generateSettlementClauseText(validBaseInputs);
  assert.ok(textPartyAPaysB.includes("Tan Ah Teck"));
  assert.ok(textPartyAPaysB.includes("Lee Wei Ling"));
  assert.ok(textPartyAPaysB.includes("S$1,250.00"));
  assert.ok(textPartyAPaysB.includes("Subject to the receipt of cleared funds"));
  assert.ok(textPartyAPaysB.includes("PayNow"));
  assert.ok(textPartyAPaysB.includes("motor vehicle property damage"));

  const textPartyBPaysA = generateSettlementClauseText({
    ...validBaseInputs,
    settlementMode: SETTLEMENT_MODES.PARTY_B_PAYS_PARTY_A,
    settlementAmount: "800.00",
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
  });
  assert.ok(textPartyBPaysA.includes("Lee Wei Ling"));
  assert.ok(textPartyBPaysA.includes("Tan Ah Teck"));
  assert.ok(textPartyBPaysA.includes("S$800.00"));
  assert.ok(textPartyBPaysA.includes("Bank Transfer / FAST"));

  const textMutual = generateSettlementClauseText({
    ...validBaseInputs,
    settlementMode: SETTLEMENT_MODES.MUTUAL_DISCHARGE,
  });
  assert.ok(textMutual.includes("mutually agree to bear their respective motor vehicle repair costs"));
  assert.ok(textMutual.includes("without any monetary exchange"));
});

test("generateSettlementClauseText leaves blank fields as lines to complete by hand", () => {
  const text = generateSettlementClauseText({
    settlementMode: "party_a_pays_party_b",
    paymentMethod: "paynow",
    settlementAmount: "",
  });
  assert.match(text, /S\$__________/);
  assert.doesNotMatch(text, /S\$0\.00/);
  assert.match(text, /vehicle ________/);
});
