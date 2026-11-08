import { getClausePdfInfo } from "../../../src/clause-documents.mjs";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clauseId = searchParams.get("id") || "base_excess";
  const insurer = searchParams.get("insurer") || "income";
  const source = getClausePdfInfo(clauseId, insurer);

  const content = source
    ? `<header><div><strong>${escapeHtml(source.docName)}</strong><span>${escapeHtml(source.label)}</span></div><a href="${escapeHtml(source.anchorUrl)}" target="_blank" rel="noreferrer">Open source PDF ↗</a></header><iframe title="${escapeHtml(source.label)}" src="${escapeHtml(source.anchorUrl)}"></iframe><footer>Official source page. Calculator amounts are estimates; your policy schedule and endorsements determine the terms that apply to you.</footer>`
    : `<main><strong>No matching official source PDF is available for this insurer.</strong><p>Check your insurer’s policy wording and policy schedule directly. This preview does not substitute another insurer’s document.</p></main>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Official policy source</title>
  <style>
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; font: 13px/1.45 system-ui, sans-serif; color: #172b3b; background: #f6f8f8; }
    body { display: flex; flex-direction: column; }
    header { min-height: 58px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: white; border-bottom: 1px solid #d9e2e5; }
    header div { min-width: 0; display: flex; flex-direction: column; }
    header strong { font-size: 13px; }
    header span { color: #58707d; font-size: 11px; }
    header a { white-space: nowrap; color: #087e76; font-weight: 700; text-decoration: none; }
    iframe { flex: 1; width: 100%; min-height: 0; border: 0; background: #e5e7eb; }
    footer { padding: 8px 14px; font-size: 11px; color: #536875; background: white; border-top: 1px solid #d9e2e5; }
    main { margin: auto; max-width: 440px; padding: 24px; }
    main p { color: #536875; }
  </style>
</head>
<body>${content}</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
