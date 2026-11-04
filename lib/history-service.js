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

const LOCAL_STORAGE_KEY = "claimwise_local_history";

/**
 * Save a calculation record
 */
export async function saveCalculationRecord(user, { title, inputs, results, decision }) {
  const calcId = `calc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id: calcId,
    title: title || `Repair Quote S$${inputs.repairCost.toLocaleString()}`,
    createdAt: new Date().toISOString(),
    inputs: {
      insurer: inputs.insurer || "other",
      repairCost: Number(inputs.repairCost),
      excess: Number(inputs.excess),
      currentNcd: Number(inputs.currentNcd),
      ncdProtector: inputs.ncdProtector === true || inputs.hasNcdProtector === true,
      // Keep legacy field names until the updated Firestore rules have been deployed.
      hasNcdProtector: inputs.ncdProtector === true || inputs.hasNcdProtector === true,
      currentPremium: Number(inputs.currentPremium ?? inputs.annualPremium),
      annualPremium: Number(inputs.currentPremium ?? inputs.annualPremium),
      horizonYears: Number(inputs.horizonYears ?? 3),
      baseGrowthRate: Number(inputs.baseGrowthRate ?? 5),
      discountRate: Number(inputs.discountRate ?? 3),
      liability: inputs.liability || "at_fault",
      thirdPartyClaim: inputs.thirdPartyClaim === true,
      workshopType: inputs.workshopType || "authorized",
      youngDriverInvolved: inputs.youngDriverInvolved === true,
      repairType: inputs.repairType || "general",
    },
    results: {
      recommendation: results.recommendation === "claim" ? "CLAIM" : "SELF_PAY",
      savings: Number(results.savings || 0),
      breakEvenCost: Number(results.breakEvenCost || 0),
      claimScenario: {
        threeYearTotal: Number(results.claimScenario?.claimFutureDiscounted ?? results.claimScenario?.threeYearTotal ?? 0),
      },
      selfPayScenario: {
        threeYearTotal: Number(results.selfPayScenario?.selfPayFutureDiscounted ?? results.selfPayScenario?.threeYearTotal ?? 0),
      },
    },
    ...(decision ? { decision } : {}),
  };

  // If user is logged in with real Firebase account
  if (user?.uid) {
    try {
      record.userId = user.uid;
      const docRef = doc(db, "users", user.uid, "calculations", calcId);
      await setDoc(docRef, record);
      return record;
    } catch (e) {
      console.warn("Firestore save unavailable, falling back to browser storage:", e?.message || e);
    }
  }

  // Otherwise store in localStorage for demo/guest session
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    const updated = [record, ...existing.filter((item) => item.id !== calcId)].slice(0, 20);
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
        console.warn("Firestore subscription unavailable, using browser storage:", error?.message || error);
        // Fallback to local
        loadLocalRecords(callback, "unavailable");
      }
    );
  }

  // Guest / Demo mode: read from localStorage
  loadLocalRecords(callback, "local");
  return () => {};
}

function loadLocalRecords(callback, source) {
  try {
    const items = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    callback(items, { source });
  } catch (e) {
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
      console.warn("Firestore delete unavailable, falling back to browser storage:", e?.message || e);
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
