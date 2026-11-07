import test from "node:test";
import assert from "node:assert/strict";
import {
  addYears,
  dueReminders,
  isValidDateString,
  nextReminderDate,
  recordSentKey,
  singaporeToday,
  validateReminderDates,
} from "../src/reminders/schedule.mjs";
import { renderReminderEmail } from "../src/reminders/email.mjs";
import {
  TOKEN_PURPOSES,
  secretsMatch,
  signToken,
  subscriptionIdForEmail,
  verifyToken,
} from "../lib/reminders/tokens.js";
import { createReminderService, isValidEmail } from "../lib/reminders/service.js";
import { createFirestoreStore, fromFirestoreValue } from "../lib/reminders/firestore-store.js";
import { createResendMailer } from "../lib/reminders/resend-mailer.js";
import { getReminderService, isRateLimited } from "../lib/reminders/runtime.js";

const SECRET = "test-secret-that-is-long-enough-for-hmac";

function createMemoryStore() {
  const documents = new Map();
  let version = 0;
  const entry = (id) => ({ id, ...documents.get(id) });

  return {
    documents,
    async get(id) {
      return documents.has(id) ? entry(id) : null;
    },
    async put(id, data, { updateTime, mustNotExist } = {}) {
      const stale = updateTime && documents.get(id)?.updateTime !== updateTime;
      if (stale || (mustNotExist && documents.has(id))) {
        throw Object.assign(new Error("conflict"), { code: "conflict" });
      }
      version += 1;
      documents.set(id, { data: structuredClone(data), updateTime: `v${version}` });
      return entry(id);
    },
    async delete(id) {
      documents.delete(id);
    },
    async listDue(today) {
      return [...documents.keys()]
        .filter((id) => {
          const next = documents.get(id).data.nextReminderDate;
          return typeof next === "string" && next <= today;
        })
        .map(entry);
    },
    async listExpiredPending(nowIso) {
      return [...documents.keys()]
        .filter((id) => {
          const expiry = documents.get(id).data.pendingExpiresAt;
          return typeof expiry === "string" && expiry <= nowIso;
        })
        .map(entry);
    },
  };
}

function createHarness(startIso = "2026-11-07T02:00:00Z") {
  const clock = { current: new Date(startIso) };
  const store = createMemoryStore();
  const sent = [];
  const mailer = {
    failNext: false,
    async send(message) {
      if (mailer.failNext) {
        mailer.failNext = false;
        throw new Error("provider down");
      }
      sent.push(message);
    },
  };
  const service = createReminderService({
    store,
    mailer,
    secret: SECRET,
    siteUrl: "https://example.test/",
    now: () => clock.current,
  });
  return { clock, store, sent, mailer, service };
}

function tokenFromLatestEmail(sent) {
  return sent.at(-1).text.match(/token=([^\s&]+)/)[1];
}

async function subscribeAndConfirm(harness, dates, email = "Driver@Example.com") {
  await harness.service.subscribe({ email, dates, consent: true });
  return harness.service.confirm(tokenFromLatestEmail(harness.sent));
}

test("date validation rejects impossible, past, and distant dates", () => {
  assert.equal(isValidDateString("2027-02-29"), false);
  assert.equal(isValidDateString("2028-02-29"), true);
  const today = "2026-11-07";
  assert.equal(validateReminderDates({ coeExpiry: "2026-11-06" }, today).field, "coeExpiry");
  assert.equal(validateReminderDates({ coeExpiry: "2045-01-01" }, today).field, "coeExpiry");
  assert.ok(validateReminderDates({}, today).error);
  assert.ok(validateReminderDates(null, today).error);
  assert.deepEqual(
    validateReminderDates({ coeExpiry: "2030-01-01", unknown: "2030-01-01" }, today).dates,
    { coeExpiry: "2030-01-01" }
  );
});

test("Singapore date rolls over before UTC midnight and leap days are clamped", () => {
  assert.equal(singaporeToday(new Date("2026-11-07T17:00:00Z")), "2026-11-08");
  assert.equal(addYears("2028-02-29", 1), "2029-02-28");
});

