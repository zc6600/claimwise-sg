import { toFirestoreValue } from "../server-calculation-storage.js";
import { firebaseConfig } from "../firebase-config.js";

const COLLECTION = "reminderSubscriptions";
const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const REQUEST_TIMEOUT_MS = 5000;

export function fromFirestoreValue(value) {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, entry]) => [key, fromFirestoreValue(entry)])
    );
  }
  throw new TypeError("Unsupported Firestore value.");
}

function toSubscription(document) {
  return {
    id: document.name.split("/").pop(),
    data: fromFirestoreValue({ mapValue: { fields: document.fields ?? {} } }),
    updateTime: document.updateTime,
  };
}

async function getServiceAccountToken(fetchImpl) {
  const response = await fetchImpl(METADATA_TOKEN_URL, {
    headers: { "Metadata-Flavor": "Google" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Metadata server returned ${response.status}.`);
  const { access_token: accessToken } = await response.json();
  return accessToken;
}

/**
 * Stores subscriptions through the Firestore REST API using the Cloud Run service
 * account. Client SDK access to this collection stays blocked by firestore.rules.
 */
export function createFirestoreStore({
  projectId = firebaseConfig.projectId,
  fetchImpl = fetch,
  getAccessToken = () => getServiceAccountToken(fetchImpl),
} = {}) {
  const databasePath = `projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const baseUrl = `https://firestore.googleapis.com/v1/${databasePath}`;

  async function request(url, options = {}) {
    const accessToken = await getAccessToken();
    return fetchImpl(url, {
      ...options,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  function documentUrl(id) {
    return `${baseUrl}/${COLLECTION}/${encodeURIComponent(id)}`;
  }

  async function runQuery(fieldPath, value, limit) {
    const response = await request(`${baseUrl}:runQuery`, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: COLLECTION }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: "LESS_THAN_OR_EQUAL",
              value: { stringValue: value },
            },
          },
          orderBy: [{ field: { fieldPath }, direction: "ASCENDING" }],
          limit,
        },
      }),
    });
    if (!response.ok) throw new Error(`Firestore query failed (${response.status}).`);
    const rows = await response.json();
    return rows.filter((row) => row.document).map((row) => toSubscription(row.document));
  }

  return {
    async get(id) {
      const response = await request(documentUrl(id));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Firestore read failed (${response.status}).`);
      return toSubscription(await response.json());
    },

    async put(id, data, { updateTime } = {}) {
      const precondition = updateTime
        ? `?currentDocument.updateTime=${encodeURIComponent(updateTime)}`
        : "";
      const fields = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])
      );
      const response = await request(`${documentUrl(id)}${precondition}`, {
        method: "PATCH",
        body: JSON.stringify({ fields }),
      });
      if ([400, 409, 412].includes(response.status) && updateTime) {
        const conflict = new Error("Subscription changed during the update.");
        conflict.code = "conflict";
        throw conflict;
      }
      if (!response.ok) throw new Error(`Firestore write failed (${response.status}).`);
      return toSubscription(await response.json());
    },

    async delete(id) {
      const response = await request(documentUrl(id), { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Firestore delete failed (${response.status}).`);
      }
    },

    listDue: (today, limit) => runQuery("nextReminderDate", today, limit),
    listExpiredPending: (nowIso, limit) => runQuery("pendingExpiresAt", nowIso, limit),
  };
}
