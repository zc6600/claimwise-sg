import {
  REMINDER_TYPES,
  dueReminders,
  nextReminderDate,
  recordSentKey,
  singaporeToday,
  validateReminderDates,
} from "../../src/reminders/schedule.mjs";
import {
  renderConfirmationEmail,
  renderManageLinkEmail,
  renderReminderEmail,
} from "../../src/reminders/email.mjs";
import {
  CONFIRM_TOKEN_TTL_MS,
  TOKEN_PURPOSES,
  normalizeEmail,
  signToken,
  subscriptionIdForEmail,
  verifyToken,
} from "./tokens.js";

export const CONSENT_VERSION = "2026-11";

const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPATCH_BATCH_SIZE = 200;

export function isValidEmail(email) {
  return (
    typeof email === "string" &&
    email.trim().length <= MAX_EMAIL_LENGTH &&
    EMAIL_PATTERN.test(email.trim())
  );
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

export function createReminderService({ store, mailer, secret, siteUrl, now = () => new Date() }) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const manageToken = (id) => signToken({ id, purpose: TOKEN_PURPOSES.MANAGE }, secret);
  const manageUrl = (id) => `${baseUrl}/reminders/manage?token=${manageToken(id)}`;
  const unsubscribeUrl = (id) => `${baseUrl}/api/reminders/unsubscribe?token=${manageToken(id)}`;

  async function sendConfirmation(id, email) {
    const expiresAt = now().getTime() + CONFIRM_TOKEN_TTL_MS;
    const token = signToken({ id, purpose: TOKEN_PURPOSES.CONFIRM, expiresAt }, secret);
    await mailer.send({
      to: email,
      ...renderConfirmationEmail({ confirmUrl: `${baseUrl}/reminders/confirm?token=${token}` }),
    });
  }

  /**
   * Starts double opt-in. The response never reveals whether an address is already
   * subscribed, and an active subscription can only be changed from its manage link.
   */
  async function subscribe({ email, dates: rawDates, consent }) {
    if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address.", field: "email" };
    if (consent !== true) {
      return { ok: false, error: "Tick the box to agree to reminder emails.", field: "consent" };
    }

    const today = singaporeToday(now());
    const { dates, error, field } = validateReminderDates(rawDates, today);
    if (error) return { ok: false, error, field };

    const normalizedEmail = normalizeEmail(email);
    const id = subscriptionIdForEmail(normalizedEmail, secret);
    const existing = await store.get(id);
    const nowMs = now().getTime();
    const lastSentMs = existing ? Date.parse(existing.data.lastEmailAt) : NaN;

    if (lastSentMs + RESEND_COOLDOWN_MS > nowMs) return { ok: true };

    const nowIso = now().toISOString();
    if (existing?.data.status === "active") {
      await store.put(id, { ...existing.data, lastEmailAt: nowIso }, { updateTime: existing.updateTime });
      await mailer.send({ to: normalizedEmail, ...renderManageLinkEmail({ manageUrl: manageUrl(id) }) });
      return { ok: true };
    }

    await store.put(id, {
      email: normalizedEmail,
      status: "pending",
      dates,
      sentKeys: [],
      consentVersion: CONSENT_VERSION,
      consentAt: nowIso,
      lastEmailAt: nowIso,
      pendingExpiresAt: new Date(nowMs + CONFIRM_TOKEN_TTL_MS).toISOString(),
      nextReminderDate: null,
    });
    await sendConfirmation(id, normalizedEmail);
    return { ok: true };
  }

  async function confirm(token) {
    const claims = verifyToken(token, TOKEN_PURPOSES.CONFIRM, secret, now().getTime());
    if (!claims) return { ok: false, error: "This confirmation link is invalid or has expired." };

    const existing = await store.get(claims.id);
    if (!existing) return { ok: false, error: "This confirmation link is invalid or has expired." };
    if (existing.data.status === "active") return { ok: true, manageToken: manageToken(claims.id) };

    const today = singaporeToday(now());
    await store.put(
      claims.id,
      {
        ...existing.data,
        status: "active",
        confirmedAt: now().toISOString(),
        pendingExpiresAt: null,
        nextReminderDate: nextReminderDate(existing.data.dates, [], today),
      },
      { updateTime: existing.updateTime }
    );
    return { ok: true, manageToken: manageToken(claims.id) };
  }

  async function getManaged(token) {
    const claims = verifyToken(token, TOKEN_PURPOSES.MANAGE, secret, now().getTime());
    if (!claims) return { ok: false, error: "This link is invalid." };

    const existing = await store.get(claims.id);
    if (!existing || existing.data.status !== "active") {
      return { ok: false, error: "No active reminders were found for this link." };
    }
    return {
      ok: true,
      email: maskEmail(existing.data.email),
      dates: existing.data.dates,
      nextReminderDate: existing.data.nextReminderDate,
    };
  }

  async function updateManaged(token, rawDates) {
    const claims = verifyToken(token, TOKEN_PURPOSES.MANAGE, secret, now().getTime());
    if (!claims) return { ok: false, error: "This link is invalid." };

    const existing = await store.get(claims.id);
    if (!existing || existing.data.status !== "active") {
      return { ok: false, error: "No active reminders were found for this link." };
    }

    const today = singaporeToday(now());
    const { dates, error, field } = validateReminderDates(rawDates, today);
    if (error) return { ok: false, error, field };

    const next = nextReminderDate(dates, existing.data.sentKeys, today);
    await store.put(
      claims.id,
      { ...existing.data, dates, nextReminderDate: next },
      { updateTime: existing.updateTime }
    );
    return { ok: true, dates, nextReminderDate: next };
  }

  async function unsubscribe(token) {
    const claims = verifyToken(token, TOKEN_PURPOSES.MANAGE, secret, now().getTime());
    if (!claims) return { ok: false, error: "This link is invalid." };
    await store.delete(claims.id);
    return { ok: true };
  }

  async function sendDueReminder(subscription, reminder) {
    const { id, data } = subscription;
    await mailer.send({
      to: data.email,
      idempotencyKey: `${id}:${reminder.key}`,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl(id)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      ...renderReminderEmail({
        ...reminder,
        toolUrl: `${baseUrl}${REMINDER_TYPES[reminder.type].toolPath}`,
        manageUrl: manageUrl(id),
        unsubscribeUrl: unsubscribeUrl(id),
      }),
    });
  }

  /**
   * Claims each reminder with an optimistic write before sending, so overlapping runs
   * cannot send it twice. A failed send releases the claim for the next daily run.
   */
  async function processSubscription(subscription, today, totals) {
    let current = subscription;

    for (const reminder of dueReminders(current.data.dates, current.data.sentKeys, today)) {
      const sentKeys = recordSentKey(current.data.sentKeys, reminder.key);
      const claimed = {
        ...current.data,
        sentKeys,
        nextReminderDate: nextReminderDate(current.data.dates, sentKeys, today),
      };

      let claim;
      try {
        claim = await store.put(current.id, claimed, { updateTime: current.updateTime });
      } catch (error) {
        if (error?.code !== "conflict") throw error;
        totals.skipped += 1;
        return;
      }

      try {
        await sendDueReminder({ ...current, data: claimed }, reminder);
        totals.sent += 1;
        current = { id: current.id, data: claimed, updateTime: claim.updateTime };
      } catch (error) {
        console.warn("Reminder delivery failed:", error?.message || error);
        totals.failed += 1;
        await store.put(current.id, current.data, { updateTime: claim.updateTime });
        return;
      }
    }

    if (nextReminderDate(current.data.dates, current.data.sentKeys, today) === null) {
      await store.delete(current.id);
      totals.completed += 1;
    }
  }

  async function dispatch() {
    const today = singaporeToday(now());
    const totals = { sent: 0, failed: 0, skipped: 0, completed: 0, expired: 0 };

    const expired = await store.listExpiredPending(now().toISOString(), DISPATCH_BATCH_SIZE);
    for (const subscription of expired) {
      await store.delete(subscription.id);
      totals.expired += 1;
    }

    const subscriptions = await store.listDue(today, DISPATCH_BATCH_SIZE);
    for (const subscription of subscriptions) {
      try {
        await processSubscription(subscription, today, totals);
      } catch (error) {
        console.warn("Reminder processing failed:", error?.message || error);
        totals.failed += 1;
      }
    }

    return { ok: true, ...totals };
  }

  return { subscribe, confirm, getManaged, updateManaged, unsubscribe, dispatch };
}