test("insurance reminder fires 45 days ahead and rolls to the next year", () => {
  const dates = { insuranceRenewal: "2027-03-01" };
  assert.equal(nextReminderDate(dates, [], "2026-11-07"), "2027-01-15");
  assert.deepEqual(dueReminders(dates, [], "2027-01-14"), []);

  const [due] = dueReminders(dates, [], "2027-01-15");
  assert.equal(due.key, "insuranceRenewal:2027-03-01:45");

  const sent = recordSentKey([], due.key);
  assert.deepEqual(dueReminders(dates, sent, "2027-01-16"), []);
  assert.equal(nextReminderDate(dates, sent, "2027-01-15"), "2028-01-16");
  assert.equal(dueReminders(dates, sent, "2028-01-16")[0].eventDate, "2028-03-01");
});

test("COE reminder fires at each lead time and a late sign-up gets only the nearest", () => {
  const dates = { coeExpiry: "2028-01-01" };
  assert.equal(dueReminders(dates, [], "2027-01-01")[0].leadDays, 365);
  assert.equal(dueReminders(dates, [], "2027-10-03")[0].leadDays, 90);
  assert.equal(dueReminders(dates, [], "2027-12-01").length, 1);
  assert.equal(nextReminderDate(dates, ["coeExpiry:2028-01-01:90"], "2027-12-01"), null);
});

test("a one-off date in the past no longer produces reminders", () => {
  assert.deepEqual(dueReminders({ loanReview: "2026-01-01" }, [], "2026-11-07"), []);
  assert.equal(nextReminderDate({ loanReview: "2026-01-01" }, [], "2026-11-07"), null);
});

test("stored sent keys stay bounded", () => {
  let keys = [];
  for (let index = 0; index < 20; index += 1) keys = recordSentKey(keys, `key-${index}`);
  assert.equal(keys.length, 12);
  assert.equal(keys.at(-1), "key-19");
});

test("reminder emails link to the tool and carry no policy figures", () => {
  const email = renderReminderEmail({
    type: "insuranceRenewal",
    eventDate: "2027-03-01",
    leadDays: 45,
    toolUrl: "https://example.test/tools/ncd-protector",
    manageUrl: "https://example.test/manage",
    unsubscribeUrl: "https://example.test/unsub",
  });
  assert.match(email.text, /1 March 2027/);
  assert.match(email.html, /tools\/ncd-protector/);
  assert.match(email.text, /Unsubscribe/);
  assert.doesNotMatch(email.text, /S\$/);
});

test("tokens reject tampering, the wrong purpose, and expiry", () => {
  const token = signToken({ id: "abc", purpose: TOKEN_PURPOSES.CONFIRM, expiresAt: 1000 }, SECRET);
  assert.equal(verifyToken(token, TOKEN_PURPOSES.CONFIRM, SECRET, 999).id, "abc");
  assert.equal(verifyToken(token, TOKEN_PURPOSES.CONFIRM, SECRET, 1000), null);
  assert.equal(verifyToken(token, TOKEN_PURPOSES.MANAGE, SECRET, 999), null);
  assert.equal(verifyToken(token, TOKEN_PURPOSES.CONFIRM, "another-secret", 999), null);
  assert.equal(verifyToken(`${token}x`, TOKEN_PURPOSES.CONFIRM, SECRET, 999), null);
  assert.equal(verifyToken("not-a-token", TOKEN_PURPOSES.CONFIRM, SECRET, 999), null);
  assert.equal(verifyToken(undefined, TOKEN_PURPOSES.CONFIRM, SECRET, 999), null);
});

test("subscription IDs ignore case and do not contain the address", () => {
  const id = subscriptionIdForEmail("Driver@Example.com ", SECRET);
  assert.equal(id, subscriptionIdForEmail("driver@example.com", SECRET));
  assert.doesNotMatch(id, /driver/);
});

test("dispatch secret comparison requires an exact configured value", () => {
  assert.equal(secretsMatch("abc", "abc"), true);
  assert.equal(secretsMatch("abd", "abc"), false);
  assert.equal(secretsMatch(undefined, "abc"), false);
  assert.equal(secretsMatch("abc", undefined), false);
  assert.equal(secretsMatch("", ""), false);
});

test("sign-up validates email and consent", async () => {
  const { service, sent } = createHarness();
  const dates = { insuranceRenewal: "2027-03-01" };
  assert.equal((await service.subscribe({ email: "bad", dates, consent: true })).field, "email");
  assert.equal((await service.subscribe({ email: "a@b.co", dates })).field, "consent");
  assert.equal((await service.subscribe({ email: "a@b.co", dates: {}, consent: true })).ok, false);
  assert.equal(sent.length, 0);
  assert.equal(isValidEmail("a@b.co"), true);
});

