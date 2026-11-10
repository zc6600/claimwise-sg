import test from "node:test";
import assert from "node:assert/strict";
import { calculateDecision } from "../src/decision-engine.mjs";
import { evaluateNcdProtector } from "../src/car-decisions/ncd-protector.mjs";
import { parseSharedInputs } from "../src/claim-share-link.mjs";
import {
  CALCULATOR_PARAM_NAMES,
  PUBLIC_LINK_SPECS,
  SHARED_INPUT_FIELDS,
  buildCalculatorUrl,
  buildNcdProtectorUrl,
  buildQuoteCompareUrl,
  parseNcdProtectorParams,
  parseQuoteCompareParams,
} from "../src/public-links.mjs";
import {
  POLICY_WORDINGS,
  WORDING_TOPICS,
  findTopicBySlug,
  findWording,
  wordingTopicPath,
} from "../src/policy-wordings.mjs";
import { allPublicPages } from "../src/site-pages.mjs";
import { buildLlmsFullTxt, buildLlmsTxt } from "../src/llms-text.mjs";
import { serializeJsonLd, wordingPageGraph } from "../src/structured-data.mjs";
import {
  LEGACY_PROTOCOL_VERSIONS,
  SUPPORTED_PROTOCOL_VERSIONS,
  TOOLS,
  handleMcpMessage,
} from "../src/mcp/server.mjs";
import { decodeHeaderValue, handleMcpPost } from "../src/mcp/http.mjs";
import { POST as mcpPost, GET as mcpGet } from "../app/mcp/route.js";
import sitemap from "../app/sitemap.js";

const SITE = "https://claimwise.example";
const context = { siteUrl: SITE };
const call = (name, args, id = 1) =>
  handleMcpMessage({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }, context);

test("documented calculator parameters match what the share-link parser accepts", () => {
  assert.deepEqual([...CALCULATOR_PARAM_NAMES].sort(), [...SHARED_INPUT_FIELDS].sort());
  for (const spec of PUBLIC_LINK_SPECS) {
    assert.ok(spec.example.startsWith(spec.path), `${spec.id} example uses its own path`);
  }
});

test("calculator links round-trip through the parser used by the page", () => {
  const inputs = { insurer: "msig", repairCost: 1800, currentPremium: 1400, currentNcd: 40, excess: 500, horizonYears: 5 };
  const url = new URL(buildCalculatorUrl(SITE, inputs));
  assert.equal(url.pathname, "/calculator");
  const { inputs: parsed, hasExplicitParams } = parseSharedInputs(url.searchParams, {});
  assert.equal(hasExplicitParams, true);
  for (const [key, value] of Object.entries(inputs)) assert.equal(parsed[key], value);
});

test("NCD Protector links keep valid values and drop invalid ones", () => {
  const url = new URL(buildNcdProtectorUrl(SITE, { insurer: "etiqa", currentPremium: 1200, currentNcd: 50, protectorCost: 80 }));
  assert.deepEqual(parseNcdProtectorParams(url.searchParams).inputs, {
    insurer: "etiqa",
    currentPremium: 1200,
    currentNcd: 50,
    protectorCost: 80,
  });
  const tampered = parseNcdProtectorParams(
    new URLSearchParams("insurer=nobody&currentNcd=35&claimProbabilityPct=150&protectorCost=")
  );
  assert.deepEqual(tampered, { inputs: {}, hasExplicitParams: false });
});

test("quote comparison links round-trip quotes and settings", () => {
  const inputs = {
    currentNcd: 30,
    incidentProbabilityPct: 8,
    typicalRepairCost: 3000,
    usesNonAuthorisedWorkshop: true,
    quotes: [
      { label: "Renewal", premium: 1300, excess: 600, workshopSurcharge: 500 },
      { label: "Switch", premium: 1150, excess: 1000, workshopSurcharge: 0 },
    ],
  };
  const parsed = parseQuoteCompareParams(new URL(buildQuoteCompareUrl(SITE, inputs)).searchParams);
  assert.deepEqual(parsed.settings, {
    currentNcd: 30,
    incidentProbabilityPct: 8,
    typicalRepairCost: 3000,
    usesNonAuthorisedWorkshop: true,
  });
  assert.deepEqual(parsed.quotes, inputs.quotes);

  const sparse = parseQuoteCompareParams(new URLSearchParams("q2Premium=900&q3Premium=-5&q4Premium=abc"));
  assert.deepEqual(sparse.quotes, [{ label: "Quote 1", premium: 900, excess: "", workshopSurcharge: "" }]);
});

