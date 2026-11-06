import { INSURER_PROFILES, NCD_STEPS } from "./decision-data.mjs";
import { formatCurrency, formatPercent } from "./formatters.mjs";

export { INSURER_PROFILES, NCD_STEPS, formatCurrency, formatPercent };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value) => value === true || value === 1 || value === "1" || value === "true";

export function normalizeInputs(raw = {}) {
  const insurer = INSURER_PROFILES[raw.insurer] ? raw.insurer : "other";
  const currentPremium = Math.max(0, parseNumber(raw.currentPremium, 0));
  const currentNcd = clamp(parseNumber(raw.currentNcd, 0), 0, 50);
  const excess = Math.max(0, parseNumber(raw.excess, 0));
  const repairCost = Math.max(0, parseNumber(raw.repairCost, 0));
  const horizonYears = [3, 5].includes(Number(raw.horizonYears)) ? Number(raw.horizonYears) : 3;
  const baseGrowthRate = clamp(parseNumber(raw.baseGrowthRate, 5), -20, 50);
  const discountRate = clamp(parseNumber(raw.discountRate, 3), 0, 20);
  const ncdProtector = parseBoolean(raw.ncdProtector);
  const liability = ["at_fault", "non_fault", "partial_fault"].includes(raw.liability)
    ? raw.liability
    : "at_fault";
  const thirdPartyClaim = parseBoolean(raw.thirdPartyClaim);
  const workshopType = ["authorized", "independent"].includes(raw.workshopType)
    ? raw.workshopType
    : "authorized";
  const youngDriverInvolved = parseBoolean(raw.youngDriverInvolved);
  const repairType = ["general", "windscreen"].includes(raw.repairType)
    ? raw.repairType
    : "general";

  return {
    insurer,
    currentPremium,
    currentNcd,
    excess,
    repairCost,
    horizonYears,
    baseGrowthRate,
    discountRate,
    ncdProtector,
    liability,
    thirdPartyClaim,
    workshopType,
    youngDriverInvolved,
    repairType,
  };
}

function nextNcd(ncd) {
  return NCD_STEPS.find((step) => step > ncd) ?? 50;
}

export function isNcdProtectorEligible(inputs) {
  const profile = INSURER_PROFILES[inputs?.insurer] || INSURER_PROFILES.other;
  const minNcd = profile.minNcdForProtector ?? 50;
  return Number(inputs?.currentNcd ?? 0) >= minNcd;
}

export function ncdAfterSelfPay(inputs) {
  // GIA MCF Section 1.1 / Ref [3]: If a third party claims against the user and the user is
  // at fault or partial fault, the insurer must settle the third party claim.
  // This triggers an NCD reduction regardless of whether the user self-pays their own vehicle repair!
  if (inputs.thirdPartyClaim && inputs.liability !== "non_fault") {
    if (inputs.ncdProtector && isNcdProtectorEligible(inputs)) return inputs.currentNcd;
    const profile = INSURER_PROFILES[inputs.insurer] || INSURER_PROFILES.other;
    return clamp(inputs.currentNcd - profile.ncdDropPoints, 0, 50);
  }
  return inputs.currentNcd;
}

export function ncdAfterClaim(inputs) {
  // GIA MCF: If 100% non-fault (clear third-party liability), NCD is protected.
  if (inputs.liability === "non_fault") return inputs.currentNcd;
  // A third-party liability claim can affect NCD even when the insured's own damage
  // is a windscreen claim. A valid protector still preserves the tier.
  if (inputs.ncdProtector && isNcdProtectorEligible(inputs)) return inputs.currentNcd;
  if (inputs.thirdPartyClaim) {
    const profile = INSURER_PROFILES[inputs.insurer] || INSURER_PROFILES.other;
    return clamp(inputs.currentNcd - profile.ncdDropPoints, 0, 50);
  }
  // GIA Windscreen Clause: Windscreen repair/replacement claims do not dock NCD
  if (inputs.repairType === "windscreen") return inputs.currentNcd;
  const profile = INSURER_PROFILES[inputs.insurer] || INSURER_PROFILES.other;
  return clamp(inputs.currentNcd - profile.ncdDropPoints, 0, 50);
}