test("double opt-in activates a subscription only after confirmation", async () => {
  const harness = createHarness();
  const { service, store, sent } = harness;
  await service.subscribe({
    email: "Driver@Example.com",
    dates: { insuranceRenewal: "2027-03-01" },
    consent: true,
  });

  const document = [...store.documents.entries()].find(([id]) => !id.startsWith("daily-quota"))[1];
  assert.equal(document.data.status, "pending");
  assert.equal(document.data.email, "driver@example.com");
  assert.equal(document.data.nextReminderDate, null);
  assert.equal(document.data.consentVersion, "2026-11");

  const result = await service.confirm(tokenFromLatestEmail(sent));
  assert.equal(result.ok, true);
  const confirmed = [...store.documents.entries()].find(([id]) => !id.startsWith("daily-quota"))[1];
  assert.equal(confirmed.data.status, "active");
  assert.equal(confirmed.data.nextReminderDate, "2027-01-15");
  assert.equal(confirmed.data.pendingExpiresAt, null);
});

test("repeat sign-ups are throttled and cannot change an active subscription", async () => {
  const harness = createHarness();
  const { service, store, sent, clock } = harness;
  const dates = { insuranceRenewal: "2027-03-01" };
  await subscribeAndConfirm(harness, dates);
  assert.equal(sent.length, 1);

  await service.subscribe({ email: "driver@example.com", dates, consent: true });
  assert.equal(sent.length, 1, "the cooldown suppresses a second email");

  clock.current = new Date("2026-11-08T03:00:00Z");
  const result = await service.subscribe({
    email: "driver@example.com",
    dates: { insuranceRenewal: "2027-06-01" },
    consent: true,
  });
  assert.deepEqual(result, { ok: true });
  assert.match(sent.at(-1).subject, /Manage/);
  const document = [...store.documents.entries()].find(([id]) => !id.startsWith("daily-quota"))[1];
  assert.equal(document.data.dates.insuranceRenewal, "2027-03-01");
});

test("an expired or invalid confirmation link does not activate", async () => {
  const harness = createHarness();
  const { service, sent, clock } = harness;
  await service.subscribe({
    email: "a@b.co",
    dates: { insuranceRenewal: "2027-03-01" },
    consent: true,
  });
  const token = tokenFromLatestEmail(sent);
  assert.equal((await service.confirm("nonsense")).ok, false);
  clock.current = new Date("2026-11-20T00:00:00Z");
  assert.equal((await service.confirm(token)).ok, false);
});

test("manage link shows masked details, updates dates, and unsubscribes", async () => {
  const harness = createHarness();
  const { service, store } = harness;
  const { manageToken } = await subscribeAndConfirm(harness, { insuranceRenewal: "2027-03-01" });

  const view = await service.getManaged(manageToken);
  assert.equal(view.email, "d***@example.com");

  const updated = await service.updateManaged(manageToken, { coeExpiry: "2029-01-01" });
  assert.equal(updated.nextReminderDate, "2028-01-02");

  assert.equal((await service.unsubscribe(manageToken)).ok, true);
  assert.equal([...store.documents.keys()].some((id) => !id.startsWith("daily-quota")), false);
  assert.equal((await service.getManaged(manageToken)).ok, false);
  assert.equal((await service.unsubscribe("bad")).ok, false);
});