test("every insurer and topic has a unique rules page in the sitemap", () => {
  const paths = allPublicPages().map((page) => page.path);
  assert.equal(new Set(paths).size, paths.length, "no duplicate paths");
  for (const wording of POLICY_WORDINGS) {
    assert.ok(paths.includes(`/rules/${wording.id}`));
    for (const topic of WORDING_TOPICS) assert.ok(paths.includes(wordingTopicPath(wording, topic)));
  }
  for (const topic of WORDING_TOPICS) {
    assert.equal(findTopicBySlug(topic.slug), topic);
    assert.match(topic.slug, /^[a-z0-9-]+$/);
  }
  const urls = sitemap().map((entry) => entry.url);
  assert.equal(urls.length, paths.length);
  assert.ok(urls.every((url) => !url.includes("/api/") && !url.includes("/reminders/")));
});

test("DirectAsia wording is on file with its own NCD scales", () => {
  const directAsia = findWording("directasia");
  assert.ok(directAsia);
  assert.equal(directAsia.calculatorInsurer, null);
  assert.deepEqual(directAsia.entries.ncdScale.table.rows[1], ["50%", "20%", "0%"]);
  assert.deepEqual(directAsia.entries.ncdProtector.table.rows[2], ["40%", "50%", "10%", "0%"]);
});

test("llms.txt lists pages, link formats, and the MCP endpoint", () => {
  const text = buildLlmsTxt(SITE);
  assert.match(text, /^# ClaimWise SG\n\n> /);
  assert.ok(text.includes(`${SITE}/mcp`));
  assert.ok(text.includes(`${SITE}/llms-full.txt`));
  for (const spec of PUBLIC_LINK_SPECS) assert.ok(text.includes(`${SITE}${spec.example}`));
  for (const tool of TOOLS) assert.ok(text.includes(`\`${tool.name}\``));

  const full = buildLlmsFullTxt(SITE);
  for (const wording of POLICY_WORDINGS) {
    for (const topic of WORDING_TOPICS) {
      for (const paragraph of wording.entries[topic.id].excerpt ?? []) assert.ok(full.includes(`> ${paragraph}`));
    }
  }
  assert.ok(!full.includes("\n\n\n"));
});

test("JSON-LD cites the quoted documents and cannot close its script tag", () => {
  const graph = wordingPageGraph(SITE, {
    path: "/rules/etiqa/excess",
    headline: "</script><script>alert(1)</script>",
    description: "Test",
    citations: [{ name: "Etiqa wording", path: "/policies/etiqa_tiq_motor_policy.pdf#page=16", publisher: "Etiqa" }],
    crumbs: [{ name: "Insurer rules", path: "/rules" }],
  });
  const article = graph["@graph"][0];
  assert.equal(article.citation[0].url, `${SITE}/policies/etiqa_tiq_motor_policy.pdf#page=16`);
  const serialized = serializeJsonLd(graph);
  assert.ok(!serialized.includes("</script>"));
  assert.deepEqual(JSON.parse(serialized), graph);
});

test("MCP initialize negotiates a supported protocol version", () => {
  const known = handleMcpMessage(
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
    context
  );
  assert.equal(known.result.protocolVersion, "2025-03-26");
  assert.deepEqual(known.result.capabilities, { tools: { listChanged: false } });
  const unknown = handleMcpMessage(
    { jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
    context
  );
  const incomplete = handleMcpMessage({ jsonrpc: "2.0", id: 6, method: "initialize", params: {} }, context);
  assert.equal(incomplete.error.code, -32602);
  assert.equal(unknown.result.protocolVersion, LEGACY_PROTOCOL_VERSIONS[0]);
  assert.equal(handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, context), null);
  assert.deepEqual(handleMcpMessage({ jsonrpc: "2.0", id: 3, method: "ping" }, context).result, {});
  assert.equal(handleMcpMessage({ jsonrpc: "2.0", id: 4, method: "resources/list" }, context).error.code, -32601);
  assert.equal(handleMcpMessage({ id: 5, method: "ping" }, context).error.code, -32600);
  for (const id of [null, true, 1.5, { n: 1 }]) {
    const invalid = handleMcpMessage({ jsonrpc: "2.0", id, method: "tools/list" }, context);
    assert.equal(invalid.error.code, -32600, `id ${JSON.stringify(id)} is rejected`);
    assert.equal(invalid.id, null);
  }
});

test("MCP tools/list advertises read-only tools with object schemas", () => {
  const { tools } = handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "tools/list" }, context).result;
  assert.deepEqual(tools.map((tool) => tool.name), ["evaluate_claim", "evaluate_ncd_protector", "compare_quotes", "get_policy_wording"]);
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.annotations.readOnlyHint, true);
    for (const required of tool.inputSchema.required ?? []) assert.ok(tool.inputSchema.properties[required]);
  }
});

