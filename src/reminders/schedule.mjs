export const REMINDER_TYPES = {
  insuranceRenewal: {
    label: "Insurance renewal",
    leadDays: [45],
    repeatsYearly: true,
    toolPath: "/tools/ncd-protector",
  },
  coeExpiry: {
    label: "COE expiry",
    leadDays: [365, 90],
    repeatsYearly: false,
    toolPath: "/tools/coe-renewal",
  },
  loanReview: {
    label: "Car loan review",
    leadDays: [30],
    repeatsYearly: false,
    toolPath: "/tools/loan-prepayment",
  },
};

const MAX_FUTURE_YEARS = 15;
const MAX_STORED_SENT_KEYS = 12;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addYears(dateString, years) {
  const [year, month, day] = dateString.split("-").map(Number);
  const candidate = new Date(Date.UTC(year + years, month - 1, day));
  // 29 February falls back to 28 February in a non-leap target year.
  if (candidate.getUTCMonth() !== month - 1) candidate.setUTCDate(0);
  return candidate.toISOString().slice(0, 10);
}

export function singaporeToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(now);
}

/**
 * Keeps known reminder types only and rejects dates that are malformed, already past,
 * or too far ahead to be a genuine vehicle date.
 */
export function validateReminderDates(rawDates, today) {
  if (!rawDates || typeof rawDates !== "object" || Array.isArray(rawDates)) {
    return { error: "Enter at least one reminder date." };
  }

  const dates = {};
  const latest = addYears(today, MAX_FUTURE_YEARS);
  for (const [type, config] of Object.entries(REMINDER_TYPES)) {
    const value = rawDates[type];
    if (value === undefined || value === null || value === "") continue;
    if (!isValidDateString(value)) {
      return { error: `${config.label} date is not valid.`, field: type };
    }
    if (value < today || value > latest) {
      return {
        error: `${config.label} date must be between today and ${MAX_FUTURE_YEARS} years from now.`,
        field: type,
      };
    }
    dates[type] = value;
  }

  if (Object.keys(dates).length === 0) {
    return { error: "Enter at least one reminder date." };
  }
  return { dates };
}

function upcomingEventDate(type, eventDate, today) {
  if (!REMINDER_TYPES[type].repeatsYearly) return eventDate;
  let upcoming = eventDate;
  while (upcoming < today) upcoming = addYears(upcoming, 1);
  return upcoming;
}

function reminderKey(type, eventDate, leadDays) {
  return `${type}:${eventDate}:${leadDays}`;
}

/**
 * Returns reminders due today. When several lead times have passed, only the closest
 * one to the event is sent, so a late sign-up does not receive a burst of messages.
 */
export function dueReminders(dates, sentKeys, today) {
  const sent = new Set(sentKeys);
  const due = [];

  for (const [type, value] of Object.entries(dates)) {
    const config = REMINDER_TYPES[type];
    if (!config) continue;
    const eventDate = upcomingEventDate(type, value, today);
    if (eventDate < today) continue;

    const reached = config.leadDays.filter((lead) => addDays(eventDate, -lead) <= today);
    if (reached.length === 0) continue;

    const leadDays = Math.min(...reached);
    const key = reminderKey(type, eventDate, leadDays);
    if (!sent.has(key)) due.push({ key, type, eventDate, leadDays });
  }

  return due;
}

/**
 * Returns the next date a reminder should be evaluated, or null when nothing is left
 * and the subscription can be removed.
 */
export function nextReminderDate(dates, sentKeys, today) {
  if (dueReminders(dates, sentKeys, today).length > 0) return today;

  const candidates = [];
  for (const [type, value] of Object.entries(dates)) {
    const config = REMINDER_TYPES[type];
    if (!config) continue;
    const eventDate = upcomingEventDate(type, value, today);
    const eventsToCheck = config.repeatsYearly
      ? [eventDate, addYears(eventDate, 1)]
      : [eventDate];

    for (const event of eventsToCheck) {
      for (const lead of config.leadDays) {
        const sendDate = addDays(event, -lead);
        if (sendDate > today) candidates.push(sendDate);
      }
    }
  }

  return candidates.length > 0 ? candidates.sort()[0] : null;
}

export function recordSentKey(sentKeys, key) {
  return [...sentKeys, key].slice(-MAX_STORED_SENT_KEYS);
}