test("dispatch sends once, adds unsubscribe headers, and advances the schedule", async () => {
  const harness = createHarness();
  const { service, store, sent, clock } = harness;
  await subscribeAndConfirm(harness, { insuranceRenewal: "2027-03-01" });

  clock.current = new Date("2027-01-15T02:00:00Z");
  const first = await service.dispatch();
  assert.equal(first.sent, 1);
  const message = sent.at(-1);
  assert.match(message.subject, /renews soon/);
  assert.equal(message.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(message.idempotencyKey.endsWith(":insuranceRenewal:2027-03-01:45"));

  const second = await service.dispatch();
  assert.equal(second.sent, 0);
  const document = [...store.documents.entries()].find(([id]) => !id.startsWith("daily-quota"))[1];
  assert.equal(document.data.nextReminderDate, "2028-01-16");
});

test("a failed send is released and retried on the next run", async () => {
  const harness = createHarness();
  const { service, sent, mailer, clock } = harness;
  await subscribeAndConfirm(harness, { insuranceRenewal: "2027-03-01" });
  clock.current = new Date("2027-01-15T02:00:00Z");

  mailer.failNext = true;
  const failed = await service.dispatch();
  assert.equal(failed.failed, 1);
  assert.equal(failed.sent, 0);

  const retry = await service.dispatch();
  assert.equal(retry.sent, 1);
  assert.equal(sent.filter((message) => /renews soon/.test(message.subject)).length, 1);
});

test("a reminder stays due when its delivery record cannot be written", async () => {
  const harness = createHarness();
  const { service, store, sent, clock } = harness;
  await subscribeAndConfirm(harness, { insuranceRenewal: "2027-03-01" });
  clock.current = new Date("2027-01-15T02:00:00Z");

  const originalPut = store.put;
  store.put = async () => {
    throw new Error("firestore down");
  };
  const result = await service.dispatch();
  store.put = originalPut;
  assert.equal(result.failed, 1);

  const retry = await service.dispatch();
  assert.equal(retry.sent, 1);
  const deliveries = sent.filter((message) => message.idempotencyKey);
  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].idempotencyKey, deliveries[1].idempotencyKey);
});

test("an overlapping run that loses the write is counted as skipped", async () => {
  const harness = createHarness();
  const { service, store, clock } = harness;
  await subscribeAndConfirm(harness, { insuranceRenewal: "2027-03-01" });
  clock.current = new Date("2027-01-15T02:00:00Z");

  const originalPut = store.put;
  store.put = async () => {
    throw Object.assign(new Error("conflict"), { code: "conflict" });
  };
  const result = await service.dispatch();
  store.put = originalPut;
  assert.equal(result.skipped, 1);
  assert.equal(result.sent, 0);
});

test("a failed confirmation email can be retried immediately", async () => {
  const { service, sent, mailer } = createHarness();
  const request = {
    email: "a@b.co",
    dates: { insuranceRenewal: "2027-03-01" },
    consent: true,
  };
  mailer.failNext = true;
  await assert.rejects(service.subscribe(request));
  assert.deepEqual(await service.subscribe(request), { ok: true });
  assert.equal(sent.length, 1);
});

test("concurrent sign-ups render one deduplicated confirmation", async () => {
  const { service, sent } = createHarness();
  const request = { email: "a@b.co", dates: { insuranceRenewal: "2027-03-01" }, consent: true };
  await Promise.all([service.subscribe(request), service.subscribe(request)]);

  assert.equal(sent.length, 2);
  assert.equal(sent[0].idempotencyKey, sent[1].idempotencyKey);
  assert.equal(sent[0].text, sent[1].text);
});

test("the daily email cap applies across addresses", async () => {
  const { service, store, sent } = createHarness();
  const dates = { insuranceRenewal: "2027-03-01" };
  await store.put("daily-quota-2026-11-07", { count: 200 });

  const result = await service.subscribe({ email: "new@example.com", dates, consent: true });
  assert.equal(result.ok, false);
  assert.equal(sent.length, 0);
});

test("clearing every date from the manage page deletes the subscription", async () => {
  const harness = createHarness();
  const { service, store } = harness;
  const { manageToken } = await subscribeAndConfirm(harness, { insuranceRenewal: "2027-03-01" });
  const result = await service.updateManaged(manageToken, { insuranceRenewal: "", coeExpiry: "" });
  assert.equal(result.removed, true);
  assert.equal(store.documents.size, 1, "only the daily quota counter remains");
  assert.equal((await service.getManaged(manageToken)).ok, false);
});

test("finished subscriptions and stale pending sign-ups are deleted", async () => {
  const harness = createHarness();
  const { service, store, clock } = harness;
  await subscribeAndConfirm(harness, { loanReview: "2026-12-07" });
  await service.subscribe({
    email: "pending@example.com",
    dates: { loanReview: "2026-12-07" },
    consent: true,
  });
  assert.equal(store.documents.size, 3, "two subscriptions and one daily quota counter");

  clock.current = new Date("2026-11-20T02:00:00Z");
  const result = await service.dispatch();
  assert.equal(result.expired, 1);
  assert.equal(result.sent, 1);
  assert.equal(result.completed, 1);
  assert.equal([...store.documents.keys()].some((id) => !id.startsWith("daily-quota")), false);
});

