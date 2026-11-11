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
const LOCAL_HISTORY_EVENT = "claimwise:local-history-changed";

function writeLocalRecords(records) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LOCAL_HISTORY_EVENT));
  }
}

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
    writeLocalRecords(updated);
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

    let stopLocal = null;
    const stopCloud = onSnapshot(
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
        stopLocal = subscribeToLocalRecords(callback, "unavailable");
      }
    );

    return () => {
      stopCloud();
      if (stopLocal) stopLocal();
    };
  }

  return subscribeToLocalRecords(callback, "local");
}

/**
 * Emits the browser-stored history now and again whenever it changes, either in
 * this tab (save/delete) or in another tab (storage event).
 */
function subscribeToLocalRecords(callback, source) {
  const emit = () => loadLocalRecords(callback, source);
  emit();
  if (typeof window === "undefined") return () => {};

  const onStorage = (event) => {
    if (event.key === null || event.key === LOCAL_STORAGE_KEY) emit();
  };
  window.addEventListener(LOCAL_HISTORY_EVENT, emit);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LOCAL_HISTORY_EVENT, emit);
    window.removeEventListener("storage", onStorage);
  };
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
 * Synchronize guest calculation history from local storage to Firestore upon user login
 */
export async function syncLocalCalculationsToCloud(user) {
  if (!user?.uid || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) return;

    for (const item of items) {
      if (item && item.id) {
        const effectiveDecision =
          item.decision ||
          (item.inputs
            ? {
                inputs: item.inputs,
                recommendation:
                  String(item.results?.recommendation || "self-pay").toLowerCase() ===
                  "claim"
                    ? "claim"
                    : "self-pay",
                baseScenario: {
                  difference: Number(item.results?.savings || 0),
                  breakEvenRepairCost: Number(item.results?.breakEvenCost || 0),
                  claimFutureDiscounted: Number(
                    item.results?.claimScenario?.claimFutureDiscounted ??
                      item.results?.claimScenario?.threeYearTotal ??
                      0
                  ),
                  selfPayFutureDiscounted: Number(
                    item.results?.selfPayScenario?.selfPayFutureDiscounted ??
                      item.results?.selfPayScenario?.threeYearTotal ??
                      0
                  ),
                },
              }
            : null);

        if (effectiveDecision) {
          const docRef = doc(db, "users", user.uid, "calculations", item.id);
          const record = buildCalculationRecord(effectiveDecision, {
            id: item.id,
            userId: user.uid,
            title: item.title,
            createdAt: item.createdAt,
          });
          await setDoc(docRef, record, { merge: true });
        }
      }
    }

    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.warn("Local calculation sync to cloud failed:", e?.message || e);
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
    writeLocalRecords(updated);
  } catch (e) {
    console.warn("Local storage delete error:", e);
  }
}
