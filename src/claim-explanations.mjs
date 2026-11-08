import { formatCurrency } from "./formatters.mjs";
import { isNcdProtectorEligible } from "./ncd/premium-path.mjs";

/**
 * Plain-language notices shown beside a claim decision. They explain which policy terms
 * changed the result; they never alter the figures.
 */
export function buildAdvisories({
  inputs,
  profile,
  excessDetails,
  effectiveExcess,
  baseScenario,
  isBelowExcess,
}) {
  const advisories = [];

  if (inputs.repairType === "windscreen") {
    advisories.push({
      type: "teal",
      title: "GIA Windscreen Clause Applied",
      message: `Under Singapore motor insurance terms, windscreen repair/replacement incurs only a S$${excessDetails.totalEffectiveExcess} reinstatement fee and does NOT affect your NCD.`,
    });
  }

  if (excessDetails.unauthorizedWorkshopSurcharge > 0) {
    advisories.push({
      type: "amber",
      title: "Non-Authorised Workshop Excess Surcharge (+S$" + excessDetails.unauthorizedWorkshopSurcharge + ")",
      message: `${profile.name} policy schedules impose an additional S$${excessDetails.unauthorizedWorkshopSurcharge} excess for repairs at independent workshops, raising your effective excess to S$${effectiveExcess}.`,
    });
  }

  if (excessDetails.youngDriverSurcharge > 0) {
    const ageThreshold = profile.youngDriverAgeThreshold || 25;
    advisories.push({
      type: "amber",
      title: "Young / Inexperienced Driver Excess (+S$" + excessDetails.youngDriverSurcharge + ")",
      message: `Because the driver involved is under ${ageThreshold} or has held a driving license for < 2 years, ${profile.name} requires an additional excess of S$${excessDetails.youngDriverSurcharge}.`,
    });
  }

  if (isBelowExcess) {
    advisories.push({
      type: "warning",
      title: "Repair cost is below or equal to your effective excess",
      message: `Your repair quote (${formatCurrency(inputs.repairCost)}) does not exceed your effective policy excess (${formatCurrency(effectiveExcess)}). The insurer would pay nothing, so paying the workshop yourself costs less.`,
    });
  }

  if (inputs.thirdPartyClaim && inputs.liability !== "non_fault") {
    advisories.push({
      type: "info",
      title: "Third-party claim reported against you",
      message: "Because an external party has filed a claim and liability is not 100% non-fault, your insurer will settle third-party damages. Your NCD will step back regardless of whether you self-pay your own repair.",
    });
  }

  if (inputs.liability === "non_fault") {
    advisories.push({
      type: "success",
      title: "100% Non-fault accident",
      message: "Under GIA MCF guidelines, if you are 100% not at fault, your NCD is protected even if an own-damage claim is made (subrogated against the third party).",
    });
  }

  if (inputs.vehicleUsage === "phv") {
    advisories.push({
      type: "info",
      title: "Private hire (PHV) assumptions applied",
      message: `For a PHV, the calculation adds a ${inputs.commercialClaimLoading}% claim loading on renewal premiums and an estimated S$${baseScenario.netDowntimeCost} net downtime/loss-of-use difference (${inputs.claimDowntimeDays} claim days vs. ${inputs.selfPayDowntimeDays} self-pay days at S$${inputs.dailyDowntimeCost}/day).`,
    });
  }

  return advisories;
}

/**
 * Clause-by-clause audit trail that links each input of a claim decision to the policy
 * wording or regulation it comes from.
 */