test("Firestore store maps documents and treats a stale update as a conflict", async () => {
  const calls = [];
  const responses = [
    { ok: false, status: 404 },
    {
      ok: true,
      status: 200,
      json: async () => ({
        name: "projects/p/databases/(default)/documents/reminderSubscriptions/abc",
        updateTime: "t1",
        fields: {
          status: { stringValue: "active" },
          dates: { mapValue: { fields: { coeExpiry: { stringValue: "2030-01-01" } } } },
          sentKeys: { arrayValue: {} },
          nextReminderDate: { nullValue: null },
        },
      }),
    },
    { ok: false, status: 412 },
    {
      ok: true,
      status: 200,
      json: async () => [{ readTime: "t" }],
    },
  ];
  const store = createFirestoreStore({
    projectId: "p",
    getAccessToken: async () => "token",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return responses.shift();
    },
  });

  assert.equal(await store.get("abc"), null);
  const found = await store.get("abc");
  assert.equal(found.id, "abc");
  assert.deepEqual(found.data.sentKeys, []);
  assert.equal(found.data.dates.coeExpiry, "2030-01-01");

  await assert.rejects(store.put("abc", { status: "active" }, { updateTime: "t1" }), {
    code: "conflict",
  });
  assert.match(calls.at(-1).url, /currentDocument\.updateTime=t1/);

  assert.deepEqual(await store.listDue("2030-01-01", 10), []);
  const query = JSON.parse(calls.at(-1).options.body).structuredQuery;
  assert.equal(query.where.fieldFilter.field.fieldPath, "nextReminderDate");
});

test("Firestore value decoding covers the stored types", () => {
  assert.equal(fromFirestoreValue({ integerValue: "4" }), 4);
  assert.equal(fromFirestoreValue({ booleanValue: true }), true);
  assert.equal(fromFirestoreValue({ doubleValue: 1.5 }), 1.5);
  assert.throws(() => fromFirestoreValue({ bytesValue: "x" }), TypeError);
});

test("Resend mailer sends the idempotency key and surfaces provider errors", async () => {
  const calls = [];
  const mailer = createResendMailer({
    apiKey: "key",
    from: "ClaimWise <reminders@example.test>",
    fetchImpl: async (url, options) => {
      calls.push(options);
      return { ok: calls.length === 1, status: 500 };
    },
  });
  await mailer.send({ to: "a@b.co", subject: "s", text: "t", html: "h", idempotencyKey: "k" });
  assert.equal(calls[0].headers["idempotency-key"], "k");
  assert.deepEqual(JSON.parse(calls[0].body).to, ["a@b.co"]);
  await assert.rejects(mailer.send({ to: "a@b.co", subject: "s", text: "t", html: "h" }), /500/);
});

test("reminder service stays disabled until fully configured", () => {
  assert.equal(getReminderService({}), null);
  assert.equal(
    getReminderService({
      REMINDER_TOKEN_SECRET: "short",
      RESEND_API_KEY: "k",
      REMINDER_FROM_EMAIL: "a@b.co",
      REMINDER_SITE_URL: "https://example.test",
    }),
    null
  );
  assert.ok(
    getReminderService({
      REMINDER_TOKEN_SECRET: SECRET,
      RESEND_API_KEY: "k",
      REMINDER_FROM_EMAIL: "a@b.co",
      REMINDER_SITE_URL: "https://example.test",
    })
  );
});

test("sign-up rate limit uses the address appended by the platform", () => {
  const request = (forwardedFor) => new Request("https://example.test", {
    headers: { "x-forwarded-for": forwardedFor },
  });
  const nowMs = 1_000_000;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal(isRateLimited(request(`spoof-${attempt}, 203.0.113.7`), nowMs), false);
  }
  assert.equal(isRateLimited(request("spoof-new, 203.0.113.7"), nowMs), true);
  assert.equal(isRateLimited(request("198.51.100.1"), nowMs), false);
  assert.equal(isRateLimited(request("spoof, 203.0.113.7"), nowMs + 3_600_001), false);
});
