import { INSURER_PROFILES, NCD_STEPS } from "./decision-data.mjs";
import { isNcdProtectorEligible } from "./ncd/premium-path.mjs";

const finiteInRange = (min, max) => (value) =>
  Number.isFinite(value) && value >= min && value <= max;

/**
 * Accepted values for each numeric or enumerated field in a shared calculator link.
 * Values that fail their check are ignored, so a tampered link falls back to defaults.
 */
const NUMERIC_FIELDS = {
  repairCost: (value) => Number.isFinite(value) && value > 0,
  currentPremium: (value) => Number.isFinite(value) && value > 0,
  currentNcd: (value) => NCD_STEPS.includes(value),
  excess: (value) => Number.isFinite(value) && value >= 0,
  horizonYears: (value) => [3, 5].includes(value),
  commercialClaimLoading: finiteInRange(0, 100),
  dailyDowntimeCost: finiteInRange(0, 5000),
  claimDowntimeDays: finiteInRange(0, 60),
  selfPayDowntimeDays: finiteInRange(0, 60),
  baseGrowthRate: finiteInRange(-20, 50),
  discountRate: finiteInRange(0, 20),
};

const ENUM_FIELDS = {
  liability: ["at_fault", "non_fault", "partial_fault"],
  workshopType: ["authorized", "independent"],
  repairType: ["general", "windscreen"],
  vehicleUsage: ["private", "phv"],
};

const BOOLEAN_FIELDS = ["ncdProtector", "youngDriverInvolved", "thirdPartyClaim"];

const PHV_FIELDS = [
  "commercialClaimLoading",
  "dailyDowntimeCost",
  "claimDowntimeDays",
  "selfPayDowntimeDays",
];

/** Every query parameter `parseSharedInputs` accepts, in documentation order. */
export const SHARED_INPUT_FIELDS = [
  "insurer",
  ...Object.keys(NUMERIC_FIELDS),
  ...Object.keys(ENUM_FIELDS),
  ...BOOLEAN_FIELDS,
];

const DEFAULT_GROWTH_RATE = 5;
const DEFAULT_DISCOUNT_RATE = 3;

/**
 * Reads calculator inputs from a shared link's query string on top of the given
 * defaults. `hasExplicitParams` is false when the link carried no usable field.
 */
export function parseSharedInputs(params, defaults) {
  const inputs = { ...defaults };
  let hasExplicitParams = false;

  if (params.has("insurer") && INSURER_PROFILES[params.get("insurer")]) {
    inputs.insurer = params.get("insurer");
    hasExplicitParams = true;
  }

  for (const [field, isValid] of Object.entries(NUMERIC_FIELDS)) {
    if (!params.has(field)) continue;
    const value = Number(params.get(field));
    if (isValid(value)) {
      inputs[field] = value;
      hasExplicitParams = true;
    }
  }

  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    if (!params.has(field)) continue;
    const value = params.get(field);
    if (allowed.includes(value)) {
      inputs[field] = value;
      hasExplicitParams = true;
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    if (!params.has(field)) continue;
    inputs[field] = params.get(field) === "1" || params.get(field) === "true";
    hasExplicitParams = true;
  }

  if (!isNcdProtectorEligible(inputs)) inputs.ncdProtector = false;

  return { inputs, hasExplicitParams };
}

/**
 * Encodes calculator inputs as query parameters for a share link. Defaults and empty
 * values are left out to keep links short; PHV fields appear only for PHV vehicles.
 */
export function buildShareParams(inputs) {
  const params = new URLSearchParams();
  if (inputs.insurer) params.set("insurer", inputs.insurer);
  if (Number(inputs.repairCost) > 0) params.set("repairCost", String(inputs.repairCost));
  if (Number(inputs.currentPremium) > 0) params.set("currentPremium", String(inputs.currentPremium));
  if (inputs.currentNcd !== undefined && inputs.currentNcd !== "") {
    params.set("currentNcd", String(inputs.currentNcd));
  }
  if (Number(inputs.excess) >= 0 && inputs.excess !== "") params.set("excess", String(inputs.excess));
  if (inputs.horizonYears) params.set("horizonYears", String(inputs.horizonYears));
  for (const field of Object.keys(ENUM_FIELDS)) {
    if (field === "vehicleUsage") continue;
    if (inputs[field]) params.set(field, inputs[field]);
  }
  if (inputs.vehicleUsage && inputs.vehicleUsage !== "private") {
    params.set("vehicleUsage", inputs.vehicleUsage);
    for (const field of PHV_FIELDS) {
      if (Number.isFinite(Number(inputs[field]))) params.set(field, String(inputs[field]));
    }
  }
  for (const field of BOOLEAN_FIELDS) {
    if (inputs[field]) params.set(field, "1");
  }
  if (Number(inputs.baseGrowthRate) !== DEFAULT_GROWTH_RATE && Number.isFinite(Number(inputs.baseGrowthRate))) {
    params.set("baseGrowthRate", String(inputs.baseGrowthRate));
  }
  if (Number(inputs.discountRate) !== DEFAULT_DISCOUNT_RATE && Number.isFinite(Number(inputs.discountRate))) {
    params.set("discountRate", String(inputs.discountRate));
  }
  return params;
}

/** Whether two calculator input sets would produce the same decision. */
export function sameClaimInputs(a, b) {
  if (!a || !b) return false;
  return (
    a.insurer === b.insurer &&
    Number(a.currentPremium) === Number(b.currentPremium) &&
    Number(a.currentNcd) === Number(b.currentNcd) &&
    Number(a.excess) === Number(b.excess) &&
    Number(a.repairCost) === Number(b.repairCost) &&
    Number(a.horizonYears) === Number(b.horizonYears) &&
    Boolean(a.ncdProtector) === Boolean(b.ncdProtector) &&
    a.liability === b.liability &&
    Boolean(a.thirdPartyClaim) === Boolean(b.thirdPartyClaim) &&
    a.workshopType === b.workshopType &&
    Boolean(a.youngDriverInvolved) === Boolean(b.youngDriverInvolved) &&
    a.repairType === b.repairType &&
    (a.vehicleUsage || "private") === (b.vehicleUsage || "private") &&
    Number(a.commercialClaimLoading ?? 0) === Number(b.commercialClaimLoading ?? 0) &&
    Number(a.dailyDowntimeCost ?? 0) === Number(b.dailyDowntimeCost ?? 0) &&
    Number(a.claimDowntimeDays ?? 0) === Number(b.claimDowntimeDays ?? 0) &&
    Number(a.selfPayDowntimeDays ?? 0) === Number(b.selfPayDowntimeDays ?? 0)
  );
}
