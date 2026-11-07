import { UNAVAILABLE_RESPONSE, getReminderService } from "../../../../lib/reminders/runtime.js";
import { secretsMatch } from "../../../../lib/reminders/tokens.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const provided = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!secretsMatch(provided, process.env.REMINDER_DISPATCH_SECRET)) {
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
