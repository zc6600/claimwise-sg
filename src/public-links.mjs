import { INSURER_PROFILES, NCD_STEPS } from "./decision-data.mjs";
import { SHARED_INPUT_FIELDS, buildShareParams } from "./claim-share-link.mjs";
import { MAX_QUOTES } from "./car-decisions/quote-comparison.mjs";

/**
 * Public, stable URL formats that prefill a calculator. People share them, and AI
 * assistants build them to hand a user a ready-to-check result. Any parameter that is
 * missing or out of range is ignored and the tool falls back to its default, so a link
 * can never put a calculator into an invalid state.
 */

const INSURER_IDS = Object.keys(INSURER_PROFILES);

const number = (name, description, { min, max, values } = {}) => ({
  name,
  type: "number",
  description,
  ...(min !== undefined ? { min } : {}),
  ...(max !== undefined ? { max } : {}),
  ...(values ? { values } : {}),
});
const choice = (name, description, values) => ({ name, type: "enum", description, values });
const flag = (name, description) => ({ name, type: "boolean", description, values: ["1", "0"] });

const CALCULATOR_PARAMS = [
  choice("insurer", "Insurer whose NCD and excess rules apply.", INSURER_IDS),
  number("repairCost", "Workshop repair quote in S$.", { min: 0.01 }),
  number("currentPremium", "Current yearly premium after NCD, in S$.", { min: 0.01 }),
  number("currentNcd", "Current No-Claim Discount in percent.", { values: NCD_STEPS }),
  number("excess", "Own-damage excess on the policy schedule, in S$.", { min: 0 }),
  number("horizonYears", "Renewals compared.", { values: [3, 5] }),
  number("commercialClaimLoading", "PHV only: commercial claim loading in percent.", { min: 0, max: 100 }),
  number("dailyDowntimeCost", "PHV only: income lost per day off the road, in S$.", { min: 0, max: 5000 }),
  number("claimDowntimeDays", "PHV only: days off the road when claiming.", { min: 0, max: 60 }),
  number("selfPayDowntimeDays", "PHV only: days off the road when self-paying.", { min: 0, max: 60 }),
  number("baseGrowthRate", "Yearly premium growth in percent (default 5).", { min: -20, max: 50 }),
  number("discountRate", "Discount rate for future premiums in percent (default 3).", { min: 0, max: 20 }),
  choice("liability", "Who caused the accident.", ["at_fault", "non_fault", "partial_fault"]),
  choice("workshopType", "Workshop doing the repair.", ["authorized", "independent"]),
  choice("repairType", "Type of damage.", ["general", "windscreen"]),
  choice("vehicleUsage", "Private car or private-hire (PHV) car.", ["private", "phv"]),
  flag("ncdProtector", "The policy has an NCD Protector rider."),
  flag("youngDriverInvolved", "A young or inexperienced driver was driving."),
  flag("thirdPartyClaim", "The other party is claiming against this policy."),
];

const NCD_PROTECTOR_PARAMS = [
  choice("insurer", "Insurer whose rider eligibility applies.", INSURER_IDS),
  number("currentPremium", "Renewal premium after NCD, in S$.", { min: 0.01, max: 100000 }),
  number("currentNcd", "Current No-Claim Discount in percent.", { values: NCD_STEPS }),
  number("protectorCost", "Price of the NCD Protector rider this year, in S$.", { min: 0, max: 10000 }),
  number("claimProbabilityPct", "Chance of an at-fault claim this year, in percent.", { min: 0, max: 100 }),
  number("baseGrowthRate", "Yearly premium growth in percent (default 5).", { min: -20, max: 50 }),
];

const QUOTE_FIELDS = [
  { suffix: "Label", type: "string", description: "Quote name, up to 60 characters." },
  { suffix: "Premium", type: "number", description: "Quoted premium after NCD, in S$.", min: 0.01, max: 100000 },
  { suffix: "Excess", type: "number", description: "Own-damage excess, in S$.", min: 0, max: 50000 },
  { suffix: "Workshop", type: "number", description: "Extra excess at a non-authorised workshop, in S$.", min: 0, max: 50000 },
];

const QUOTE_COMPARE_PARAMS = [
  number("currentNcd", "Current No-Claim Discount in percent.", { values: NCD_STEPS }),
  number("incidentProbabilityPct", "Chance of an at-fault accident this year, in percent.", { min: 0, max: 100 }),
  number("typicalRepairCost", "Typical repair bill for such an accident, in S$.", { min: 0, max: 500000 }),
  choice("workshop", "Workshop the owner normally uses.", ["authorised", "independent"]),
  ...QUOTE_FIELDS.map((field) => ({
    name: `q{n}${field.suffix}`,
    type: field.type,
    description: `${field.description} n is 1 to ${MAX_QUOTES}; at least two quotes need a premium.`,
    ...(field.min !== undefined ? { min: field.min, max: field.max } : {}),
  })),
];

export const PUBLIC_LINK_SPECS = [
  {
    id: "calculator",
    path: "/calculator",
    title: "Claim or self-pay calculator",
    purpose: "After an accident, compares claiming on insurance with paying the workshop directly, including NCD loss over future renewals.",
    params: CALCULATOR_PARAMS,
    example: "/calculator?insurer=income&repairCost=1500&currentPremium=1650&currentNcd=50&excess=600",
  },
  {
    id: "ncd-protector",
    path: "/tools/ncd-protector",
    title: "NCD Protector calculator",
    purpose: "Finds the yearly claim chance at which the NCD Protector rider pays for itself.",
    params: NCD_PROTECTOR_PARAMS,
    example: "/tools/ncd-protector?insurer=etiqa&currentPremium=1200&currentNcd=50&protectorCost=80&claimProbabilityPct=5",
  },
  {
    id: "quote-compare",
    path: "/tools/quote-compare",
    title: "Renewal quote comparison",
    purpose: "Ranks renewal quotes by expected yearly cost, counting excess, workshop surcharge, and NCD loss.",
    params: QUOTE_COMPARE_PARAMS,
    example: "/tools/quote-compare?currentNcd=50&incidentProbabilityPct=5&typicalRepairCost=2500&q1Label=Renewal&q1Premium=1300&q1Excess=600&q2Label=Switch&q2Premium=1150&q2Excess=1000",
  },
];