export function computeEffectiveExcess(inputs) {
  const profile = INSURER_PROFILES[inputs.insurer] || INSURER_PROFILES.other;

  if (inputs.repairType === "windscreen") {
    const windscreenExcess = profile.windscreenExcess || 100;
    return {
      baseExcess: inputs.excess,
      windscreenExcessApplied: true,
      unauthorizedWorkshopSurcharge: 0,
      youngDriverSurcharge: 0,
      totalEffectiveExcess: windscreenExcess,
    };
  }

  const isUnauthorized = inputs.workshopType === "independent";
  const isYoungDriver = Boolean(inputs.youngDriverInvolved);

  const unauthorizedSurcharge = isUnauthorized ? (profile.unauthorizedWorkshopExcess || 1000) : 0;
  const youngDriverSurcharge = isYoungDriver ? (profile.youngDriverExcess || 2500) : 0;
  const total = inputs.excess + unauthorizedSurcharge + youngDriverSurcharge;

  return {
    baseExcess: inputs.excess,
    windscreenExcessApplied: false,
    unauthorizedWorkshopSurcharge: unauthorizedSurcharge,
    youngDriverSurcharge: youngDriverSurcharge,
    totalEffectiveExcess: total,
  };
}

function premiumAtNcd(basePremium, ncd, growthRate, year) {
  const growthMultiplier = (1 + growthRate / 100) ** year;
  return basePremium * (1 - ncd / 100) * growthMultiplier;
}

function buildPath(inputs, startingNcd, growthRate, discountRate) {
  const basePremium = inputs.currentNcd < 100
    ? inputs.currentPremium / (1 - inputs.currentNcd / 100)
    : inputs.currentPremium;
  let ncd = startingNcd;
  const years = [];

  for (let year = 1; year <= inputs.horizonYears; year += 1) {
    const renewalNcd = clamp(ncd, 0, 50);
    const nominal = premiumAtNcd(basePremium, renewalNcd, growthRate, year);
    const discountFactor = (1 + discountRate / 100) ** year;
    const discounted = nominal / discountFactor;

    years.push({
      year,
      ncd: renewalNcd,
      premium: roundMoney(nominal),
      discountedPremium: roundMoney(discounted),
    });
    ncd = nextNcd(renewalNcd);
  }

  return years;
}

function sumYears(years, discounted = false) {
  return roundMoney(
    years.reduce((total, year) => total + (discounted ? year.discountedPremium : year.premium), 0),
  );
}

