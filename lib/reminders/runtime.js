import { createFirestoreStore } from "./firestore-store.js";
import { createResendMailer } from "./resend-mailer.js";
import { createReminderService } from "./service.js";

const MIN_SECRET_LENGTH = 32;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_TRACKED_CLIENTS = 5000;

const requestLog = new Map();

/** Returns null until email delivery is configured, so routes can report it as unavailable. */
export function getReminderService(env = process.env) {
  const secret = env.REMINDER_TOKEN_SECRET;
  const apiKey = env.RESEND_API_KEY;
  const from = env.REMINDER_FROM_EMAIL;
  const siteUrl = env.REMINDER_SITE_URL || env.NEXT_PUBLIC_SITE_URL;

  if (!secret || secret.length < MIN_SECRET_LENGTH || !apiKey || !from || !siteUrl) return null;

  return createReminderService({
    store: createFirestoreStore(),
    mailer: createResendMailer({ apiKey, from }),
    secret,
    siteUrl,
  });
}

/**
 * Limits sign-up attempts per instance. Cloud Run appends the connecting address as
 * the final X-Forwarded-For entry, so earlier client-supplied entries are ignored.
 */
export function isRateLimited(request, nowMs = Date.now()) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
  const client = forwardedFor.split(",").pop().trim();
  const recent = (requestLog.get(client) ?? []).filter((time) => time > nowMs - RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return true;

  if (requestLog.size >= MAX_TRACKED_CLIENTS) requestLog.clear();
  requestLog.set(client, [...recent, nowMs]);
  return false;
}

export const UNAVAILABLE_RESPONSE = {
  body: { ok: false, error: "Email reminders are not available yet." },
  init: { status: 503 },
};

const MAX_BODY_BYTES = 4096;

export async function readJsonBody(request) {
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return null;
  try {
    const payload = JSON.parse(rawBody);
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}
