import { SINGAPORE_MARKET_STATS } from "./singapore-market-data.mjs";

export function getMarketStats() {
  return SINGAPORE_MARKET_STATS;
}

export function compareWithMarketBenchmarks({ repairCost = 0, currentPremium = 0, excess = 0, currentNcd = 50 }) {
  const repair = Number(repairCost) || 0;
  const premium = Number(currentPremium) || 0;
  const ex = Number(excess) || 0;

  const { premiumBenchmarks, claimBenchmarks, marketOverview } = SINGAPORE_MARKET_STATS;

  // Repair percentile positioning
  let repairTier = "moderate";
  let repairTierLabel = "Typical repair range";
  if (repair < claimBenchmarks.p25Claim) {
    repairTier = "minor";
    repairTierLabel = `Below 25th percentile (Typical minor scratch/fender repair in SG is < S$${claimBenchmarks.p25Claim.toLocaleString()})`;
  } else if (repair > claimBenchmarks.p75Claim) {
    repairTier = "major";
    repairTierLabel = `Above 75th percentile (Major structural or multi-panel repair > S$${claimBenchmarks.p75Claim.toLocaleString()})`;
  } else {
    repairTierLabel = `Within Singapore median claim band (S$${claimBenchmarks.p25Claim.toLocaleString()} - S$${claimBenchmarks.p75Claim.toLocaleString()})`;
  }

  // Premium percentile positioning
  let premiumTierLabel = "Average";
  if (premium < premiumBenchmarks.p25) {
    premiumTierLabel = "Competitive (Lower quartile among SG private cars)";
  } else if (premium > premiumBenchmarks.p75) {
    premiumTierLabel = "Upper band (Higher premium than 75% of SG drivers)";
  } else {
    premiumTierLabel = "Around Singapore median (S$1,150 - S$1,880)";
  }

  // Excess positioning
  const excessComparison = ex <= claimBenchmarks.typicalExcessRange.median
    ? "Standard or below-average excess (favors lower out-of-pocket claim threshold)"
    : "Above-average excess (raises the break-even threshold for small repairs)";

  return {
    marketOverview,
    repairAnalysis: {
      userQuote: repair,
      sgMedianClaim: claimBenchmarks.medianOwnDamageRepairClaim,
      sgMeanClaim: claimBenchmarks.averageOwnDamageRepairClaim,
      tier: repairTier,
      label: repairTierLabel,
      ratioToMedian: repair / (claimBenchmarks.medianOwnDamageRepairClaim || 1),
    },
    premiumAnalysis: {
      userPremium: premium,
      sgMedianPremium: premiumBenchmarks.median,
      label: premiumTierLabel,
    },
    excessAnalysis: {
      userExcess: ex,
      sgTypicalRange: claimBenchmarks.typicalExcessRange,
      label: excessComparison,
    },
    industryMetrics: {
      annualClaimRate: `${claimBenchmarks.industryClaimFrequencyPercent}%`,
      incurredLossRatio: `${claimBenchmarks.industryIncurredLossRatioPercent}%`,
    },
  };
}
