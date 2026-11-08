import { INSURER_PROFILES, NCD_STEPS } from "../decision-data.mjs";
import { clamp, roundMoney } from "../numeric.mjs";

export const MAX_NCD = 50;

export function insurerProfile(insurer) {
  return INSURER_PROFILES[insurer] || INSURER_PROFILES.other;
}

/** Each claim-free renewal moves the NCD up one published step, capped at 50%. */
export function nextNcd(ncd) {
  return NCD_STEPS.find((step) => step > ncd) ?? MAX_NCD;
}

/** NCD after one at-fault claim that the rider does not protect. */
export function ncdAfterStepDown(currentNcd, insurer) {
  return clamp(currentNcd - insurerProfile(insurer).ncdDropPoints, 0, MAX_NCD);
}

export function isNcdProtectorEligible(inputs) {
  const minNcd = insurerProfile(inputs?.insurer).minNcdForProtector ?? MAX_NCD;
  return Number(inputs?.currentNcd ?? 0) >= minNcd;
}

/** Recovers the gross premium before NCD from the net premium the policyholder pays. */
export function grossPremiumFromNet(netPremium, ncd) {
  return netPremium / (1 - clamp(ncd, 0, MAX_NCD) / 100);
}

function premiumAtNcd(basePremium, ncd, growthRate, year, commercialLoading) {
  const growthMultiplier = (1 + growthRate / 100) ** year;
  const loadingMultiplier = 1 + commercialLoading / 100;
  return basePremium * (1 - ncd / 100) * growthMultiplier * loadingMultiplier;
}

/**
 * Renewal premiums for each year of the horizon, starting from the NCD that applies at
 * the first renewal and stepping up after every claim-free year. Year t is grown and
 * discounted t times, so the first renewal is one year from the decision date.
 */
export function buildPremiumPath({
  basePremium,
  startingNcd,
  horizonYears,
  growthRate,
  discountRate,
  commercialLoading = 0,
}) {
  let ncd = startingNcd;
  const years = [];

  for (let year = 1; year <= horizonYears; year += 1) {
    const renewalNcd = clamp(ncd, 0, MAX_NCD);
    const nominal = premiumAtNcd(basePremium, renewalNcd, growthRate, year, commercialLoading);
    const discounted = nominal / (1 + discountRate / 100) ** year;

    years.push({
      year,
      ncd: renewalNcd,
      premium: roundMoney(nominal),
      discountedPremium: roundMoney(discounted),
      commercialLoading: roundMoney(commercialLoading),
    });
    ncd = nextNcd(renewalNcd);
  }

  return years;
}

export function sumPath(years, discounted = false) {
  return roundMoney(
    years.reduce((total, year) => total + (discounted ? year.discountedPremium : year.premium), 0)
  );
}

/**
 * Discounted renewal-premium increase caused by one unprotected at-fault claim, relative
 * to staying claim-free. Each path is summed with the claim calculator's rounding; the
 * difference is left unrounded so callers can round once at their own output.
 */
export function claimPremiumLossPresentValue({
  currentPremium,
  currentNcd,
  insurer = "other",
  horizonYears,
  growthRate,
  discountRate,
}) {
  if (currentPremium <= 0) return 0;
  const shared = {
    basePremium: grossPremiumFromNet(currentPremium, currentNcd),
    horizonYears,
    growthRate,
    discountRate,
  };
  const claimFree = buildPremiumPath({ ...shared, startingNcd: currentNcd });
  const afterClaim = buildPremiumPath({
    ...shared,
    startingNcd: ncdAfterStepDown(currentNcd, insurer),
  });
  return Math.max(0, sumPath(afterClaim, true) - sumPath(claimFree, true));
}
