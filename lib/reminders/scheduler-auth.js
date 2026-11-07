const TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const REQUEST_TIMEOUT_MS = 5000;
const MAX_TOKEN_LENGTH = 4096;

/**
 * Accepts only a Google-signed ID token issued to the scheduler service account for
 * this endpoint. Token validation goes through Google because the job runs once a day.
 */
export async function isAuthorizedSchedulerToken(
  idToken,
  { audience, serviceAccountEmail, fetchImpl = fetch }
) {
  if (!idToken || idToken.length > MAX_TOKEN_LENGTH || !audience || !serviceAccountEmail) {
    return false;
  }

  try {
    const url = `${TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) return false;

    const claims = await response.json();
    return (
      claims.aud === audience &&
      claims.email === serviceAccountEmail &&
      String(claims.email_verified) === "true" &&
      GOOGLE_ISSUERS.includes(claims.iss)
    );
  } catch {
    return false;
  }
}
