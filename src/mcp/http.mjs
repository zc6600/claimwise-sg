import {
  ERROR,
  LEGACY_PROTOCOL_VERSIONS,
  MCP_PARSE_ERROR,
  declaredProtocolVersion,
  handleMcpMessage,
  jsonRpcError,
} from "./server.mjs";

/**
 * Streamable HTTP binding for the MCP server, kept free of framework types so it can be
 * tested directly. The caller supplies the raw body and a `Headers` object; the result is
 * an HTTP status and an optional JSON body (none for 202 Accepted).
 */

export const MAX_BODY_BYTES = 65536;

/** Revisions that still allowed JSON-RPC batches; batching was removed in 2025-06-18. */
const BATCH_VERSIONS = ["2025-03-26", "2024-11-05"];

const BASE64_SENTINEL = /^=\?base64\?([A-Za-z0-9+/=]*)\?=$/;

/** Decodes the `=?base64?…?=` sentinel used for non-ASCII header values. */
export function decodeHeaderValue(value) {
  const match = BASE64_SENTINEL.exec(value ?? "");
  if (!match) return value;
  try {
    const bytes = Uint8Array.from(atob(match[1]), (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const respond = (status, body = null) => ({ status, body });

function mediaTypeIncludes(header, accepted) {
  return (header ?? "")
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .some((type) => accepted.includes(type));
}

/**
 * Modern requests mirror body fields into headers so intermediaries can route without
 * parsing JSON; a mismatch means the two disagree about what is being executed.
 */
function headerMismatch(message, headers) {
  const version = declaredProtocolVersion(message);
  const headerVersion = headers.get("mcp-protocol-version");
  if (headerVersion !== version) {
    return `MCP-Protocol-Version header ${headerVersion ? `'${headerVersion}'` : "is missing and"} does not match _meta value '${version}'.`;
  }
  if (headers.get("mcp-method") !== message.method) {
    return `Mcp-Method header does not match body method '${message.method}'.`;
  }
  if (message.method === "tools/call") {
    const name = decodeHeaderValue(headers.get("mcp-name"));
    if (name !== message.params?.name) return "Mcp-Name header does not match params.name.";
  }
  return null;
}

function statusFor(reply, modern) {
  if (!reply.error) return 200;
  const { code } = reply.error;
  if (code === ERROR.unsupportedProtocolVersion || code === ERROR.headerMismatch) return 400;
  if (code === ERROR.invalidRequest || code === ERROR.parse) return 400;
  if (code === ERROR.methodNotFound && modern) return 404;
  return 200;
}

export function handleMcpPost({ rawBody, headers, siteUrl }) {
  if (!mediaTypeIncludes(headers.get("content-type"), ["application/json"])) {
    return respond(415, jsonRpcError(null, ERROR.invalidRequest, "Content-Type must be application/json."));
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return respond(400, MCP_PARSE_ERROR);
  }

  const context = { siteUrl };
  const headerVersion = headers.get("mcp-protocol-version");

  if (Array.isArray(payload)) {
    if (headerVersion && !BATCH_VERSIONS.includes(headerVersion)) {
      return respond(400, jsonRpcError(null, ERROR.invalidRequest, "Batch requests are not supported in this protocol version."));
    }
    if (payload.length === 0) return respond(400, jsonRpcError(null, ERROR.invalidRequest, "Empty batch."));
    if (payload.some((message) => declaredProtocolVersion(message) !== undefined)) {
      return respond(400, jsonRpcError(null, ERROR.invalidRequest, "Modern requests cannot be batched."));
    }
    const replies = payload.map((message) => handleMcpMessage(message, context)).filter(Boolean);
    return replies.length > 0 ? respond(200, replies) : respond(202);
  }

  const modern = declaredProtocolVersion(payload) !== undefined;
  const accept = headers.get("accept");
  // Modern clients must accept both response forms. Legacy and header-less callers only need
  // JSON, which is all this server ever returns.
  const acceptsJson = !accept || mediaTypeIncludes(accept, ["application/json", "application/*", "*/*"]);
  const acceptsStream = mediaTypeIncludes(accept, ["text/event-stream", "text/*", "*/*"]);
  if (!acceptsJson || (modern && !acceptsStream)) {
    const required = modern ? "application/json and text/event-stream" : "application/json";
    return respond(406, jsonRpcError(null, ERROR.invalidRequest, `Accept must allow ${required}.`));
  }
  if (modern) {
    const mismatch = headerMismatch(payload, headers);
    if (mismatch) return respond(400, jsonRpcError(payload?.id, ERROR.headerMismatch, `Header mismatch: ${mismatch}`));
  } else if (headerVersion && !LEGACY_PROTOCOL_VERSIONS.includes(headerVersion)) {
    // A modern version header with no `_meta` version, or an unknown legacy version.
    return respond(
      400,
      jsonRpcError(payload?.id, ERROR.headerMismatch, `Header mismatch: MCP-Protocol-Version '${headerVersion}' requires the version in params._meta.`)
    );
  }

  const reply = handleMcpMessage(payload, context);
  return reply ? respond(statusFor(reply, modern), reply) : respond(202);
}
