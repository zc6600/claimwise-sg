import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { formatCurrency } from "../src/formatters.mjs";
import { firebaseConfig } from "./firebase-config.js";

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
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

function makeCalculationRecord(userId, decision) {
  const scenario = decision.baseScenario;
  const calculationId = `calc_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const currentPremium = Number(decision.inputs.currentPremium);
  const ncdProtector = decision.inputs.ncdProtector === true;

  return {
    id: calculationId,
    userId,
    title: `Repair quote ${formatCurrency(decision.inputs.repairCost)}`,
    createdAt: new Date().toISOString(),
    inputs: {
      ...decision.inputs,
      annualPremium: currentPremium,
      hasNcdProtector: ncdProtector,
    },
    results: {
      recommendation: decision.recommendation === "claim" ? "CLAIM" : "SELF_PAY",
      savings: Math.abs(scenario?.difference || 0),
      breakEvenCost: scenario?.breakEvenRepairCost || 0,
      claimScenario: {
        threeYearTotal: scenario?.claimFutureDiscounted || 0,
      },
      selfPayScenario: {
        threeYearTotal: scenario?.selfPayFutureDiscounted || 0,
      },
    },
    decision,
  };
}

function getFirebaseUserIdFromToken(idToken) {
  const encodedClaims = idToken.split(".")[1];
  if (!encodedClaims) throw new Error("Firebase ID token is malformed.");

  let claims;
  try {
    claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8"));
  } catch {
    throw new Error("Firebase ID token is malformed.");
  }

  const userId = claims.user_id || claims.sub;
  if (typeof userId !== "string" || !userId) {
    throw new Error("Firebase ID token did not identify a user.");
  }

  // Firestore validates the signed Firebase ID token and applies the user's security rules.
  // This decoded UID only selects the document path; it is not treated as authentication.
  return userId;
}

export async function persistCalculationDecision(idToken, decision) {
  const userId = getFirebaseUserIdFromToken(idToken);
  const record = makeCalculationRecord(userId, decision);
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

  return { persisted: true, recordId: record.id };
}