test("MCP evaluate_claim returns the same figures as the website engine", () => {
  const args = { repairCost: 1500, currentPremium: 2000, currentNcd: 50, excess: 600, insurer: "income" };
  const { result } = call("evaluate_claim", args);
  assert.equal(result.isError, false);
  const decision = calculateDecision(args);
  const output = result.structuredContent;
  assert.equal(output.recommendation, decision.recommendation);
  assert.equal(output.selfPay.totalCost, decision.baseScenario.selfPayTotal);
  assert.equal(output.claim.totalCost, decision.baseScenario.claimTotal);
  assert.equal(output.breakEvenRepairCost, decision.baseScenario.breakEvenRepairCost);
  assert.deepEqual(JSON.parse(result.content[0].text), output);
  const linked = parseSharedInputs(new URL(output.calculatorUrl).searchParams, {}).inputs;
  assert.equal(calculateDecision(linked).baseScenario.claimTotal, decision.baseScenario.claimTotal);
});

test("MCP tools report invalid arguments as tool errors, not protocol errors", () => {
  for (const [name, args] of [
    ["evaluate_claim", { repairCost: 1500, currentPremium: 0, excess: 600 }],
    ["evaluate_claim", { repairCost: 1500, currentPremium: 1000, excess: 600, ncdProtector: "yes" }],
    ["evaluate_claim", { repairCost: 1500, currentPremium: 1000, excess: 600, surprise: 1 }],
    ["evaluate_ncd_protector", { currentPremium: 1000, currentNcd: 35, protectorCost: 80 }],
    ["compare_quotes", { quotes: [{ premium: 1000, excess: 500 }] }],
    ["compare_quotes", { quotes: [{ premium: 1000, excess: 500 }, { premium: "900", excess: 500 }] }],
    ["get_policy_wording", { insurer: "nobody" }],
  ]) {
    const { result } = call(name, args);
    assert.equal(result.isError, true, `${name} ${JSON.stringify(args)}`);
    assert.ok(result.content[0].text.length > 0);
  }
  const unknownTool = call("delete_everything", {});
  assert.equal(unknownTool.error.code, -32602);
});

