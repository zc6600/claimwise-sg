import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  EMPTY_CAR,
  VEHICLE_SLOT_IDS,
  hasCarDetails,
  normalizeCarEntry,
  normalizeGarage,
  normalizeMyCar,
} from "../src/my-car.mjs";

const LOCAL_STORAGE_KEY = "claimwise_my_car";

function vehicleCollection(user) {
  return collection(db, "users", user.uid, "vehicles");
}

function vehicleDocument(user, vehicleId = "primary") {
  const safeId = VEHICLE_SLOT_IDS.includes(vehicleId) ? vehicleId : "primary";
  return doc(db, "users", user.uid, "vehicles", safeId);
}

/**
 * Reads the browser copy of the garage for the current viewer. A copy saved by one account is
 * hidden from other accounts and signed-out visitors, so shared browsers do not mix data.
 */
export function loadLocalGarage(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    if (!stored || typeof stored !== "object") {
      return { ...normalizeGarage({}), unowned: false };
    }
    if (stored.ownerUid && stored.ownerUid !== user?.uid) {
      return { ...normalizeGarage({}), unowned: false };
    }
    const garage = normalizeGarage(stored);
    return { ...garage, unowned: !stored.ownerUid };
  } catch {
    return { ...normalizeGarage({}), unowned: false };
  }
}

export function saveLocalGarage(user, rawGarage) {
  const garage = normalizeGarage(rawGarage);
  const activeCar =
    garage.cars.find((item) => item.id === garage.activeCarId) ?? garage.cars[0];
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        ownerUid: user?.uid ?? null,
        cars: garage.cars,
        activeCarId: garage.activeCarId,
        car: normalizeMyCar(activeCar),
      })
    );
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  return garage;
}

export async function loadCloudGarage(user) {
  const snapshot = await getDocs(vehicleCollection(user));
  if (snapshot.empty) return null;

  const byId = new Map();
  let activeCarId = "";
  let activeUpdatedAt = "";
  snapshot.forEach((docSnap) => {
    if (!VEHICLE_SLOT_IDS.includes(docSnap.id)) return;
    const data = docSnap.data();
    byId.set(docSnap.id, normalizeCarEntry(data, docSnap.id));
    if (data?.isActive === true) {
      const updatedAt = typeof data?.updatedAt === "string" ? data.updatedAt : "";
      if (!activeCarId || updatedAt >= activeUpdatedAt) {
        activeCarId = docSnap.id;
        activeUpdatedAt = updatedAt;
      }
    }
  });

  const cars = VEHICLE_SLOT_IDS.filter((slotId) => byId.has(slotId)).map((slotId) =>
    byId.get(slotId)
  );
  if (cars.length === 0) return null;

  return normalizeGarage({
    cars,
    activeCarId: activeCarId || cars[0].id,
  });
}

function toFirestorePayload(user, carEntry, isActive, timestamp) {
  const clean = normalizeMyCar(carEntry);
  return {
    ...clean,
    isActive: Boolean(isActive),
    userId: user.uid,
    updatedAt: timestamp || new Date().toISOString(),
  };
}

export async function saveGarageToCloud(user, rawGarage) {
  const garage = normalizeGarage(rawGarage);
  if (!user) return garage;

  const timestamp = new Date().toISOString();
  await Promise.all(
    garage.cars
      .filter((item) => hasCarDetails(item))
      .map((item) =>
        setDoc(
          vehicleDocument(user, item.id),
          toFirestorePayload(user, item, item.id === garage.activeCarId, timestamp)
        )
      )
  );
  return garage;
}

export async function saveGarageCar(user, rawGarage, rawCar) {
  const current = normalizeGarage(rawGarage);
  const targetId =
    typeof rawCar?.id === "string" && VEHICLE_SLOT_IDS.includes(rawCar.id)
      ? rawCar.id
      : current.activeCarId;
  const entry = normalizeCarEntry(rawCar, targetId);

  const exists = current.cars.some((item) => item.id === entry.id);
  const nextCars = exists
    ? current.cars.map((item) => (item.id === entry.id ? entry : item))
    : [...current.cars, entry];

  const nextGarage = saveLocalGarage(user, {
    cars: nextCars,
    activeCarId: entry.id,
  });

  if (user) {
    const timestamp = new Date().toISOString();
    await Promise.all(
      nextGarage.cars
        .filter((item) => item.id === entry.id || hasCarDetails(item))
        .map((item) =>
          setDoc(
            vehicleDocument(user, item.id),
            toFirestorePayload(user, item, item.id === entry.id, timestamp)
          )
        )
    );
  }
  return nextGarage;
}

export async function deleteGarageCar(user, rawGarage, carIdToDelete) {
  const current = normalizeGarage(rawGarage);
  const targetId = carIdToDelete || current.activeCarId;
  const remaining = current.cars.filter((item) => item.id !== targetId);

  if (user) {
    await deleteDoc(vehicleDocument(user, targetId));
  }

  return remaining.length > 0
    ? saveLocalGarage(user, {
        cars: remaining,
        activeCarId:
          current.activeCarId === targetId ? remaining[0].id : current.activeCarId,
      })
    : saveLocalGarage(user, {
        cars: [{ id: "primary", ...EMPTY_CAR }],
        activeCarId: "primary",
      });
}

export function loadLocalCar(user) {
  const { cars, activeCarId, unowned } = loadLocalGarage(user);
  const active = cars.find((item) => item.id === activeCarId) ?? cars[0];
  return { car: normalizeMyCar(active), unowned };
}

export async function loadCloudCar(user) {
  const garage = await loadCloudGarage(user);
  if (!garage) return null;
  const active = garage.cars.find((item) => item.id === garage.activeCarId) ?? garage.cars[0];
  return normalizeMyCar(active);
}

export async function saveCar(user, rawCar) {
  const current = loadLocalGarage(user);
  const next = await saveGarageCar(user, current, {
    ...rawCar,
    id: rawCar?.id || current.activeCarId,
  });
  const active = next.cars.find((item) => item.id === next.activeCarId) ?? next.cars[0];
  return normalizeMyCar(active);
}

export async function deleteCar(user) {
  const current = loadLocalGarage(user);
  await deleteGarageCar(user, current, current.activeCarId);
}

export function cacheCarLocally(user, carOrGarage) {
  saveLocalGarage(user, carOrGarage);
}