function buildScenario(inputs, growthRate, effectiveExcess) {
  const selfPayStartingNcd = ncdAfterSelfPay(inputs);
  const claimStartingNcd = ncdAfterClaim(inputs);

  const selfPayYears = buildPath(inputs, selfPayStartingNcd, growthRate, inputs.discountRate);
  const claimYears = buildPath(inputs, claimStartingNcd, growthRate, inputs.discountRate);

  // Present Value (Discounted) totals per Formula (1) in Preliminary.pdf
  const selfPayFutureDiscounted = sumYears(selfPayYears, true);
  const claimFutureDiscounted = sumYears(claimYears, true);

  // Nominal undiscounted totals for reference
  const selfPayFuturePremium = sumYears(selfPayYears, false);
  const claimFuturePremium = sumYears(claimYears, false);

  const currentClaimCost = Math.min(inputs.repairCost, effectiveExcess);
  const selfPayTotal = roundMoney(inputs.repairCost + selfPayFutureDiscounted);
  const claimTotal = roundMoney(currentClaimCost + claimFutureDiscounted);
  const difference = roundMoney(selfPayTotal - claimTotal);

  // Formula (1): R*(S) = Eown + sum_{t=1}^T (Pt^claim - Pt^self) / (1 + r)^t
  const breakEvenRepairCost = roundMoney(
    Math.max(0, effectiveExcess + claimFutureDiscounted - selfPayFutureDiscounted),
  );

  return {
    growthRate,
    selfPayYears,
    claimYears,
    selfPayFuturePremium,
    claimFuturePremium,
    selfPayFutureDiscounted,
    claimFutureDiscounted,
    currentClaimCost: roundMoney(currentClaimCost),
    selfPayTotal,
    claimTotal,
    difference,
    breakEvenRepairCost,
    recommendedOption: difference > 0 ? "claim" : "self-pay",
  };
}

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
    statusLabel: "Governing Policy Baseline",
    clauseRef: profile.clauses?.baseExcess?.ref || "Singapore Standard Motor Policy · Section 1 (Own Damage)",
    authority: profile.name,
    statutoryBasis: "Insurance Act 1966 (Cap. 142) · Policy Schedule",
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
    clauseRef: profile.clauses?.unauthorizedWorkshop?.ref || "GIA Authorised Workshop Scheme Schedule",
    authority: `${profile.name} Network Scheme`,
    statutoryBasis: "General Insurance Association of Singapore (GIA) Approved Workshop Guidelines",
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
    statusLabel: hasYoungDriver ? "Mandatory Surcharge Active" : "Driver Criteria Satisfied",
    clauseRef: profile.clauses?.youngDriver?.ref || "GIA Standard Table of Additional Excesses",
    authority: `General Insurance Association of Singapore (GIA) & ${profile.name}`,
    statutoryBasis: "Policy Schedule & Insurer Underwriting Excess Rules",
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
      statusLabel: "Special Endorsement Applied",
      clauseRef: profile.clauses?.windscreen?.ref || "GIA Standard Windscreen Endorsement W1",
      authority: "General Insurance Association of Singapore (GIA)",
      statutoryBasis: "GIA Motor Tariff Endorsement W1 (Section 1 Extension)",
      illustrativeText: profile.clauses?.windscreen?.text || "Payment of S$100 excess applies for windscreen replacement. Replacement does not affect accrued NCD upon renewal.",
      rationale: `Windscreen glass repairs are legally quarantined from general own-damage claims: excess is capped at ${formatCurrency(excessDetails.totalEffectiveExcess)} and renewal NCD remains 100% intact.`,
    });
  }

  // 5. Total Effective Claim Out-of-Pocket
  audit.push({
    id: "effective_excess",
    category: "Excess & Deductibles",
    dataPoint: "Total Effective Claim Deductible",
    value: formatCurrency(effectiveExcess),
    status: "governing",
    statusLabel: "Net Deductible Cap",
    clauseRef: "Consolidated Section 1 Deductible Schedule (Cumulative Contract Excess)",
    authority: `${profile.name} Claims Department`,
    statutoryBasis: "Contractual Cumulative Deductible Rules",
    illustrativeText: "The policyholder must bear the sum total of all applicable basic and endorsement excesses before the insurer disburses indemnity for approved accident repairs.",
    rationale: isBelowExcess
      ? `Your repair quote (${formatCurrency(inputs.repairCost)}) does not exceed your total effective excess (${formatCurrency(effectiveExcess)}). The insurer would pay S$0, making self-paying legally and financially the only logical route.`
      : `Your insurer will indemnify eligible repair costs exceeding ${formatCurrency(effectiveExcess)}. You will pay ${formatCurrency(effectiveExcess)} out-of-pocket on the claim route.`,
  });

  // 6. NCD Step-Down Penalty Rule
  const isNcdShielded = inputs.ncdProtector || inputs.liability === "non_fault" || inputs.repairType === "windscreen";
  audit.push({
    id: "ncd_step_down",
    category: "NCD & Discount Rules",
    dataPoint: "No-Claim Discount (NCD) Step-Down",
    value: isNcdShielded ? "0% (Shielded / Protected)" : `-${profile.ncdDropPoints}% (${inputs.currentNcd}% → ${claimNcdAfter}%)`,
    status: isNcdShielded ? "protected" : "active",
    statusLabel: isNcdShielded ? "Protected from Reduction" : "30-Point Penalty Active",
    clauseRef: "GIA Motor Claims Framework (MCF) Standard Scale of No-Claim Discount",
    authority: "General Insurance Association of Singapore (GIA)",
    statutoryBasis: "GIA Industry Code of Practice on Motor Claims & MAS Notice 122",
    illustrativeText: "Under the standard GIA scale, an at-fault or unsettled claim results in a 30% reduction from the policyholder's accrued NCD upon the next renewal (e.g. 50% to 20%, 40% to 10%, 30% or below to 0%).",
    rationale: isNcdShielded
      ? `Your NCD tier of ${inputs.currentNcd}% is preserved without deduction due to ${inputs.ncdProtector && isNcdProtectorEligible(inputs) ? "NCD Protector Endorsement" : inputs.repairType === "windscreen" ? "Windscreen Endorsement W1" : "Non-Fault Subrogation"}.`
      : `Filing an own-damage at-fault claim causes your NCD to drop by ${profile.ncdDropPoints} percentage points from ${inputs.currentNcd}% to ${claimNcdAfter}%, increasing renewal premiums over the next 3 years.`,
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
      protectorRationale = `NCD Protector is only available for ${profile.name} policyholders with at least ${profile.minNcdForProtector}% NCD. Because your current NCD is ${inputs.currentNcd}%, the protector is legally inactive.`;
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
    statutoryBasis: `Insurer Specific Policy Endorsement (Eligible at ${profile.minNcdForProtector}%+ NCD)`,
    illustrativeText: profile.clauses?.ncdProtector?.text || "Maintains current NCD tier upon the first own-damage at-fault claim within the policy period.",
    rationale: protectorRationale,
  });

  // 8. Third-Party Adverse Claim Settlement Rule
  if (inputs.thirdPartyClaim) {
    const isNonFault = inputs.liability === "non_fault";
    audit.push({
      id: "third_party_liability",
      category: "Liability & Statutory Law",
      dataPoint: "Third-Party Adverse Claim Impact",
      value: isNonFault ? "Subrogated Recovery (0% NCD Deduction)" : `At-Fault Settlement (Self-Pay NCD penalized to ${selfPayNcdAfter}%)`,
      status: "active",
      statusLabel: isNonFault ? "Non-Fault Subrogation" : "Mandatory Statutory Settlement",
      clauseRef: "GIA Motor Claims Framework (MCF) Section 1.1 & Condition 1(c)",
      authority: "General Insurance Association of Singapore (GIA) & Singapore Tort Law",
      statutoryBasis: "Motor Vehicles (Third-Party Risks and Compensation) Act 1960 (Cap. 189)",
      illustrativeText: "Where a third party lodges a claim against the policyholder and liability is attributed to the policyholder, the insurer may settle the third party's claims under applicable cover. This can affect NCD regardless of whether the policyholder chooses to self-pay their own vehicle repairs.",
      rationale: isNonFault
        ? "Under GIA Knock-for-Knock protocols, being 100% non-fault allows your insurer to recover all repair outlays from the third-party insurer with zero penalty to your NCD."
        : `Because the other party has filed a claim against you and you bear liability, your insurer is legally obliged to settle. Consequently, choosing to self-pay your own car will NOT protect your NCD (which drops to ${selfPayNcdAfter}%).`,
    });
  }

  // 9. Actuarial Present Value Discounting & Break-Even Formula (Equation 1)
  audit.push({
    id: "actuarial_model",
    category: "Actuarial Valuation Model",
    dataPoint: "Discounted Break-Even Threshold",
    value: `${formatCurrency(baseScenario.breakEvenRepairCost)} (PV Discount Rate: ${inputs.discountRate}%/yr, ${inputs.horizonYears}-Yr Horizon)`,
    status: "governing",
    statusLabel: "Mathematical Break-Even Boundary",
    clauseRef: "Actuarial Net Present Value Specification · Equation (1)",
    authority: "Monetary Authority of Singapore (MAS) Actuarial Guidance",
    statutoryBasis: "Actuarial Net Present Value (NPV): R*(S) = E_own + \\sum_{t=1}^T (P_t^{claim} - P_t^{self}) / (1 + r)^t",
    illustrativeText: "The break-even repair cost R*(S) is the modeled boundary where the present value of claiming equals the present value of self-paying, based on the assumptions entered.",
    rationale: inputs.repairCost > baseScenario.breakEvenRepairCost
      ? `Your repair quote (${formatCurrency(inputs.repairCost)}) is strictly above the break-even threshold (${formatCurrency(baseScenario.breakEvenRepairCost)}). Claiming saves ${formatCurrency(Math.abs(baseScenario.difference))} in present value outlays over ${inputs.horizonYears} years.`
      : `Your repair quote (${formatCurrency(inputs.repairCost)}) is at or below the break-even threshold (${formatCurrency(baseScenario.breakEvenRepairCost)}). Self-paying saves ${formatCurrency(Math.abs(baseScenario.difference))} in present value outlays over ${inputs.horizonYears} years.`,
  });

  return audit;
}

