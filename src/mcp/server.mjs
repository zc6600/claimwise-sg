import { calculateDecision } from "../decision-engine.mjs";
import { INSURER_PROFILES, NCD_STEPS } from "../decision-data.mjs";
import { validateDecisionInputs } from "../decision-validation.mjs";
import { evaluateNcdProtector } from "../car-decisions/ncd-protector.mjs";
import { MAX_QUOTES, compareQuotes } from "../car-decisions/quote-comparison.mjs";
import {
  POLICY_WORDINGS,
  WORDING_TOPICS,
  findTopicBySlug,
  findWording,
  wordingPageUrl,
  wordingTopicPath,
} from "../policy-wordings.mjs";
import {
  buildCalculatorUrl,
  buildNcdProtectorUrl,
  buildQuoteCompareUrl,
} from "../public-links.mjs";

/**
 * Stateless, dual-era Model Context Protocol server. Requests that carry their protocol
 * version in `_meta` are served under the modern per-request revision (2026-07-28);
 * requests without it follow the legacy `initialize` revisions, which this server can
 * also answer statelessly because it keeps no per-client state. Every tool is a thin
 * adapter over the same pure modules the website uses, so an agent's answer matches what
 * the user sees after opening the returned link.
 */

export const MODERN_PROTOCOL_VERSIONS = ["2026-07-28"];
export const LEGACY_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
export const SUPPORTED_PROTOCOL_VERSIONS = [...MODERN_PROTOCOL_VERSIONS, ...LEGACY_PROTOCOL_VERSIONS];

export const META = {
  protocolVersion: "io.modelcontextprotocol/protocolVersion",
  serverInfo: "io.modelcontextprotocol/serverInfo",
};

const LIST_TTL_MS = 3600000;

export const SERVER_INFO = {
  name: "claimwise-sg",
  title: "ClaimWise SG",
  version: "1.0.0",
};

const INSTRUCTIONS =
  "Singapore car-ownership decision tools. Use evaluate_claim after an accident to decide between claiming and paying the workshop directly; evaluate_ncd_protector and compare_quotes at renewal; get_policy_wording for verbatim insurer policy clauses with page citations. Every result includes a link that opens the same calculation on claimwise SG for the user to check. Results are general information from the figures supplied, not financial advice; the user's own policy schedule takes priority.";

const DISCLAIMER =
  "General information from the figures supplied, not financial advice. The policy schedule, certificate of insurance, and insurer's current wording take priority.";

export const ERROR = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  headerMismatch: -32020,
  unsupportedProtocolVersion: -32022,
};

const INSURER_IDS = Object.keys(INSURER_PROFILES);
const WORDING_IDS = POLICY_WORDINGS.map((wording) => wording.id);
const TOPIC_SLUGS = WORDING_TOPICS.map((topic) => topic.slug);

const money = (description, extra = {}) => ({ type: "number", description, ...extra });

