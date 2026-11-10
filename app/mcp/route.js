import { MAX_BODY_BYTES, handleMcpPost } from "../../src/mcp/http.mjs";
import { jsonRpcError } from "../../src/mcp/server.mjs";
import { SITE_URL } from "../../lib/site-url.js";

/**
 * Public MCP endpoint. The server holds no credentials or per-client state and serves the
 * same read-only calculations as the website, so every origin may call it (CORS `*`)
 * rather than being restricted to an allow-list.
 */

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers":
    "content-type, accept, authorization, mcp-protocol-version, mcp-method, mcp-name, mcp-session-id, last-event-id",
  "access-control-max-age": "86400",
};

const send = ({ status, body }) =>
  body === null
    ? new Response(null, { status, headers: CORS_HEADERS })
    : Response.json(body, { status, headers: { ...CORS_HEADERS, "cache-control": "no-store" } });

const tooLarge = () =>
  send({ status: 413, body: jsonRpcError(null, -32600, "Request body is too large.") });

/** Reads the body as UTF-8, stopping as soon as it exceeds the byte limit. */
async function readBody(request) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request) {
  const rawBody = await readBody(request);
  if (rawBody === null) return tooLarge();
  return send(handleMcpPost({ rawBody, headers: request.headers, siteUrl: SITE_URL }));
}

/** No server-initiated stream and no sessions, so GET and DELETE are not offered. */
export function GET() {
  return new Response(null, { status: 405, headers: { ...CORS_HEADERS, allow: "POST, OPTIONS" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { ...CORS_HEADERS, allow: "POST, OPTIONS" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