test("MCP NCD Protector and quote tools match their website modules", () => {
  const protector = call("evaluate_ncd_protector", { currentPremium: 1200, currentNcd: 50, protectorCost: 80, insurer: "etiqa" });
  const expected = evaluateNcdProtector({ currentPremium: 1200, currentNcd: 50, protectorCost: 80, insurer: "etiqa", claimProbabilityPct: 5, baseGrowthRate: 5 });
  assert.equal(protector.result.structuredContent.breakEvenClaimProbabilityPct, expected.breakEvenProbabilityPct);
  assert.equal(protector.result.structuredContent.recommendation, expected.recommendation);

  const quotes = call("compare_quotes", {
    quotes: [
      { label: "Cheap, high excess", premium: 1100, excess: 2500 },
      { label: "Dearer, low excess", premium: 1180, excess: 500 },
    ],
    incidentProbabilityPct: 20,
  }).result.structuredContent;
  assert.equal(quotes.ranking.length, 2);
  assert.ok(quotes.ranking[0].expectedYearlyCost <= quotes.ranking[1].expectedYearlyCost);
  assert.equal(quotes.lowestPremium, "Cheap, high excess");
});

test("MCP get_policy_wording filters by insurer and topic", () => {
  const output = call("get_policy_wording", { insurer: "directasia", topic: "ncd-protector" }).result.structuredContent;
  assert.equal(output.wordings.length, 1);
  const [entry] = output.wordings[0].topics;
  assert.equal(entry.page, 9);
  assert.equal(entry.pageUrl, `${SITE}/rules/directasia/ncd-protector`);
  assert.ok(entry.sourceUrl.endsWith("#page=9&view=FitH"));
  const all = call("get_policy_wording", {}).result.structuredContent;
  assert.equal(all.wordings.length, POLICY_WORDINGS.length);
  assert.equal(all.wordings[0].topics.length, WORDING_TOPICS.length);
});

const MODERN = "2026-07-28";
const modernMessage = (id, method, params = {}) => ({
  jsonrpc: "2.0",
  id,
  method,
  params: {
    ...params,
    _meta: {
      "io.modelcontextprotocol/protocolVersion": MODERN,
      "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" },
      "io.modelcontextprotocol/clientCapabilities": {},
    },
  },
});
const modernHeaders = (message, extra = {}) =>
  new Headers({
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": MODERN,
    "mcp-method": message.method,
    ...(message.method === "tools/call" ? { "mcp-name": message.params.name } : {}),
    ...extra,
  });
const postPure = (message, headers) =>
  handleMcpPost({ rawBody: JSON.stringify(message), headers, siteUrl: SITE });

test("modern MCP requests are served statelessly with server/discover", () => {
  const discover = modernMessage("d1", "server/discover");
  const found = postPure(discover, modernHeaders(discover));
  assert.equal(found.status, 200);
  assert.equal(found.body.result.resultType, "complete");
  assert.deepEqual(found.body.result.supportedVersions, SUPPORTED_PROTOCOL_VERSIONS);
  assert.deepEqual(found.body.result.capabilities, { tools: {} });
  assert.equal(found.body.result._meta["io.modelcontextprotocol/serverInfo"].name, "claimwise-sg");
  assert.equal(found.body.result.cacheScope, "public");

  const list = modernMessage(2, "tools/list");
  const listed = postPure(list, modernHeaders(list)).body.result;
  assert.equal(listed.tools.length, TOOLS.length);
  assert.ok(listed.ttlMs > 0);

  const toolCall = modernMessage(3, "tools/call", {
    name: "evaluate_claim",
    arguments: { repairCost: 1500, currentPremium: 2000, currentNcd: 50, excess: 600 },
  });
  const called = postPure(toolCall, modernHeaders(toolCall)).body.result;
  assert.equal(called.resultType, "complete");
  assert.equal(called.isError, false);
  assert.ok(called.structuredContent.calculatorUrl.startsWith(`${SITE}/calculator?`));

  const ping = modernMessage(4, "ping");
  const removed = postPure(ping, modernHeaders(ping));
  assert.equal(removed.status, 404);
  assert.equal(removed.body.error.code, -32601);
});

