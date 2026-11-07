import { UNAVAILABLE_RESPONSE, getReminderService } from "../../../../lib/reminders/runtime.js";

export const dynamic = "force-dynamic";

async function readToken(request) {
  const queryToken = new URL(request.url).searchParams.get("token");
  if (queryToken) return queryToken;
  try {
    const payload = await request.json();
    return payload?.token;
  } catch {
    return undefined;
  }
}

/** Handles the page button and the one-click List-Unsubscribe POST sent by mail clients. */
export async function POST(request) {
  const service = getReminderService();
  if (!service) return Response.json(UNAVAILABLE_RESPONSE.body, UNAVAILABLE_RESPONSE.init);

  try {
    const result = await service.unsubscribe(await readToken(request));
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.warn("Reminder unsubscribe failed:", error?.message || error);
    return Response.json({ ok: false, error: "Unable to unsubscribe." }, { status: 503 });
  }
}

/**
 * Plain link visits land on the manage page, because mail scanners fetch links
 * automatically and must not remove a subscription.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const token = encodeURIComponent(url.searchParams.get("token") ?? "");
  return Response.redirect(new URL(`/reminders/manage?token=${token}&unsubscribe=1`, url.origin), 303);
}