export const TOOLS = [
  {
    name: "evaluate_claim",
    title: "Claim or self-pay after an accident",
    description:
      "Compares claiming an own-damage repair on Singapore motor insurance with paying the workshop directly. Counts the excess, the No-Claim Discount (NCD) step-down, and discounted renewal premiums over 3 or 5 years. Returns the cheaper option, both totals, the break-even repair cost, and a calculator link.",
    inputSchema: {
      type: "object",
      properties: {
        repairCost: money("Workshop repair quote in S$.", { minimum: 0, maximum: 500000 }),
        currentPremium: money("Current yearly premium after NCD, in S$.", { exclusiveMinimum: 0, maximum: 100000 }),
        excess: money("Own-damage excess on the policy schedule, in S$.", { minimum: 0, maximum: 50000 }),
        currentNcd: { type: "number", enum: NCD_STEPS, description: "Current NCD in percent. Default 0." },
        insurer: { type: "string", enum: INSURER_IDS, description: "Insurer whose NCD and excess rules apply. Default other." },
        horizonYears: { type: "number", enum: [3, 5], description: "Renewals compared. Default 3." },
        ncdProtector: { type: "boolean", description: "The policy has an NCD Protector rider." },
        liability: { type: "string", enum: ["at_fault", "non_fault", "partial_fault"], description: "Who caused the accident. Default at_fault." },
        thirdPartyClaim: { type: "boolean", description: "The other party is claiming against this policy." },
        workshopType: { type: "string", enum: ["authorized", "independent"], description: "Workshop doing the repair. Default authorized." },
        youngDriverInvolved: { type: "boolean", description: "A young or inexperienced driver was driving." },
        repairType: { type: "string", enum: ["general", "windscreen"], description: "Type of damage. Default general." },
        vehicleUsage: { type: "string", enum: ["private", "phv"], description: "Private car or private-hire car. Default private." },
        commercialClaimLoading: { type: "number", minimum: 0, maximum: 100, description: "PHV: commercial claim loading in percent." },
        dailyDowntimeCost: money("PHV: income lost per day off the road, in S$.", { minimum: 0, maximum: 5000 }),
        claimDowntimeDays: { type: "number", minimum: 0, maximum: 60, description: "PHV: days off the road when claiming." },
        selfPayDowntimeDays: { type: "number", minimum: 0, maximum: 60, description: "PHV: days off the road when self-paying." },
        baseGrowthRate: { type: "number", minimum: -20, maximum: 50, description: "Yearly premium growth in percent. Default 5." },
        discountRate: { type: "number", minimum: 0, maximum: 20, description: "Discount rate in percent. Default 3." },
      },
      required: ["repairCost", "currentPremium", "excess"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "evaluate_ncd_protector",
    title: "Is the NCD Protector rider worth it",
    description:
      "Prices the NCD Protector rider as insurance on the renewal-premium loss of one at-fault claim over five renewals. Returns the break-even yearly claim chance, the expected value at the stated chance, a buy/skip/neutral verdict, and a calculator link.",
    inputSchema: {
      type: "object",
      properties: {
        currentPremium: money("Renewal premium after NCD, in S$.", { exclusiveMinimum: 0, maximum: 100000 }),
        currentNcd: { type: "number", enum: NCD_STEPS, description: "Current NCD in percent." },
        protectorCost: money("Rider price this year, in S$.", { minimum: 0, maximum: 10000 }),
        claimProbabilityPct: { type: "number", minimum: 0, maximum: 100, description: "Chance of an at-fault claim this year, in percent. Default 5." },
        insurer: { type: "string", enum: INSURER_IDS, description: "Insurer whose rider eligibility applies. Default other." },
        baseGrowthRate: { type: "number", minimum: -20, maximum: 50, description: "Yearly premium growth in percent. Default 5." },
      },
      required: ["currentPremium", "currentNcd", "protectorCost"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "compare_quotes",
    title: "Compare renewal quotes",
    description:
      "Ranks 2 to 4 Singapore motor insurance renewal quotes by expected yearly cost, counting premium, excess, non-authorised workshop surcharge, and the NCD loss of one at-fault claim. Returns the ranking, whether the cheapest premium is also the best value, and a calculator link.",
    inputSchema: {
      type: "object",
      properties: {
        quotes: {
          type: "array",
          minItems: 2,
          maxItems: MAX_QUOTES,
          items: {
            type: "object",
            properties: {
              label: { type: "string", maxLength: 60, description: "Quote name, for example the insurer." },
              premium: money("Quoted premium after NCD, in S$.", { exclusiveMinimum: 0, maximum: 100000 }),
              excess: money("Own-damage excess, in S$.", { minimum: 0, maximum: 50000 }),
              workshopSurcharge: money("Extra excess at a non-authorised workshop, in S$.", { minimum: 0, maximum: 50000 }),
            },
            required: ["premium", "excess"],
            additionalProperties: false,
          },
        },
        currentNcd: { type: "number", enum: NCD_STEPS, description: "Current NCD in percent. Default 50." },
        incidentProbabilityPct: { type: "number", minimum: 0, maximum: 100, description: "Chance of an at-fault accident this year, in percent. Default 5." },
        typicalRepairCost: money("Typical repair bill for such an accident, in S$. Default 2500.", { minimum: 0, maximum: 500000 }),
        usesNonAuthorisedWorkshop: { type: "boolean", description: "The owner normally repairs at a non-authorised workshop." },
      },
      required: ["quotes"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_policy_wording",
    title: "Insurer policy wording",
    description:
      "Returns verbatim excerpts from Singapore private-car policy wordings on excess, workshop rules, young or unnamed driver excess, windscreen claims, NCD after a claim, and the NCD Protector, each with the PDF page it comes from. Filter by insurer, topic, or both.",
    inputSchema: {
      type: "object",
      properties: {
        insurer: { type: "string", enum: WORDING_IDS, description: "Insurer wording to return. Omit for all." },
        topic: { type: "string", enum: TOPIC_SLUGS, description: "Topic to return. Omit for all." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

class ToolInputError extends Error {}

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

function requireNumber(args, name, { min = -Infinity, max = Infinity, exclusiveMin = false, values } = {}) {
  const value = args[name];
  const ok =
    isNumber(value) &&
    (values ? values.includes(value) : (exclusiveMin ? value > min : value >= min) && value <= max);
  if (!ok) {
    const range = values ? `one of ${values.join(", ")}` : `a number ${exclusiveMin ? "above" : "from"} ${min}${Number.isFinite(max) ? ` to ${max}` : ""}`;
    throw new ToolInputError(`${name} must be ${range}.`);
  }
  return value;
}

function optionalNumber(args, name, limits) {
  return args[name] === undefined ? undefined : requireNumber(args, name, limits);
}

function rejectUnknown(args, allowed) {
  const unknown = Object.keys(args).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new ToolInputError(`Unknown argument: ${unknown.join(", ")}.`);
}

function toolProperties(name) {
  return Object.keys(TOOLS.find((tool) => tool.name === name).inputSchema.properties);
}

/** Rejects values whose JSON type differs from the published schema, such as "1500" for a number. */
function enforceSchemaTypes(args, toolName) {
  const { properties } = TOOLS.find((tool) => tool.name === toolName).inputSchema;
  for (const [field, value] of Object.entries(args)) {
    const expected = properties[field]?.type;
    if (value === undefined || !expected) continue;
    const ok =
      expected === "number" ? isNumber(value) :
      expected === "boolean" ? typeof value === "boolean" :
      expected === "string" ? typeof value === "string" :
      true;
    if (!ok) throw new ToolInputError(`${field} must be a ${expected === "boolean" ? "true or false value" : expected}.`);
  }
}

function runEvaluateClaim(args, { siteUrl }) {
  rejectUnknown(args, toolProperties("evaluate_claim"));
  enforceSchemaTypes(args, "evaluate_claim");
  const invalid = validateDecisionInputs(args);
  if (invalid) throw new ToolInputError(invalid.message);

  const decision = calculateDecision(args);
  const { baseScenario: scenario, inputs } = decision;
  return {
    recommendation: decision.recommendation,
    summary:
      decision.recommendation === "claim"
        ? `Claiming is cheaper by S$${Math.abs(scenario.difference).toFixed(2)} over ${inputs.horizonYears} years.`
        : decision.isBelowExcess
          ? "Self-pay: the repair costs no more than the effective excess, so a claim would recover nothing."
          : `Self-paying is cheaper by S$${Math.abs(scenario.difference).toFixed(2)} over ${inputs.horizonYears} years.`,
    horizonYears: inputs.horizonYears,
    effectiveExcess: decision.effectiveExcess,
    breakEvenRepairCost: scenario.breakEvenRepairCost,
    selfPay: {
      totalCost: scenario.selfPayTotal,
      paidNow: scenario.selfPayDay0Cost,
      futurePremiumsPresentValue: scenario.selfPayFutureDiscounted,
      ncdAfter: decision.selfPayNcdAfter,
    },
    claim: {
      totalCost: scenario.claimTotal,
      paidNow: scenario.claimDay0Cost,
      futurePremiumsPresentValue: scenario.claimFutureDiscounted,
      ncdAfter: decision.claimNcdAfter,
    },
    notices: decision.advisories.map(({ title, message }) => ({ title, message })),
    insurerRules: INSURER_PROFILES[inputs.insurer]?.name ?? null,
    calculatorUrl: buildCalculatorUrl(siteUrl, inputs),
    disclaimer: DISCLAIMER,
  };
}

function runEvaluateNcdProtector(args, { siteUrl }) {
  rejectUnknown(args, toolProperties("evaluate_ncd_protector"));
  enforceSchemaTypes(args, "evaluate_ncd_protector");
  const inputs = {
    currentPremium: requireNumber(args, "currentPremium", { min: 0, max: 100000, exclusiveMin: true }),
    currentNcd: requireNumber(args, "currentNcd", { values: NCD_STEPS }),
    protectorCost: requireNumber(args, "protectorCost", { min: 0, max: 10000 }),
    claimProbabilityPct: optionalNumber(args, "claimProbabilityPct", { min: 0, max: 100 }) ?? 5,
    baseGrowthRate: optionalNumber(args, "baseGrowthRate", { min: -20, max: 50 }) ?? 5,
    insurer: args.insurer ?? "other",
  };
  if (!INSURER_PROFILES[inputs.insurer]) {
    throw new ToolInputError(`insurer must be one of ${INSURER_IDS.join(", ")}.`);
  }
  const result = evaluateNcdProtector(inputs);
  return {
    recommendation: result.recommendation,
    eligible: result.eligible,
    premiumLossAvoided: result.premiumLossAvoided ?? null,
    breakEvenClaimProbabilityPct: result.breakEvenProbabilityPct ?? null,
    expectedBenefit: result.expectedBenefit ?? null,
    netExpectedValue: result.netExpectedValue ?? null,
    claimProbabilityPct: inputs.claimProbabilityPct,
    calculatorUrl: buildNcdProtectorUrl(siteUrl, inputs),
    disclaimer: DISCLAIMER,
  };
}

function runCompareQuotes(args, { siteUrl }) {
  rejectUnknown(args, toolProperties("compare_quotes"));
  if (!Array.isArray(args.quotes) || args.quotes.length < 2 || args.quotes.length > MAX_QUOTES) {
    throw new ToolInputError(`quotes must list 2 to ${MAX_QUOTES} quotes.`);
  }
  const quotes = args.quotes.map((quote, index) => {
    if (!quote || typeof quote !== "object" || Array.isArray(quote)) {
      throw new ToolInputError(`quotes[${index}] must be an object.`);
    }
    rejectUnknown(quote, ["label", "premium", "excess", "workshopSurcharge"]);
    if (quote.label !== undefined && typeof quote.label !== "string") {
      throw new ToolInputError(`quotes[${index}].label must be text.`);
    }
    const at = (name) => `quotes[${index}].${name}`;
    const read = (name, limits, required) => {
      const value = quote[name];
      if (value === undefined && !required) return 0;
      return requireNumber({ [at(name)]: value }, at(name), limits);
    };
    return {
      label: quote.label?.trim().slice(0, 60) || `Quote ${index + 1}`,
      premium: read("premium", { min: 0, max: 100000, exclusiveMin: true }, true),
      excess: read("excess", { min: 0, max: 50000 }, true),
      workshopSurcharge: read("workshopSurcharge", { min: 0, max: 50000 }, false),
    };
  });
  if (args.usesNonAuthorisedWorkshop !== undefined && typeof args.usesNonAuthorisedWorkshop !== "boolean") {
    throw new ToolInputError("usesNonAuthorisedWorkshop must be true or false.");
  }
  const inputs = {
    quotes,
    currentNcd: optionalNumber(args, "currentNcd", { values: NCD_STEPS }) ?? 50,
    incidentProbabilityPct: optionalNumber(args, "incidentProbabilityPct", { min: 0, max: 100 }) ?? 5,
    typicalRepairCost: optionalNumber(args, "typicalRepairCost", { min: 0, max: 500000 }) ?? 2500,
    usesNonAuthorisedWorkshop: args.usesNonAuthorisedWorkshop ?? false,
  };
  const result = compareQuotes(inputs);
  return {
    bestValue: result.bestLabel,
    lowestPremium: result.lowestPremiumLabel,
    lowestPremiumIsBestValue: result.lowestPremiumIsBest,
    expectedSavingVsLowestPremium: result.expectedSavingVsLowestPremium,
    ranking: result.quotes.map((quote) => ({
      label: quote.label,
      premium: quote.premium,
      effectiveExcess: quote.effectiveExcess,
      ncdLossIfClaiming: quote.ncdLoss,
      wouldClaim: quote.wouldClaim,
      expectedYearlyCost: quote.expectedCost,
    })),
    calculatorUrl: buildQuoteCompareUrl(siteUrl, inputs),
    disclaimer: DISCLAIMER,
  };
}

function runGetPolicyWording(args, { siteUrl }) {
  rejectUnknown(args, ["insurer", "topic"]);
  enforceSchemaTypes(args, "get_policy_wording");
  const wordings = args.insurer === undefined ? POLICY_WORDINGS : [findWording(args.insurer)];
  if (wordings.includes(null)) throw new ToolInputError(`insurer must be one of ${WORDING_IDS.join(", ")}.`);
  const topics = args.topic === undefined ? WORDING_TOPICS : [findTopicBySlug(args.topic)];
  if (topics.includes(null)) throw new ToolInputError(`topic must be one of ${TOPIC_SLUGS.join(", ")}.`);

  return {
    wordings: wordings.map((wording) => ({
      insurer: wording.insurer,
      document: `${wording.document} (${wording.version})`,
      pdfUrl: `${siteUrl}${wording.pdfFile}`,
      topics: topics.map((topic) => {
        const entry = wording.entries[topic.id];
        return {
          topic: topic.slug,
          question: topic.question,
          summary: entry.summary,
          section: entry.section,
          page: entry.page,
          excerpt: entry.excerpt,
          table: entry.table ?? null,
          note: entry.note ?? null,
          sourceUrl: `${siteUrl}${wordingPageUrl(wording, entry.page)}`,
          pageUrl: `${siteUrl}${wordingTopicPath(wording, topic)}`,
        };
      }),
    })),
    disclaimer:
      "Excerpts are copied from the cited pages. Amounts that vary by policy are printed on the policyholder's own schedule, which takes priority.",
  };
}

const RUNNERS = {
  evaluate_claim: runEvaluateClaim,
  evaluate_ncd_protector: runEvaluateNcdProtector,
  compare_quotes: runCompareQuotes,
  get_policy_wording: runGetPolicyWording,
};

/** Runs one tool and wraps the outcome as an MCP `CallToolResult`. */
export function callTool(name, args = {}, context) {
  const run = RUNNERS[name];
  if (!run) return null;
  try {
    const result = run(args ?? {}, context);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
      isError: false,
    };
  } catch (error) {
    if (!(error instanceof ToolInputError)) throw error;
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
}

const reply = (id, result) => ({ jsonrpc: "2.0", id, result });
const fail = (id, code, message, data) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message, ...(data !== undefined ? { data } : {}) },
});

const isValidId = (id) => typeof id === "string" || Number.isSafeInteger(id);

/** The protocol version a modern request declares in `_meta`, or undefined for legacy traffic. */
export function declaredProtocolVersion(message) {
  const meta = message?.params?._meta;
  return meta && typeof meta === "object" ? meta[META.protocolVersion] : undefined;
}

function callToolResult(id, params, context) {
  if (typeof params.name !== "string") return fail(id, ERROR.invalidParams, "params.name is required.");
  const args = params.arguments ?? {};
  if (typeof args !== "object" || Array.isArray(args)) {
    return fail(id, ERROR.invalidParams, "params.arguments must be an object.");
  }
  return callTool(params.name, args, context);
}

function handleModern(id, method, params, version, context) {
  if (!MODERN_PROTOCOL_VERSIONS.includes(version)) {
    return fail(id, ERROR.unsupportedProtocolVersion, "Unsupported protocol version", {
      supported: SUPPORTED_PROTOCOL_VERSIONS,
      requested: version,
    });
  }
  const complete = (result) =>
    reply(id, { resultType: "complete", ...result, _meta: { [META.serverInfo]: SERVER_INFO } });

  switch (method) {
    case "server/discover":
      return complete({
        supportedVersions: SUPPORTED_PROTOCOL_VERSIONS,
        capabilities: { tools: {} },
        instructions: INSTRUCTIONS,
        ttlMs: LIST_TTL_MS,
        cacheScope: "public",
      });
    case "tools/list":
      return complete({ tools: TOOLS, ttlMs: LIST_TTL_MS, cacheScope: "public" });
    case "tools/call": {
      const result = callToolResult(id, params, context);
      if (result === null) return fail(id, ERROR.invalidParams, `Unknown tool: ${params.name}.`);
      return result.error ? result : complete(result);
    }
    default:
      return fail(id, ERROR.methodNotFound, `Method not found: ${method}.`);
  }
}

function handleLegacy(id, method, params, context) {
  switch (method) {
    case "initialize": {
      const requested = params.protocolVersion;
      const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
      if (typeof requested !== "string" || !isObject(params.capabilities) || !isObject(params.clientInfo)) {
        return fail(id, ERROR.invalidParams, "initialize requires protocolVersion, capabilities, and clientInfo.");
      }
      return reply(id, {
        protocolVersion: LEGACY_PROTOCOL_VERSIONS.includes(requested) ? requested : LEGACY_PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: TOOLS });
    case "tools/call": {
      const result = callToolResult(id, params, context);
      if (result === null) return fail(id, ERROR.invalidParams, `Unknown tool: ${params.name}.`);
      return result.error ? result : reply(id, result);
    }
    default:
      return fail(id, ERROR.methodNotFound, `Method not found: ${method}.`);
  }
}

/**
 * Answers one JSON-RPC message. Returns null for notifications and for responses sent by
 * the client, which need no reply.
 */
export function handleMcpMessage(message, context) {
  if (!message || typeof message !== "object" || Array.isArray(message) || message.jsonrpc !== "2.0") {
    return fail(null, ERROR.invalidRequest, "Expected a JSON-RPC 2.0 message.");
  }
  const hasId = Object.hasOwn(message, "id");
  if (hasId && !isValidId(message.id)) {
    return fail(null, ERROR.invalidRequest, "Request id must be a string or an integer.");
  }
  if (typeof message.method !== "string") {
    // A client response (result or error) carries an id but no method.
    return hasId && (Object.hasOwn(message, "result") || Object.hasOwn(message, "error"))
      ? null
      : fail(hasId ? message.id : null, ERROR.invalidRequest, "Missing method.");
  }
  if (!hasId) return null;

  const { id, method } = message;
  const params = message.params ?? {};
  if (typeof params !== "object" || Array.isArray(params)) {
    return fail(id, ERROR.invalidParams, "params must be an object.");
  }

  const version = declaredProtocolVersion(message);
  return version === undefined
    ? handleLegacy(id, method, params, context)
    : handleModern(id, method, params, version, context);
}

export const MCP_PARSE_ERROR = fail(null, ERROR.parse, "Request body must be valid JSON.");
export { fail as jsonRpcError };