export function generateClauseAudit(
  inputs,
  profile,
  excessDetails,
  baseScenario,
  effectiveExcess,
  isBelowExcess,
  claimNcdAfter,
  selfPayNcdAfter
) {
  const audit = [];

  // 1. Standard Policy Excess
  audit.push({
    id: "base_excess",
    category: "Excess & Deductibles",
    dataPoint: "Standard Policy Excess",
    value: formatCurrency(inputs.excess),
    status: "active",
    statusLabel: "Applies to every claim",
    clauseRef: profile.clauses?.baseExcess?.ref || "Your policy schedule · own damage excess",
    authority: profile.name,
    statutoryBasis: "Your policy schedule",
    illustrativeText: profile.clauses?.baseExcess?.text || "The policyholder shall bear the standard basic excess specified in the Schedule for each own-damage claim.",
    rationale: `As stipulated in your ${profile.name} schedule, the first ${formatCurrency(inputs.excess)} of own-damage repairs is borne out-of-pocket before insurance indemnification takes effect.`,
  });

  // 2. Workshop Choice Surcharge
  const hasWorkshopSurcharge = excessDetails.unauthorizedWorkshopSurcharge > 0;
  audit.push({
    id: "workshop_surcharge",
    category: "Excess & Deductibles",
    dataPoint: "Workshop Choice Surcharge",
    value: hasWorkshopSurcharge ? `+${formatCurrency(excessDetails.unauthorizedWorkshopSurcharge)}` : "S$0 (Waived)",
    status: hasWorkshopSurcharge ? "active" : "waived",
    statusLabel: hasWorkshopSurcharge ? "Surcharge Applied" : "Condition Met / Waived",
    clauseRef: profile.clauses?.unauthorizedWorkshop?.ref || "Your policy schedule · workshop conditions",
    authority: profile.name,
    statutoryBasis: "Your insurer's authorised workshop terms",
    illustrativeText: profile.clauses?.unauthorizedWorkshop?.text || "Repairs must be carried out at an authorised workshop. Repairs elsewhere incur additional excess.",
    rationale: hasWorkshopSurcharge
      ? `You selected an independent/unauthorised workshop. Under ${profile.name} Endorsement terms, an additional penalty of ${formatCurrency(excessDetails.unauthorizedWorkshopSurcharge)} is added to your excess.`
      : `Repairs carried out at an authorised network workshop incur S$0 additional surcharge under ${profile.name} terms.`,
  });

  // 3. Young / Inexperienced Driver Surcharge
  const hasYoungDriver = excessDetails.youngDriverSurcharge > 0;
  const ageThreshold = profile.youngDriverAgeThreshold || 25;
  audit.push({
    id: "young_driver_excess",
    category: "Excess & Deductibles",
    dataPoint: "Young / Inexperienced Driver Surcharge",
    value: hasYoungDriver ? `+${formatCurrency(excessDetails.youngDriverSurcharge)}` : "S$0 (Exempt)",
    status: hasYoungDriver ? "active" : "not_applicable",
    statusLabel: hasYoungDriver ? "Surcharge applies" : "Does not apply",
    clauseRef: profile.clauses?.youngDriver?.ref || "Your policy schedule · additional excesses",
    authority: profile.name,
    statutoryBasis: "Your policy schedule",
    illustrativeText: profile.clauses?.youngDriver?.text || "An additional excess applies if the vehicle is driven by a young or inexperienced driver as defined in the policy schedule.",
    rationale: hasYoungDriver
      ? `Because a young or inexperienced driver (under age ${ageThreshold} or holding a Singapore driving licence for under 2 years) was at the wheel, a modeled schedule excess surcharge of ${formatCurrency(excessDetails.youngDriverSurcharge)} is added.`
      : `Driver meets standard policy age (≥${ageThreshold}) and licensing experience (≥2 years) thresholds; no supplementary excess is incurred.`,
  });

  // 4. Windscreen Special Cover (if windscreen repair)
  if (inputs.repairType === "windscreen") {
    audit.push({
      id: "windscreen_clause",
      category: "Coverage Endorsements",
      dataPoint: "Windscreen & Window Glass Cover",
      value: `${formatCurrency(excessDetails.totalEffectiveExcess)} Reinstatement Excess · 0% NCD Deduction`,
      status: "active",
      statusLabel: "Windscreen cover applies",
      clauseRef: profile.clauses?.windscreen?.ref || "Your policy schedule · windscreen cover",
      authority: profile.name,
      statutoryBasis: "Your policy's windscreen cover",
      illustrativeText: profile.clauses?.windscreen?.text || "Payment of S$100 excess applies for windscreen replacement. Replacement does not affect accrued NCD upon renewal.",
      rationale: `Windscreen claims are handled separately from other own-damage claims: you pay only the ${formatCurrency(excessDetails.totalEffectiveExcess)} windscreen excess and your NCD is unchanged.`,
    });
  }

  // 5. Total Effective Claim Out-of-Pocket
  audit.push({
    id: "effective_excess",
    category: "Excess & Deductibles",
    dataPoint: "Total Effective Claim Deductible",
    value: formatCurrency(effectiveExcess),
    status: "governing",
    statusLabel: "Total you pay when claiming",
    clauseRef: "Your policy schedule · excesses add together",
    authority: profile.name,
    statutoryBasis: "Your policy schedule",
    illustrativeText: "The policyholder must bear the sum total of all applicable basic and endorsement excesses before the insurer disburses indemnity for approved accident repairs.",
    rationale: isBelowExcess
      ? `Your repair quote (${formatCurrency(inputs.repairCost)}) does not exceed your total effective excess (${formatCurrency(effectiveExcess)}). The insurer would pay nothing, so paying the workshop yourself costs less.`
      : `Your insurer will indemnify eligible repair costs exceeding ${formatCurrency(effectiveExcess)}. You will pay ${formatCurrency(effectiveExcess)} out-of-pocket on the claim route.`,
  });

  // 6. NCD Step-Down Penalty Rule
  const isNcdShielded = claimNcdAfter === inputs.currentNcd;
  const actualPenalty = inputs.currentNcd - claimNcdAfter;

  const shieldReason = inputs.liability === "non_fault"
    ? "Non-Fault Subrogation"
    : inputs.ncdProtector && isNcdProtectorEligible(inputs)
      ? "NCD Protector Endorsement"
      : "Windscreen Endorsement W1";

  audit.push({
    id: "ncd_step_down",
    category: "NCD & Discount Rules",
    dataPoint: "No-Claim Discount (NCD) Step-Down",
    value: isNcdShielded
      ? "0% (Shielded / Protected)"
      : `-${actualPenalty}% (${inputs.currentNcd}% → ${claimNcdAfter}%)`,
    status: isNcdShielded ? "protected" : "active",
    statusLabel: isNcdShielded ? "Protected from Reduction" : `${actualPenalty}-Point Penalty Active`,
    clauseRef: "Your insurer's NCD scale (see the GIA Motor Claims Framework consumer guide)",
    authority: profile.name,
    statutoryBasis: "Your insurer's NCD scale in the policy schedule",
    illustrativeText: "Under the standard GIA scale, an at-fault or unsettled claim results in a 30% reduction from the policyholder's accrued NCD upon the next renewal (e.g. 50% to 20%, 40% to 10%, 30% or below to 0%).",
    rationale: isNcdShielded
      ? `Your NCD tier of ${inputs.currentNcd}% is preserved without deduction due to ${shieldReason}.`
      : `Filing an own-damage at-fault claim causes your NCD to drop by ${actualPenalty} percentage points from ${inputs.currentNcd}% to ${claimNcdAfter}%, increasing renewal premiums over the next ${inputs.horizonYears} years.`,
  });

  // 7. NCD Protector Rider
  const protectorEligible = isNcdProtectorEligible(inputs);
  const protectorActive = inputs.ncdProtector && protectorEligible;

  let protectorValue = "Not Elected / Inactive";
  let protectorStatus = "inactive";
  let protectorStatusLabel = "No Protector on Policy";
  let protectorRationale = `Because NCD Protector is inactive, any at-fault claim triggers the full ${profile.ncdDropPoints}% standard GIA penalty.`;

  if (inputs.ncdProtector) {
    if (protectorEligible) {
      protectorValue = "Active · 1 Claim Shielded";
      protectorStatus = "active";
      protectorStatusLabel = "Rider Active";
      protectorRationale = `Your NCD Protector absorbs the ${profile.ncdDropPoints}% drop on this claim, saving substantial multi-year renewal surcharges.`;
    } else {
      protectorValue = `Ineligible (Requires ${profile.minNcdForProtector}% NCD)`;
      protectorStatus = "warning";
      protectorStatusLabel = "Eligibility Threshold Not Met";
      protectorRationale = `NCD Protector is only available for ${profile.name} policyholders with at least ${profile.minNcdForProtector}% NCD. Because your current NCD is ${inputs.currentNcd}%, the protector does not apply.`;
    }
  }

  audit.push({
    id: "ncd_protector_rider",
    category: "NCD & Discount Rules",
    dataPoint: "NCD Protector Endorsement",
    value: protectorValue,
    status: protectorStatus,
    statusLabel: protectorStatusLabel,
    clauseRef: profile.clauses?.ncdProtector?.ref || "Insurer NCD Protector Endorsement",
    authority: profile.name,
    statutoryBasis: `${profile.name} NCD Protector rider (from ${profile.minNcdForProtector}% NCD)`,
    illustrativeText: profile.clauses?.ncdProtector?.text || "Maintains current NCD tier upon the first own-damage at-fault claim within the policy period.",
    rationale: protectorRationale,
  });

  // 8. Third-Party Adverse Claim Settlement Rule
  if (inputs.thirdPartyClaim) {
    const isNonFault = inputs.liability === "non_fault";
    audit.push({
      id: "third_party_liability",
      category: "Liability",
      dataPoint: "Third-Party Adverse Claim Impact",
      value: isNonFault ? "Subrogated Recovery (0% NCD Deduction)" : `At-Fault Settlement (Self-Pay NCD penalized to ${selfPayNcdAfter}%)`,
      status: "active",
      statusLabel: isNonFault ? "Recovered from the other party" : "Your insurer settles the claim",
      clauseRef: "GIA Motor Claims Framework (MCF)",
      authority: "General Insurance Association of Singapore (GIA)",
      statutoryBasis: "Motor Vehicles (Third-Party Risks and Compensation) Act 1960 (Cap. 189)",
      illustrativeText: "Where a third party lodges a claim against the policyholder and liability is attributed to the policyholder, the insurer may settle the third party's claims under applicable cover. This can affect NCD regardless of whether the policyholder chooses to self-pay their own vehicle repairs.",
      rationale: isNonFault
        ? "If you are not at fault at all, your insurer recovers the repair cost from the other driver's insurer and your NCD is not affected."
        : `Because the other party has filed a claim against you and you bear liability, your insurer will settle it. Consequently, choosing to self-pay your own car will NOT protect your NCD (which drops to ${selfPayNcdAfter}%).`,
    });
  }

  // 9. Present-value break-even formula
  audit.push({
    id: "actuarial_model",
    category: "Calculation",
    dataPoint: "Discounted Break-Even Threshold",
    value: `${formatCurrency(baseScenario.breakEvenRepairCost)} (PV Discount Rate: ${inputs.discountRate}%/yr, ${inputs.horizonYears}-Yr Horizon)`,
    status: "governing",
    statusLabel: "Where the two options cost the same",
    clauseRef: "ClaimWise SG break-even formula (not a policy clause)",
    authority: "ClaimWise SG calculation",
    statutoryBasis: "Break-even = effective excess + present value of the extra renewal premiums after a claim",
    illustrativeText: "The break-even repair cost R*(S) is the modeled boundary where the present value of claiming equals the present value of self-paying, based on the assumptions entered.",
    rationale: inputs.repairCost > baseScenario.breakEvenRepairCost
      ? `Your repair quote (${formatCurrency(inputs.repairCost)}) is above the break-even threshold (${formatCurrency(baseScenario.breakEvenRepairCost)}). Claiming saves ${formatCurrency(Math.abs(baseScenario.difference))} in present value outlays over ${inputs.horizonYears} years.`
      : `Your repair quote (${formatCurrency(inputs.repairCost)}) is at or below the break-even threshold (${formatCurrency(baseScenario.breakEvenRepairCost)}). Self-paying saves ${formatCurrency(Math.abs(baseScenario.difference))} in present value outlays over ${inputs.horizonYears} years.`,
  });

  // 10. Private hire vehicle loading and downtime
  if (inputs.vehicleUsage === "phv") {
    audit.push({
      id: "phv_commercial_terms",
      category: "Private hire vehicles",
      dataPoint: "Private hire (PHV) terms",
      value: `+${inputs.commercialClaimLoading}% Renewal Loading · S$${inputs.dailyDowntimeCost}/day Downtime`,
      status: "active",
      statusLabel: "PHV assumptions applied",
      clauseRef: "ClaimWise SG PHV assumptions (check your PHV policy)",
      authority: "ClaimWise SG assumption",
      statutoryBasis: "Loading and downtime figures you entered",
      illustrativeText: "Private hire vehicles usually face a higher renewal loading after an at-fault claim and lose income while the car is off the road. The figures are the assumptions you entered, not policy terms.",
      rationale: `An at-fault claim is assumed to add a ${inputs.commercialClaimLoading}% loading at renewal. Vehicle downtime of ${inputs.claimDowntimeDays} claim days vs. ${inputs.selfPayDowntimeDays} self-pay days at S$${inputs.dailyDowntimeCost}/day adds S$${baseScenario.netDowntimeCost} to the claim route cost.`,
    });
  }

  return audit;
}
