import { REMINDER_TYPES } from "./schedule.mjs";

const BRAND = "ClaimWise SG";

const REMINDER_COPY = {
  insuranceRenewal: {
    subject: "Your car insurance renews soon: check the NCD Protector first",
    lead: "Your renewal is the moment to check whether the NCD Protector is worth its price, and whether a cheaper quote stays cheaper once excess is counted.",
    action: "Check my renewal decision",
  },
  coeExpiry: {
    subject: "Your COE decision is approaching",
    lead: "Compare renewing for 5 years, renewing for 10 years, and replacing the car while there is still time to plan.",
    action: "Compare my COE options",
  },
  loanReview: {
    subject: "Time to review your car loan",
    lead: "Check whether settling early saves money after the interest rebate, fees, and what your cash could earn elsewhere.",
    action: "Check early settlement",
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDisplayDate(dateString) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

function renderMessage({ heading, paragraphs, actionLabel, actionUrl, footerLines }) {
  const text = [
    heading,
    "",
    ...paragraphs,
    "",
    `${actionLabel}: ${actionUrl}`,
    "",
    ...footerLines.map((line) => (line.url ? `${line.text}: ${line.url}` : line.text)),
  ].join("\n");

  const paragraphHtml = paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const footerHtml = footerLines
    .map((line) =>
      line.url
        ? `<a href="${escapeHtml(line.url)}">${escapeHtml(line.text)}</a>`
        : escapeHtml(line.text)
    )
    .join("<br>");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0f1f24;max-width:520px">
<h1 style="font-size:20px">${escapeHtml(heading)}</h1>
${paragraphHtml}
<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:10px 16px;background:#0b7a72;color:#ffffff;border-radius:8px;text-decoration:none">${escapeHtml(actionLabel)}</a></p>
<p style="font-size:12px;color:#52656b">${footerHtml}</p>
</div>`;

  return { text, html };
}

export function renderConfirmationEmail({ confirmUrl }) {
  return {
    subject: "Confirm your ClaimWise SG reminders",
    ...renderMessage({
      heading: "Confirm your reminders",
      paragraphs: [
        "Please confirm that you asked ClaimWise SG to email you before key car decisions.",
        "This link expires in 7 days. If you did not ask for this, ignore this email and your address will be removed.",
      ],
      actionLabel: "Confirm reminders",
      actionUrl: confirmUrl,
      footerLines: [{ text: BRAND }],
    }),
  };
}

export function renderManageLinkEmail({ manageUrl }) {
  return {
    subject: "Manage your ClaimWise SG reminders",
    ...renderMessage({
      heading: "You already have reminders set",
      paragraphs: ["Use this link to change your reminder dates or stop reminders."],
      actionLabel: "Manage reminders",
      actionUrl: manageUrl,
      footerLines: [{ text: BRAND }],
    }),
  };
}

export function renderReminderEmail({ type, eventDate, leadDays, toolUrl, manageUrl, unsubscribeUrl }) {
  const copy = REMINDER_COPY[type];
  const { label } = REMINDER_TYPES[type];
  return {
    subject: copy.subject,
    ...renderMessage({
      heading: copy.subject,
      paragraphs: [
        `${label} date: ${formatDisplayDate(eventDate)} (about ${leadDays} days away).`,
        copy.lead,
      ],
      actionLabel: copy.action,
      actionUrl: toolUrl,
      footerLines: [
        { text: `You asked ${BRAND} for this reminder.` },
        { text: "Change reminder dates", url: manageUrl },
        { text: "Unsubscribe and delete my data", url: unsubscribeUrl },
      ],
    }),
  };
}
