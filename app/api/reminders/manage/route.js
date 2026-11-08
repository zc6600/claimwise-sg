import {
  UNAVAILABLE_RESPONSE,
  getReminderService,
  readJsonBody,
} from "../../../../lib/reminders/runtime.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const service = getReminderService();
  if (!service) return Response.json(UNAVAILABLE_RESPONSE.body, UNAVAILABLE_RESPONSE.init);

  const payload = await readJsonBody(request);
  try {
    const result =
      payload?.action === "update"
        ? await service.updateManaged(payload.token, payload.dates)
        : await service.getManaged(payload?.token);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.warn("Reminder management failed:", error?.message || error);
    return Response.json({ ok: false, error: "Unable to update your reminder." }, { status: 503 });
  }
}
