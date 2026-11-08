export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === "" || typeof value === "boolean") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toBoundedNumber(value, { min, max, fallback = 0 }) {
  return clamp(toFiniteNumber(value, fallback), min, max);
}

export function discountFactor(ratePct, year) {
  return (1 + ratePct / 100) ** year;
}

/**
 * Converts a present-value cost into the level annual cost over the same period,
 * so that options lasting different numbers of years can be compared directly.
 */
export function equivalentAnnualCost(presentValue, ratePct, years) {
  if (years <= 0) return 0;
  const rate = ratePct / 100;
  if (rate === 0) return presentValue / years;
  return (presentValue * rate) / (1 - (1 + rate) ** -years);
}