test("modern MCP requests are rejected on version or header mismatch", () => {
  const future = { ...modernMessage(1, "tools/list") };
  future.params._meta["io.modelcontextprotocol/protocolVersion"] = "2099-01-01";
  const unsupported = postPure(future, modernHeaders(future, { "mcp-protocol-version": "2099-01-01" }));
  assert.equal(unsupported.status, 400);
  assert.equal(unsupported.body.error.code, -32022);
  assert.deepEqual(unsupported.body.error.data, { supported: SUPPORTED_PROTOCOL_VERSIONS, requested: "2099-01-01" });

  const list = modernMessage(2, "tools/list");
  const noVersionHeader = postPure(list, modernHeaders(list, { "mcp-protocol-version": "" }));
  assert.equal(noVersionHeader.status, 400);
  assert.equal(noVersionHeader.body.error.code, -32020);

  const wrongMethod = postPure(list, modernHeaders(list, { "mcp-method": "tools/call" }));
  assert.equal(wrongMethod.body.error.code, -32020);

  const toolCall = modernMessage(3, "tools/call", { name: "get_policy_wording", arguments: {} });
  assert.equal(postPure(toolCall, modernHeaders(toolCall, { "mcp-name": "evaluate_claim" })).status, 400);
  const encoded = `=?base64?${btoa("get_policy_wording")}?=`;
  assert.equal(postPure(toolCall, modernHeaders(toolCall, { "mcp-name": encoded })).status, 200);
  assert.equal(decodeHeaderValue("=?base64?SGVsbG8sIOS4lueVjA==?="), "Hello, 世界");

  const legacyBodyModernHeader = postPure(
    { jsonrpc: "2.0", id: 9, method: "tools/list" },
    new Headers({ "content-type": "application/json", "mcp-protocol-version": MODERN })
  );
  assert.equal(legacyBodyModernHeader.body.error.code, -32020);
});

test("MCP HTTP binding checks media types and batching rules", () => {
  const ping = { jsonrpc: "2.0", id: 1, method: "ping" };
  const textBody = handleMcpPost({ rawBody: JSON.stringify(ping), headers: new Headers({ "content-type": "text/plain" }), siteUrl: SITE });
  assert.equal(textBody.status, 415);
  const htmlOnly = postPure(ping, new Headers({ "content-type": "application/json", accept: "text/html" }));
  assert.equal(htmlOnly.status, 406);
  const discover = modernMessage(1, "server/discover");
  const jsonOnlyModern = postPure(discover, modernHeaders(discover, { accept: "application/json" }));
  assert.equal(jsonOnlyModern.status, 406);

  const batch = [{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }];
  const legacyJson = new Headers({ "content-type": "application/json; charset=utf-8" });
  assert.deepEqual(handleMcpPost({ rawBody: JSON.stringify(batch), headers: legacyJson, siteUrl: SITE }).body, [
    { jsonrpc: "2.0", id: 1, result: {} },
  ]);
  const newerLegacy = new Headers({ "content-type": "application/json", "mcp-protocol-version": "2025-06-18" });
  assert.equal(handleMcpPost({ rawBody: JSON.stringify(batch), headers: newerLegacy, siteUrl: SITE }).status, 400);

  const strings = { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "evaluate_claim", arguments: { repairCost: "1500", currentPremium: 1000, excess: 600 } } };
  assert.equal(postPure(strings, legacyJson).body.result.isError, true);
});

test("MCP HTTP route answers JSON-RPC over POST and refuses event streams", async () => {
  const post = (body, headers = { "content-type": "application/json" }) =>
    mcpPost(new Request(`${SITE}/mcp`, { method: "POST", headers, body }));

  const listed = await post(JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/list" }));
  assert.equal(listed.status, 200);
  assert.equal(listed.headers.get("access-control-allow-origin"), "*");
  assert.equal((await listed.json()).id, 7);

  const notification = await post(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }));
  assert.equal(notification.status, 202);

  const malformed = await post("{");
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, -32700);

  const multibyte = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: { pad: "界".repeat(22000) } });
  assert.ok(multibyte.length < 65536 && new TextEncoder().encode(multibyte).length > 65536);
  assert.equal((await post(multibyte)).status, 413);

  assert.equal(mcpGet().status, 405);
});
