import { INSURER_PROFILES, NCD_STEPS } from "./decision-data.mjs";

const VALID_LIABILITIES = ["at_fault", "non_fault", "partial_fault"];
const VALID_WORKSHOPS = ["authorized", "independent"];
const VALID_REPAIR_TYPES = ["general", "windscreen"];
const VALID_VEHICLE_USAGES = ["private", "phv"];

function isFiniteNumber(value) {
  if (typeof value === "boolean" || value === null || value === "") return false;
  const num = Number(value);
  return Number.isFinite(num);
}

/**
 * Strict request validation for claim-decision inputs. `normalizeInputs` silently clamps
 * out-of-range values; public interfaces reject them instead so callers learn which
 * field is wrong. Returns `{ field, message }` for the first invalid field, or null.
 */
export function validateDecisionInputs(rawInputs, { persist = false } = {}) {
  if (!rawInputs || typeof rawInputs !== "object" || Array.isArray(rawInputs)) {
    return { field: "inputs", message: "Inputs must be a JSON object." };
  }

  if (
    !isFiniteNumber(rawInputs.currentPremium) ||
    Number(rawInputs.currentPremium) <= 0 ||
    Number(rawInputs.currentPremium) > 100000
  ) {
    return {
      field: "currentPremium",
      message: "currentPremium must be a positive number between S$1 and S$100,000.",
    };
  }

  if (
    !isFiniteNumber(rawInputs.excess) ||
    Number(rawInputs.excess) < 0 ||
    Number(rawInputs.excess) > 50000
  ) {
    return {
      field: "excess",
      message: "excess must be a number between S$0 and S$50,000.",
    };
  }

  const minRepairCost = persist ? 0.01 : 0;
  if (
    !isFiniteNumber(rawInputs.repairCost) ||
    Number(rawInputs.repairCost) < minRepairCost ||
    Number(rawInputs.repairCost) > 500000
  ) {
    return {
      field: "repairCost",
      message: persist
        ? "repairCost must be greater than S$0 to save a calculation."
        : "repairCost must be a number between S$0 and S$500,000.",
    };
  }

  if (
    rawInputs.currentNcd !== undefined &&
    (!isFiniteNumber(rawInputs.currentNcd) ||
      !NCD_STEPS.includes(Number(rawInputs.currentNcd)))
  ) {
    return {
      field: "currentNcd",
      message: `currentNcd must be one of ${NCD_STEPS.join(", ")}.`,
    };
  }

  if (
    rawInputs.insurer !== undefined &&
    (typeof rawInputs.insurer !== "string" || !INSURER_PROFILES[rawInputs.insurer])
  ) {
    return {
      field: "insurer",
      message: `insurer must be one of ${Object.keys(INSURER_PROFILES).join(", ")}.`,
    };
  }

  if (
    rawInputs.horizonYears !== undefined &&
    ![3, 5].includes(Number(rawInputs.horizonYears))
  ) {
    return {
      field: "horizonYears",
      message: "horizonYears must be 3 or 5.",
    };
  }

  if (
    rawInputs.baseGrowthRate !== undefined &&
    (!isFiniteNumber(rawInputs.baseGrowthRate) ||
      Number(rawInputs.baseGrowthRate) < -20 ||
      Number(rawInputs.baseGrowthRate) > 50)
  ) {
    return {
      field: "baseGrowthRate",
      message: "baseGrowthRate must be a number between -20 and 50.",
    };
  }

  if (
    rawInputs.discountRate !== undefined &&
    (!isFiniteNumber(rawInputs.discountRate) ||
      Number(rawInputs.discountRate) < 0 ||
      Number(rawInputs.discountRate) > 20)
  ) {
    return {
      field: "discountRate",
      message: "discountRate must be a number between 0 and 20.",
    };
  }

  if (
    rawInputs.liability !== undefined &&
    !VALID_LIABILITIES.includes(rawInputs.liability)
  ) {
    return {
      field: "liability",
      message: `liability must be one of ${VALID_LIABILITIES.join(", ")}.`,
    };
  }

  if (
    rawInputs.workshopType !== undefined &&
    !VALID_WORKSHOPS.includes(rawInputs.workshopType)
  ) {
    return {
      field: "workshopType",
      message: `workshopType must be one of ${VALID_WORKSHOPS.join(", ")}.`,
    };
  }

  if (
    rawInputs.repairType !== undefined &&
    !VALID_REPAIR_TYPES.includes(rawInputs.repairType)
  ) {
    return {
      field: "repairType",
      message: `repairType must be one of ${VALID_REPAIR_TYPES.join(", ")}.`,
    };
  }

  if (
    rawInputs.vehicleUsage !== undefined &&
    !VALID_VEHICLE_USAGES.includes(rawInputs.vehicleUsage)
  ) {
    return {
      field: "vehicleUsage",
      message: `vehicleUsage must be one of ${VALID_VEHICLE_USAGES.join(", ")}.`,
    };
  }

  if (
    rawInputs.commercialClaimLoading !== undefined &&
    (!isFiniteNumber(rawInputs.commercialClaimLoading) ||
      Number(rawInputs.commercialClaimLoading) < 0 ||
      Number(rawInputs.commercialClaimLoading) > 100)
  ) {
    return {
      field: "commercialClaimLoading",
      message: "commercialClaimLoading must be a percentage between 0 and 100.",
    };
  }

  if (
    rawInputs.dailyDowntimeCost !== undefined &&
    (!isFiniteNumber(rawInputs.dailyDowntimeCost) ||
      Number(rawInputs.dailyDowntimeCost) < 0 ||
      Number(rawInputs.dailyDowntimeCost) > 5000)
  ) {
    return {
      field: "dailyDowntimeCost",
      message: "dailyDowntimeCost must be a number between S$0 and S$5,000.",
    };
  }

  if (
    rawInputs.claimDowntimeDays !== undefined &&
    (!isFiniteNumber(rawInputs.claimDowntimeDays) ||
      Number(rawInputs.claimDowntimeDays) < 0 ||
      Number(rawInputs.claimDowntimeDays) > 60)
  ) {
    return {
      field: "claimDowntimeDays",
      message: "claimDowntimeDays must be a number of days between 0 and 60.",
    };
  }

  if (
    rawInputs.selfPayDowntimeDays !== undefined &&
    (!isFiniteNumber(rawInputs.selfPayDowntimeDays) ||
      Number(rawInputs.selfPayDowntimeDays) < 0 ||
      Number(rawInputs.selfPayDowntimeDays) > 60)
  ) {
    return {
      field: "selfPayDowntimeDays",
      message: "selfPayDowntimeDays must be a number of days between 0 and 60.",
    };
  }

  return null;
}
