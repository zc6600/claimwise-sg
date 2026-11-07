/**
 * Singapore Motor Claims Framework (MCF) Private Settlement validation and legal drafting utilities.
 * Governs private compromises for motor vehicle property damage between drivers in Singapore.
 */

export const SETTLEMENT_MODES = {
  PARTY_A_PAYS_PARTY_B: "party_a_pays_party_b",
  PARTY_B_PAYS_PARTY_A: "party_b_pays_party_a",
  MUTUAL_DISCHARGE: "mutual_discharge",
};

export const PAYMENT_METHODS = {
  PAYNOW: "paynow",
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
  CHEQUE: "cheque",
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.PAYNOW]: "PayNow",
  [PAYMENT_METHODS.BANK_TRANSFER]: "Bank Transfer / FAST",
  [PAYMENT_METHODS.CASH]: "Cash",
  [PAYMENT_METHODS.CHEQUE]: "Cheque",
};

const SINGAPORE_VEHICLE_REG_REGEX = /^[A-Z]{1,3}\s*\d{1,4}\s*[A-Z]?$/i;
const SINGAPORE_NRIC_REGEX = /^[STFGM]\d{7}[A-Z]$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates whether a date string is a real calendar date (rejecting overflows like 2026-02-31).
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== "string" || !ISO_DATE_REGEX.test(dateStr.trim())) {
    return false;
  }
  const [year, month, day] = dateStr.trim().split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

/**
 * Validates private settlement inputs before document generation.
 * @param {Object} inputs
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateSettlementInputs(inputs = {}) {
  const errors = {};

  // Statutory prerequisites under Singapore Road Traffic Act & GIA MCF
  if (!inputs.noInjuryConfirmed) {
    errors.noInjuryConfirmed =
      "Private settlement is strictly prohibited if any person suffered bodily injury. A police report is legally mandatory.";
  }
  if (!inputs.noGovPropertyDamageConfirmed) {
    errors.noGovPropertyDamageConfirmed =
      "Private settlement is not permitted if government or public property was damaged.";
  }

  // Accident date validation
  if (!inputs.accidentDate || typeof inputs.accidentDate !== "string") {
    errors.accidentDate = "Accident date is required.";
  } else if (!isValidCalendarDate(inputs.accidentDate)) {
    errors.accidentDate = "Accident date must be a valid calendar date in YYYY-MM-DD format.";
  }

  // Settlement execution date validation
  if (!inputs.settlementDate || typeof inputs.settlementDate !== "string") {
    errors.settlementDate = "Settlement date is required.";
  } else if (!isValidCalendarDate(inputs.settlementDate)) {
    errors.settlementDate = "Settlement date must be a valid calendar date in YYYY-MM-DD format.";
  } else if (
    isValidCalendarDate(inputs.accidentDate) &&
    inputs.settlementDate < inputs.accidentDate
  ) {
    errors.settlementDate = "Settlement date cannot precede the accident date.";
  }

  if (!inputs.accidentLocation || !inputs.accidentLocation.trim()) {
    errors.accidentLocation = "Accident location is required.";
  }

  // Party A validation
  if (!inputs.partyAName || !inputs.partyAName.trim()) {
    errors.partyAName = "Party A full name is required.";
  }
  if (!inputs.partyAVehicle || !inputs.partyAVehicle.trim()) {
    errors.partyAVehicle = "Party A vehicle registration number is required.";
  } else if (!SINGAPORE_VEHICLE_REG_REGEX.test(inputs.partyAVehicle.trim())) {
    errors.partyAVehicle = "Party A vehicle registration format is invalid (e.g., SBA1234A).";
  }
  if (inputs.partyANric && !SINGAPORE_NRIC_REGEX.test(inputs.partyANric.trim())) {
    errors.partyANric = "Party A NRIC/FIN format is invalid (e.g., S1234567A).";
  }

  // Party B validation
  if (!inputs.partyBName || !inputs.partyBName.trim()) {
    errors.partyBName = "Party B full name is required.";
  }
  if (!inputs.partyBVehicle || !inputs.partyBVehicle.trim()) {
    errors.partyBVehicle = "Party B vehicle registration number is required.";
  } else if (!SINGAPORE_VEHICLE_REG_REGEX.test(inputs.partyBVehicle.trim())) {
    errors.partyBVehicle = "Party B vehicle registration format is invalid (e.g., SKL5678B).";
  }
  if (inputs.partyBNric && !SINGAPORE_NRIC_REGEX.test(inputs.partyBNric.trim())) {
    errors.partyBNric = "Party B NRIC/FIN format is invalid (e.g., T9876543Z).";
  }

  // Settlement Mode, Payment Method, and Amount validation
  const validModes = Object.values(SETTLEMENT_MODES);
  if (!inputs.settlementMode || !validModes.includes(inputs.settlementMode)) {
    errors.settlementMode = "A valid settlement option must be selected.";
  } else if (inputs.settlementMode !== SETTLEMENT_MODES.MUTUAL_DISCHARGE) {
    const rawAmount = String(inputs.settlementAmount ?? "").trim();
    const amount = Number(rawAmount);

    if (rawAmount === "" || !Number.isFinite(amount)) {
      errors.settlementAmount = "Settlement amount must be a valid number.";
    } else if (amount <= 0) {
      errors.settlementAmount = "Settlement amount must be greater than S$0.";
    } else if (amount > 500000) {
      errors.settlementAmount = "Settlement amount cannot exceed S$500,000.";
    } else if (!/^\d+(\.\d{1,2})?$/.test(rawAmount)) {
      errors.settlementAmount = "Settlement amount cannot have more than two decimal places.";
    }

    const validPaymentMethods = Object.values(PAYMENT_METHODS);
    if (!inputs.paymentMethod || !validPaymentMethods.includes(inputs.paymentMethod)) {
      errors.paymentMethod = "A valid payment method must be selected.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats Singapore dollar settlement amount.
 * @param {number|string} amount
 * @returns {string}
 */
