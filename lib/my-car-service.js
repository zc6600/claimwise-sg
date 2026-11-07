import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { EMPTY_CAR, normalizeMyCar } from "../src/my-car.mjs";

const LOCAL_STORAGE_KEY = "claimwise_my_car";

function carDocument(user) {
  return doc(db, "users", user.uid, "vehicles", "primary");
}

export function loadLocalCar() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? normalizeMyCar(JSON.parse(stored)) : { ...EMPTY_CAR };
  } catch {
    return { ...EMPTY_CAR };
  }
}

function saveLocalCar(car) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(car));
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
  saveLocalCar(car);
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

export function cacheCarLocally(car) {
  saveLocalCar(car);
}

