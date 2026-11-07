import { roundMoney, toBoundedNumber } from "./shared.mjs";

export const MAX_QUOTES = 4;

export const QUOTE_COMPARISON_DEFAULTS = {
  claimProbabilityPct: 5,
  typicalRepairCost: 2500,
  usesNonAuthorisedWorkshop: false,
};

function normalizeQuote(raw, index) {
  const label = typeof raw?.label === "string" ? raw.label.trim().slice(0, 60) : "";
  return {
    label: label || `Quote ${index + 1}`,
    premium: toBoundedNumber(raw?.premium, { min: 0, max: 100000 }),
    excess: toBoundedNumber(raw?.excess, { min: 0, max: 50000 }),
    workshopSurcharge: toBoundedNumber(raw?.workshopSurcharge, { min: 0, max: 50000 }),
  };
}

export function normalizeQuoteComparisonInputs(raw = {}) {
  const quotes = Array.isArray(raw.quotes) ? raw.quotes : [];
  return {
    quotes: quotes
      .slice(0, MAX_QUOTES)
      .map(normalizeQuote)
      .filter((quote) => quote.premium > 0),
    claimProbabilityPct: toBoundedNumber(raw.claimProbabilityPct, { min: 0, max: 100 }),
    typicalRepairCost: toBoundedNumber(raw.typicalRepairCost, { min: 0, max: 500000 }),
    usesNonAuthorisedWorkshop: raw.usesNonAuthorisedWorkshop === true,
  };
}

function lowestBy(items, key) {
  return items.reduce((best, item) => (item[key] < best[key] ? item : best));
}

/**
 * Finds the claim probability at which a dearer quote with a lower out-of-pocket
 * claim cost overtakes the lowest-premium quote. The result is null when the dearer
 * quote never catches up.
 */
function breakEvenAgainst(quote, lowestPremiumQuote) {
  if (quote === lowestPremiumQuote) return null;
  const extraPremium = quote.premium - lowestPremiumQuote.premium;
  const claimSaving = lowestPremiumQuote.outOfPocketPerClaim - quote.outOfPocketPerClaim;
  if (extraPremium <= 0 || claimSaving <= 0) return null;
  const probabilityPct = (extraPremium / claimSaving) * 100;
  return probabilityPct <= 100 ? roundMoney(probabilityPct) : null;
}

/**
 * Ranks renewal quotes by expected first-year cost. Future NCD effects are excluded
 * because a claim reduces the NCD under every quote in the same way.
 */
export function compareQuotes(rawInputs) {
  const inputs = normalizeQuoteComparisonInputs(rawInputs);
  if (inputs.quotes.length < 2) {
    return { inputs, ready: false, quotes: [] };
  }

  const probability = inputs.claimProbabilityPct / 100;
  const evaluated = inputs.quotes.map((quote) => {
    const effectiveExcess =
      quote.excess + (inputs.usesNonAuthorisedWorkshop ? quote.workshopSurcharge : 0);
    const outOfPocketPerClaim = Math.min(inputs.typicalRepairCost, effectiveExcess);
    return {
      ...quote,
      effectiveExcess: roundMoney(effectiveExcess),
      outOfPocketPerClaim: roundMoney(outOfPocketPerClaim),
      costWithClaim: roundMoney(quote.premium + outOfPocketPerClaim),
      expectedCost: roundMoney(quote.premium + probability * outOfPocketPerClaim),
    };
  });

  const lowestPremiumQuote = lowestBy(evaluated, "premium");
  const quotes = evaluated
    .map((quote) => ({
      ...quote,
      breakEvenProbabilityPct: breakEvenAgainst(quote, lowestPremiumQuote),
    }))
    .sort((a, b) => a.expectedCost - b.expectedCost);

  return {
    inputs,
    ready: true,
    quotes,
    bestLabel: quotes[0].label,
    lowestPremiumLabel: lowestPremiumQuote.label,
    bestIfClaimLabel: lowestBy(quotes, "costWithClaim").label,
    lowestPremiumIsBest: quotes[0].expectedCost === lowestPremiumQuote.expectedCost,
    expectedSavingVsLowestPremium: roundMoney(lowestPremiumQuote.expectedCost - quotes[0].expectedCost),
  };
}
