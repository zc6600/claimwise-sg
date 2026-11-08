import { claimPremiumLossPresentValue } from "../ncd/premium-path.mjs";
import { roundMoney, toBoundedNumber } from "../numeric.mjs";

export const MAX_QUOTES = 4;

export const QUOTE_COMPARISON_DEFAULTS = {
  currentNcd: 50,
  incidentProbabilityPct: 5,
  typicalRepairCost: 2500,
  usesNonAuthorisedWorkshop: false,
};

// Matches the NCD Protector tool: five renewals capture the full recovery from a 30-point drop.
const NCD_LOSS_HORIZON_YEARS = 5;
const NCD_LOSS_GROWTH_RATE_PCT = 5;
const NCD_LOSS_DISCOUNT_RATE_PCT = 3;

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
    currentNcd: toBoundedNumber(raw.currentNcd, {
      min: 0,
      max: 50,
      fallback: QUOTE_COMPARISON_DEFAULTS.currentNcd,
    }),
    incidentProbabilityPct: toBoundedNumber(raw.incidentProbabilityPct, { min: 0, max: 100 }),
    typicalRepairCost: toBoundedNumber(raw.typicalRepairCost, { min: 0, max: 500000 }),
    usesNonAuthorisedWorkshop: raw.usesNonAuthorisedWorkshop === true,
  };
}

/**
 * Discounted renewal-premium increase caused by one at-fault own-damage claim, assuming
 * the policyholder renews at this quote's premium. The shared NCD path keeps this
 * consistent with the claim calculator and the NCD Protector tool.
 */
export function ncdLossPresentValue(premium, currentNcd) {
  if (currentNcd <= 0) return 0;
  return claimPremiumLossPresentValue({
    currentPremium: premium,
    currentNcd,
    horizonYears: NCD_LOSS_HORIZON_YEARS,
    growthRate: NCD_LOSS_GROWTH_RATE_PCT,
    discountRate: NCD_LOSS_DISCOUNT_RATE_PCT,
  });
}

function lowestBy(items, key) {
  return items.reduce((best, item) => (item[key] < best[key] ? item : best));
}

/**
 * Finds the incident probability at which a quote with a lower cost per incident
 * overtakes the lowest-premium quote. An equally priced quote wins at any positive
 * probability, so its threshold is zero. The result is null when the quote never
 * catches up.
 */
function breakEvenAgainst(quote, lowestPremiumQuote) {
  if (quote === lowestPremiumQuote) return null;
  const extraPremium = quote.premium - lowestPremiumQuote.premium;
  const incidentSaving = lowestPremiumQuote.costPerIncident - quote.costPerIncident;
  if (extraPremium < 0 || incidentSaving <= 0) return null;
  const probabilityPct = (extraPremium / incidentSaving) * 100;
  return probabilityPct <= 100 ? roundMoney(probabilityPct) : null;
}

/**
 * Ranks renewal quotes by expected first-year cost. After an incident the policyholder
 * picks the cheaper of self-paying the repair and claiming, where claiming costs the
 * effective excess plus the NCD loss on future renewals. A low excess therefore only
 * helps when the repair bill is large enough to be worth claiming.
 */
export function compareQuotes(rawInputs) {
  const inputs = normalizeQuoteComparisonInputs(rawInputs);
  if (inputs.quotes.length < 2) {
    return { inputs, ready: false, quotes: [] };
  }

  const probability = inputs.incidentProbabilityPct / 100;
  const evaluated = inputs.quotes.map((quote) => {
    const effectiveExcess =
      quote.excess + (inputs.usesNonAuthorisedWorkshop ? quote.workshopSurcharge : 0);
    const ncdLoss = ncdLossPresentValue(quote.premium, inputs.currentNcd);
    const claimCost = Math.min(inputs.typicalRepairCost, effectiveExcess) + ncdLoss;
    const wouldClaim = claimCost < inputs.typicalRepairCost;
    const costPerIncident = wouldClaim ? claimCost : inputs.typicalRepairCost;
    return {
      ...quote,
      effectiveExcess: roundMoney(effectiveExcess),
      ncdLoss: roundMoney(ncdLoss),
      wouldClaim,
      costPerIncident: roundMoney(costPerIncident),
      costWithIncident: roundMoney(quote.premium + costPerIncident),
      expectedCost: roundMoney(quote.premium + probability * costPerIncident),
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
    lowestPremiumIsBest: quotes[0].expectedCost === lowestPremiumQuote.expectedCost,
    expectedSavingVsLowestPremium: roundMoney(lowestPremiumQuote.expectedCost - quotes[0].expectedCost),
  };
}
