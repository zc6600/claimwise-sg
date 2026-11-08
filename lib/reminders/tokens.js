import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

export const TOKEN_PURPOSES = {
  CONFIRM: "confirm",
  MANAGE: "manage",
};

export const CONFIRM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hmac(secret, value) {
  return createHmac("sha256", secret).update(value).digest();
}

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/** Derives a stable document ID so that the address is never exposed in the document path. */
export function subscriptionIdForEmail(email, secret) {
  return hmac(secret, `subscription:${normalizeEmail(email)}`).toString("hex");
}

export function signToken({ id, purpose, expiresAt }, secret) {
  const payload = Buffer.from(JSON.stringify({ id, purpose, expiresAt })).toString("base64url");
  const signature = hmac(secret, `token:${payload}`).toString("base64url");
  return `${payload}.${signature}`;
}

export function verifyToken(token, expectedPurpose, secret, nowMs = Date.now()) {
  if (typeof token !== "string" || token.length > 1024) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = hmac(secret, `token:${payload}`);
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (claims.purpose !== expectedPurpose || typeof claims.id !== "string") return null;
    if (claims.expiresAt !== undefined && claims.expiresAt <= nowMs) return null;
    return claims;
  } catch {
    return null;
  }
}
