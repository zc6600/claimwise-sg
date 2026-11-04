import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { buildCalculationRecord } from "../src/calculation-record.mjs";

const LOCAL_STORAGE_KEY = "claimwise_local_history";

/**
 * Save a calculation record using the shared record builder
 */
export async function saveCalculationRecord(
  user,
  { title, inputs, results, decision } = {}
) {
  const effectiveDecision =
    decision ||
    (inputs
      ? {
          inputs,
          recommendation:
            String(results?.recommendation || "self-pay").toLowerCase() === "claim"
              ? "claim"
              : "self-pay",
          baseScenario: {
            difference: Number(results?.savings || 0),
            breakEvenRepairCost: Number(results?.breakEvenCost || 0),
            claimFutureDiscounted: Number(
              results?.claimScenario?.claimFutureDiscounted ??
                results?.claimScenario?.threeYearTotal ??
                0
            ),
            selfPayFutureDiscounted: Number(
              results?.selfPayScenario?.selfPayFutureDiscounted ??
                results?.selfPayScenario?.threeYearTotal ??
                0
            ),
          },
        }
      : null);

  const record = buildCalculationRecord(effectiveDecision, {
    userId: user?.uid || undefined,
    title,
  });

  if (user?.uid) {
    try {
      const docRef = doc(db, "users", user.uid, "calculations", record.id);
      await setDoc(docRef, record);
      return record;
    } catch (e) {
      console.warn(
        "Firestore save unavailable, falling back to browser storage:",
        e?.message || e
      );
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    const updated = [
      record,
      ...existing.filter((item) => item.id !== record.id),
    ].slice(0, 20);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Local storage save error:", e);
    throw new Error("Could not save this calculation in this browser.");
  }

  return record;
}

/**
 * Subscribe to realtime calculations for a user
 */
export function subscribeToCalculations(user, callback) {
  if (user?.uid) {
    const q = query(
      collection(db, "users", user.uid, "calculations"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        callback(records, {
          source: snapshot.metadata.hasPendingWrites
            ? "syncing"
            : snapshot.metadata.fromCache
            ? "checking"
            : "cloud",
        });
      },
      (error) => {
        console.warn(
          "Firestore subscription unavailable, using browser storage:",
          error?.message || error
        );
        loadLocalRecords(callback, "unavailable");
      }
    );
  }

  loadLocalRecords(callback, "local");
  return () => {};
}

function loadLocalRecords(callback, source) {
  try {
    const items = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    callback(items, { source });
  } catch {
    callback([], { source });
  }
}

/**
 * Delete a calculation record
 */
export async function deleteCalculationRecord(user, calcId) {
  if (user?.uid) {
    try {
      const docRef = doc(db, "users", user.uid, "calculations", calcId);
      await deleteDoc(docRef);
      return;
    } catch (e) {
      console.warn(
        "Firestore delete unavailable, falling back to browser storage:",
        e?.message || e
      );
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    const updated = existing.filter((item) => item.id !== calcId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Local storage delete error:", e);
  }
}