export function formatSettlementAmount(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) return "S$0.00";
  return `S$${num.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generates clear, legally accurate settlement terms prose based on selected mode.
 * @param {Object} inputs
 * @returns {string}
 */
export function generateSettlementClauseText(inputs) {
  const partyA = inputs.partyAName?.trim() || "Party A";
  const vehicleA = inputs.partyAVehicle?.trim() || "Vehicle A";
  const partyB = inputs.partyBName?.trim() || "Party B";
  const vehicleB = inputs.partyBVehicle?.trim() || "Vehicle B";
  const formattedAmount = formatSettlementAmount(inputs.settlementAmount);
  const paymentMethodLabel =
    PAYMENT_METHOD_LABELS[inputs.paymentMethod] || "agreed payment method";

  switch (inputs.settlementMode) {
    case SETTLEMENT_MODES.PARTY_A_PAYS_PARTY_B:
      return `Subject to the receipt of cleared funds in the sum of ${formattedAmount} via ${paymentMethodLabel} from ${partyA} (${vehicleA}), ${partyB} (${vehicleB}) agrees to accept the said sum in full and final settlement of all motor vehicle property damage arising from the accident.`;
    case SETTLEMENT_MODES.PARTY_B_PAYS_PARTY_A:
      return `Subject to the receipt of cleared funds in the sum of ${formattedAmount} via ${paymentMethodLabel} from ${partyB} (${vehicleB}), ${partyA} (${vehicleA}) agrees to accept the said sum in full and final settlement of all motor vehicle property damage arising from the accident.`;
    case SETTLEMENT_MODES.MUTUAL_DISCHARGE:
      return `Both ${partyA} (${vehicleA}) and ${partyB} (${vehicleB}) mutually agree to bear their respective motor vehicle repair costs without any monetary exchange between them, in full and final satisfaction of all property damage claims arising from the accident.`;
    default:
      return "Settlement terms pending selection.";
  }
}
