const RESEND_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 8000;

export function createResendMailer({ apiKey, from, fetchImpl = fetch }) {
  return {
    async send({ to, subject, text, html, headers, idempotencyKey }) {
      const response = await fetchImpl(RESEND_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
        },
        body: JSON.stringify({ from, to: [to], subject, text, html, headers }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
    },
  };
}
