import { UNAVAILABLE_RESPONSE, getReminderService } from "../../../../lib/reminders/runtime.js";
import { isAuthorizedSchedulerToken } from "../../../../lib/reminders/scheduler-auth.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const idToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const siteUrl = process.env.REMINDER_SITE_URL?.replace(/\/$/, "");
  const authorized = await isAuthorizedSchedulerToken(idToken, {
    audience: siteUrl ? `${siteUrl}/api/reminders/dispatch` : undefined,
    serviceAccountEmail: process.env.REMINDER_SCHEDULER_EMAIL,
  });
  if (!authorized) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const service = getReminderService();
  if (!service) return Response.json(UNAVAILABLE_RESPONSE.body, UNAVAILABLE_RESPONSE.init);

  try {
    return Response.json(await service.dispatch());
  } catch (error) {
    console.warn("Reminder dispatch failed:", error?.message || error);
    return Response.json({ ok: false, error: "Dispatch failed." }, { status: 503 });
  }
}
