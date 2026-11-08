import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { EMPTY_CAR, normalizeMyCar } from "../src/my-car.mjs";

const LOCAL_STORAGE_KEY = "claimwise_my_car";

function carDocument(user) {
  return doc(db, "users", user.uid, "vehicles", "primary");
}

/**
 * Reads the browser copy for the current viewer. A copy saved by one account is hidden
 * from other accounts and signed-out visitors, so shared browsers do not mix data.
 */
export function loadLocalCar(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    if (!stored?.car) return { car: { ...EMPTY_CAR }, unowned: false };
    if (stored.ownerUid && stored.ownerUid !== user?.uid) {
      return { car: { ...EMPTY_CAR }, unowned: false };
    }
    return { car: normalizeMyCar(stored.car), unowned: !stored.ownerUid };
  } catch {
    return { car: { ...EMPTY_CAR }, unowned: false };
  }
}

function saveLocalCar(user, car) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ownerUid: user?.uid ?? null, car }));
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export async function loadCloudCar(user) {
  const snapshot = await getDoc(carDocument(user));
  return snapshot.exists() ? normalizeMyCar(snapshot.data()) : null;
}

export async function saveCar(user, rawCar) {
  const car = normalizeMyCar(rawCar);
  saveLocalCar(user, car);
  if (user) {
    await setDoc(carDocument(user), { ...car, userId: user.uid, updatedAt: new Date().toISOString() });
  }
  return car;
}

export async function deleteCar(user) {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  if (user) await deleteDoc(carDocument(user));
}

export function cacheCarLocally(user, car) {
  saveLocalCar(user, car);
}

