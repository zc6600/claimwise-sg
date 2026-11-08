import {
  UNAVAILABLE_RESPONSE,
  getReminderService,
  isRateLimited,
  readJsonBody,
} from "../../../lib/reminders/runtime.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const service = getReminderService();
  if (!service) return Response.json(UNAVAILABLE_RESPONSE.body, UNAVAILABLE_RESPONSE.init);

  if (isRateLimited(request)) {
    return Response.json({ ok: false, error: "Too many requests. Try again later." }, { status: 429 });
  }

  const payload = await readJsonBody(request);
  if (!payload) {
    return Response.json({ ok: false, error: "Request body must be a JSON object." }, { status: 400 });
  }

  // Automated form fillers complete the hidden field; they receive a normal response.
  if (payload.website) return Response.json({ ok: true });

  try {
    const result = await service.subscribe(payload);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.warn("Reminder sign-up failed:", error?.message || error);
    return Response.json({ ok: false, error: "Unable to save your reminder." }, { status: 503 });
  }
}