const toNumber = (raw) => {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const inRange = (value, { min = -Infinity, max = Infinity } = {}) =>
  value !== null && value >= min && value <= max;

const ncdOf = (params) => {
  const value = toNumber(params.get("currentNcd"));
  return value !== null && NCD_STEPS.includes(value) ? value : null;
};

const appendUrl = (siteUrl, path, params) => {
  const query = params.toString();
  return `${siteUrl}${path}${query ? `?${query}` : ""}`;
};

/** Absolute calculator link for claim-decision inputs. */
export function buildCalculatorUrl(siteUrl, inputs) {
  return appendUrl(siteUrl, "/calculator", buildShareParams(inputs));
}

/** Reads NCD Protector inputs from a query string; unusable values are dropped. */
export function parseNcdProtectorParams(params) {
  const inputs = {};
  const insurer = params.get("insurer");
  if (insurer && INSURER_PROFILES[insurer]) inputs.insurer = insurer;
  const ncd = ncdOf(params);
  if (ncd !== null) inputs.currentNcd = ncd;
  for (const spec of NCD_PROTECTOR_PARAMS) {
    if (spec.type !== "number" || spec.name === "currentNcd") continue;
    const value = toNumber(params.get(spec.name));
    if (inRange(value, spec)) inputs[spec.name] = value;
  }
  return { inputs, hasExplicitParams: Object.keys(inputs).length > 0 };
}

export function buildNcdProtectorParams(inputs) {
  const params = new URLSearchParams();
  for (const spec of NCD_PROTECTOR_PARAMS) {
    const value = inputs[spec.name];
    if (value === undefined || value === null || value === "") continue;
    params.set(spec.name, String(value));
  }
  return params;
}

export function buildNcdProtectorUrl(siteUrl, inputs) {
  return appendUrl(siteUrl, "/tools/ncd-protector", buildNcdProtectorParams(inputs));
}

/**
 * Reads quote-comparison settings and quotes from a query string. Quotes are numbered
 * from 1; a quote is kept only when its premium is valid.
 */
export function parseQuoteCompareParams(params) {
  const settings = {};
  const ncd = ncdOf(params);
  if (ncd !== null) settings.currentNcd = ncd;
  for (const name of ["incidentProbabilityPct", "typicalRepairCost"]) {
    const spec = QUOTE_COMPARE_PARAMS.find((entry) => entry.name === name);
    const value = toNumber(params.get(name));
    if (inRange(value, spec)) settings[name] = value;
  }
  const workshop = params.get("workshop");
  if (workshop === "authorised" || workshop === "independent") {
    settings.usesNonAuthorisedWorkshop = workshop === "independent";
  }

  const quotes = [];
  for (let n = 1; n <= MAX_QUOTES; n += 1) {
    const premium = toNumber(params.get(`q${n}Premium`));
    if (!inRange(premium, { min: 0.01, max: 100000 })) continue;
    const excess = toNumber(params.get(`q${n}Excess`));
    const workshopSurcharge = toNumber(params.get(`q${n}Workshop`));
    const label = (params.get(`q${n}Label`) ?? "").trim().slice(0, 60);
    quotes.push({
      label: label || `Quote ${quotes.length + 1}`,
      premium,
      excess: inRange(excess, { min: 0, max: 50000 }) ? excess : "",
      workshopSurcharge: inRange(workshopSurcharge, { min: 0, max: 50000 }) ? workshopSurcharge : "",
    });
  }

  return {
    settings,
    quotes,
    hasExplicitParams: Object.keys(settings).length > 0 || quotes.length > 0,
  };
}

export function buildQuoteCompareParams({ quotes = [], ...settings }) {
  const params = new URLSearchParams();
  if (settings.currentNcd !== undefined) params.set("currentNcd", String(settings.currentNcd));
  for (const name of ["incidentProbabilityPct", "typicalRepairCost"]) {
    if (settings[name] !== undefined && settings[name] !== "") params.set(name, String(settings[name]));
  }
  if (settings.usesNonAuthorisedWorkshop !== undefined) {
    params.set("workshop", settings.usesNonAuthorisedWorkshop ? "independent" : "authorised");
  }
  quotes.slice(0, MAX_QUOTES).forEach((quote, index) => {
    const n = index + 1;
    if (quote.label) params.set(`q${n}Label`, quote.label);
    if (quote.premium !== undefined && quote.premium !== "") params.set(`q${n}Premium`, String(quote.premium));
    if (quote.excess !== undefined && quote.excess !== "") params.set(`q${n}Excess`, String(quote.excess));
    if (quote.workshopSurcharge !== undefined && quote.workshopSurcharge !== "") {
      params.set(`q${n}Workshop`, String(quote.workshopSurcharge));
    }
  });
  return params;
}

export function buildQuoteCompareUrl(siteUrl, inputs) {
  return appendUrl(siteUrl, "/tools/quote-compare", buildQuoteCompareParams(inputs));
}

/** Parameter names documented for the claim calculator; kept equal to what its parser accepts. */
export const CALCULATOR_PARAM_NAMES = CALCULATOR_PARAMS.map((param) => param.name);
export { SHARED_INPUT_FIELDS };
