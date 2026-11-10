import { CORE_PAGES, wordingPages } from "./site-pages.mjs";
import { PUBLIC_LINK_SPECS } from "./public-links.mjs";
import { TOOLS } from "./mcp/server.mjs";
import {
  INSURERS_WITHOUT_WORDING,
  POLICY_WORDINGS,
  WORDINGS_REVIEWED_ON,
  WORDING_TOPICS,
  wordingPageUrl,
  wordingTopicPath,
} from "./policy-wordings.mjs";

/**
 * llms.txt (https://llmstxt.org) for AI assistants and crawlers: what the site is, which
 * page answers which question, how to build a prefilled calculator link, and where the
 * MCP server lives. The full variant adds every quoted policy clause.
 */

const SUMMARY =
  "Free, independent calculators for the expensive decisions of owning a car in Singapore: claim or self-pay after an accident, NCD Protector, renewal quotes, COE renewal, car loan early settlement, and the true cost of ownership. Every tool runs on the user's own figures, shows its method, and cites the insurer, GIA, or LTA rule it uses. ClaimWise does not sell insurance or loans.";

const GUIDANCE = [
  "Results are general information, not financial advice; the user's policy schedule and current official rules take priority.",
  "To show a user a specific result, build a prefilled link (see Prefilled calculator links) or call the MCP server; the page recomputes the same figures in the browser.",
  "Insurer rules pages quote policy wording word for word with the PDF page number, so they can be cited directly.",
];

const link = (siteUrl, page) => `- [${page.title}](${siteUrl}${page.path}): ${page.description}`;

function describeParam(param) {
  const range =
    param.values
      ? `one of ${param.values.join(", ")}`
      : param.min !== undefined || param.max !== undefined
        ? `${param.min ?? "any"} to ${param.max ?? "any"}`
        : param.type;
  return `  - \`${param.name}\` (${range}): ${param.description}`;
}

function linkSection(siteUrl, { detailed }) {
  const lines = [
    "## Prefilled calculator links",
    "",
    "Append query parameters to open a calculator with the user's figures already entered. Unknown or out-of-range values are ignored and the default is used.",
    "",
  ];
  for (const spec of PUBLIC_LINK_SPECS) {
    lines.push(`- [${spec.title}](${siteUrl}${spec.path}): ${spec.purpose} Example: ${siteUrl}${spec.example}`);
    if (detailed) lines.push(...spec.params.map(describeParam));
  }
  return lines;
}

function mcpSection(siteUrl) {
  return [
    "## MCP server",
    "",
    `- Endpoint: ${siteUrl}/mcp (Model Context Protocol over Streamable HTTP, no authentication; serves revision 2026-07-28 with per-request _meta and server/discover, and answers legacy initialize clients from 2024-11-05 to 2025-11-25)`,
    ...TOOLS.map((tool) => `- \`${tool.name}\`: ${tool.description}`),
  ];
}

export function buildLlmsTxt(siteUrl) {
  const groups = new Map();
  for (const page of CORE_PAGES) {
    if (!groups.has(page.group)) groups.set(page.group, []);
    groups.get(page.group).push(page);
  }
  const rulePages = wordingPages().filter(
    (page) => page.path.split("/").length === 3 || page.path.startsWith("/rules/compare/")
  );

  const lines = ["# ClaimWise SG", "", `> ${SUMMARY}`, "", ...GUIDANCE.map((line) => `- ${line}`), ""];
  for (const [group, pages] of groups) {
    lines.push(`## ${group}`, "");
    lines.push(...pages.map((page) => link(siteUrl, page)));
    if (group === "Insurer rules") lines.push(...rulePages.map((page) => link(siteUrl, page)));
    lines.push("");
  }
  lines.push(...linkSection(siteUrl, { detailed: false }), "");
  lines.push(...mcpSection(siteUrl), "");
  lines.push("## Optional", "");
  lines.push(`- [Full text](${siteUrl}/llms-full.txt): every quoted policy clause and every link parameter`);
  return `${lines.join("\n")}\n`;
}

function wordingSection(siteUrl) {
  const lines = [
    "## Policy wording excerpts",
    "",
    `Checked against the insurer PDFs on ${WORDINGS_REVIEWED_ON}. Not yet on file: ${INSURERS_WITHOUT_WORDING.join(", ")} and other insurers.`,
    "",
  ];
  for (const wording of POLICY_WORDINGS) {
    lines.push(`### ${wording.insurer}: ${wording.document} (${wording.version})`, "");
    lines.push(`Source PDF: ${siteUrl}${wording.pdfFile}`, "");
    for (const topic of WORDING_TOPICS) {
      const entry = wording.entries[topic.id];
      lines.push(`#### ${topic.title}`, "");
      lines.push(`Page: ${siteUrl}${wordingTopicPath(wording, topic)}`);
      lines.push(`Summary: ${entry.summary}`);
      if (entry.page) lines.push(`Source: ${entry.section}, PDF page ${entry.page} (${siteUrl}${wordingPageUrl(wording, entry.page)})`);
      lines.push("");
      for (const paragraph of entry.excerpt ?? []) lines.push(`> ${paragraph}`, ">");
      if (entry.excerpt) lines.pop();
      if (entry.table) {
        lines.push("", `| ${entry.table.headers.join(" | ")} |`, `| ${entry.table.headers.map(() => "---").join(" | ")} |`);
        lines.push(...entry.table.rows.map((row) => `| ${row.join(" | ")} |`));
      }
      if (entry.note) lines.push("", `Note: ${entry.note}`);
      lines.push("");
    }
  }
  return lines;
}

export function buildLlmsFullTxt(siteUrl) {
  const lines = ["# ClaimWise SG", "", `> ${SUMMARY}`, "", ...GUIDANCE.map((line) => `- ${line}`), ""];
  lines.push(...linkSection(siteUrl, { detailed: true }), "");
  lines.push(...mcpSection(siteUrl), "");
  lines.push(...wordingSection(siteUrl));
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}