export function calculateDecision(rawInputs) {
  const inputs = normalizeInputs(rawInputs);
  const profile = INSURER_PROFILES[inputs.insurer] || INSURER_PROFILES.other;
  const excessDetails = computeEffectiveExcess(inputs);
  const effectiveExcess = excessDetails.totalEffectiveExcess;

  const baseGrowth = inputs.baseGrowthRate;
  const scenarioRates = [
    Math.max(-20, baseGrowth - 5),
    baseGrowth,
    Math.min(50, baseGrowth + 5),
  ];
  const scenarios = scenarioRates.map((growthRate) => buildScenario(inputs, growthRate, effectiveExcess));
  const baseScenario = scenarios[1];
  const isNearExcess = inputs.repairCost <= effectiveExcess;
  const isBelowExcess = inputs.repairCost <= effectiveExcess;
  const selfPayNcdAfterValue = ncdAfterSelfPay(inputs);
  const claimNcdAfterValue = ncdAfterClaim(inputs);

  // Advisory notices
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
    advisories.push({
      type: "amber",
      title: "Young / Inexperienced Driver Excess (+S$" + excessDetails.youngDriverSurcharge + ")",
      message: `Because the driver involved is under 25 or has held a driving license for < 2 years, ${profile.name} requires an additional mandatory excess of S$${excessDetails.youngDriverSurcharge}.`,
    });
  }

  if (isBelowExcess) {
    advisories.push({
      type: "warning",
      title: "Repair cost is below or equal to your effective excess",
      message: `Your repair quote (${formatCurrency(inputs.repairCost)}) does not exceed your effective policy excess (${formatCurrency(effectiveExcess)}). The insurer payout would be S$0, making self-paying strictly optimal.`,
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

  // Generate legal & policy clause audit trail for absolute transparency and traceability
  const clauseAudit = generateClauseAudit(
    inputs,
    profile,
    excessDetails,
    baseScenario,
    effectiveExcess,
    isBelowExcess,
    claimNcdAfterValue,
    selfPayNcdAfterValue
  );

  return {
    inputs,
    profile,
    excessDetails,
    effectiveExcess,
    scenarios,
    baseScenario,
    recommendation: isBelowExcess ? "self-pay" : baseScenario.recommendedOption,
    isNearExcess,
    isBelowExcess,
    advisories,
    clauseAudit,
    selfPayNcdAfter: selfPayNcdAfterValue,
    claimNcdAfter: claimNcdAfterValue,
    basePremium: roundMoney(
      inputs.currentNcd < 100
        ? inputs.currentPremium / (1 - inputs.currentNcd / 100)
        : inputs.currentPremium,
    ),
  };
}
