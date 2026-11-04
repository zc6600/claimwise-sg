import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { buildCalculationRecord } from "../src/calculation-record.mjs";
import { firebaseConfig } from "./firebase-config.js";

export function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Non-finite number in calculation record.");
    }
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof value === "object") {
    const fields = Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, toFirestoreValue(entry)])
    );
    return { mapValue: { fields } };
  }
  throw new TypeError("Unsupported value in calculation record.");
}

export function getFirebaseUserIdFromToken(idToken) {
  if (typeof idToken !== "string" || idToken.length > 8192) {
    throw new Error("Firebase ID token is malformed.");
  }

  const parts = idToken.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error("Firebase ID token is malformed.");
  }

  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("Firebase ID token is malformed.");
  }

  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("Firebase ID token is malformed.");
  }

  if (
    claims.exp !== undefined &&
    (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now())
  ) {
    throw new Error("Firebase ID token has expired.");
  }

  const projectId = firebaseConfig.projectId;
  if (claims.aud !== undefined && claims.aud !== projectId) {
    throw new Error("Firebase ID token audience mismatch.");
  }

  if (
    claims.iss !== undefined &&
    claims.iss !== `https://securetoken.google.com/${projectId}`
  ) {
    throw new Error("Firebase ID token issuer mismatch.");
  }

  const userId = claims.user_id || claims.sub;
  if (typeof userId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
    throw new Error("Firebase ID token did not identify a valid user.");
  }

  // Firestore validates the cryptographic signature of the Firebase ID token and enforces firestore.rules.
  return userId;
}

export async function persistCalculationDecision(idToken, decision) {
  const userId = getFirebaseUserIdFromToken(idToken);
  const calculationId = `calc_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const record = buildCalculationRecord(decision, {
    id: calculationId,
    userId,
  });
  const projectId = firebaseConfig.projectId;
  const documentPath = `users/${encodeURIComponent(userId)}/calculations/${encodeURIComponent(record.id)}`;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${documentPath}`;
  const fields = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, toFirestoreValue(value)])
  );

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Firestore rejected calculation persistence (${response.status}).`);
  }

  return { persisted: true, recordId: record.id, record };
}
