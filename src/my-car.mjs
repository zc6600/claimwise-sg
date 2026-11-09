import { addDays, isValidDateString } from "./reminders/schedule.mjs";
import { NCD_STEPS } from "./decision-data.mjs";

const MAX_LABEL_LENGTH = 40;

export const VEHICLE_SLOT_IDS = ["primary", "car-2", "car-3", "car-4", "car-5"];
export const MAX_VEHICLES = VEHICLE_SLOT_IDS.length;

export const EMPTY_CAR = {
  label: "",
  insuranceRenewal: "",
  coeExpiry: "",
  loanReview: "",
  currentPremium: "",
  currentNcd: "",
  excess: "",
};

const DATE_FIELDS = ["insuranceRenewal", "coeExpiry", "loanReview"];
const MONEY_FIELDS = ["currentPremium", "excess"];

const DECISIONS = [
  {
    id: "insuranceRenewal",
    title: "Insurance renewal",
    prompt: "Check the NCD Protector and compare quotes on total cost.",
    href: "/tools/ncd-protector",
    actionLabel: "Check renewal",
    windowDays: 60,
  },
  {
    id: "coeExpiry",
    title: "COE expiry",
    prompt: "Compare renewing for 5 or 10 years against replacing the car.",
    href: "/tools/coe-renewal",
    actionLabel: "Compare options",
    windowDays: 365,
  },
  {
    id: "loanReview",
    title: "Car loan review",
    prompt: "Check whether early settlement still saves money.",
    href: "/tools/loan-prepayment",
    actionLabel: "Check settlement",
    windowDays: 30,
  },
];

function cleanMoney(value) {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100000 ? parsed : "";
}

/** Keeps only the fields ClaimWise needs. Registration numbers are deliberately excluded. */
export function normalizeMyCar(raw = {}) {
  const car = { ...EMPTY_CAR };
  if (typeof raw?.label === "string") car.label = raw.label.trim().slice(0, MAX_LABEL_LENGTH);
  for (const field of DATE_FIELDS) {
    if (isValidDateString(raw?.[field])) car[field] = raw[field];
  }
  for (const field of MONEY_FIELDS) car[field] = cleanMoney(raw?.[field]);
  const ncd = raw?.currentNcd;
  if (ncd !== "" && ncd !== null && NCD_STEPS.includes(Number(ncd))) car.currentNcd = Number(ncd);
  return car;
}

export function hasCarDetails(car) {
  if (!car || typeof car !== "object") return false;
  return Object.keys(EMPTY_CAR).some((field) => {
    const value = car[field];
    return value !== "" && value !== null && value !== undefined;
  });
}

export function normalizeCarEntry(raw = {}, fallbackId = "primary") {
  const requestedId = typeof raw?.id === "string" && VEHICLE_SLOT_IDS.includes(raw.id)
    ? raw.id
    : fallbackId;
  return {
    id: VEHICLE_SLOT_IDS.includes(requestedId) ? requestedId : "primary",
    ...normalizeMyCar(raw),
  };
}

export function nextVehicleSlotId(cars = []) {
  const used = new Set((cars ?? []).map((item) => item?.id));
  return VEHICLE_SLOT_IDS.find((slotId) => !used.has(slotId)) ?? null;
}

/**
 * Normalizes a multi-car garage or migrates a single-car payload into a bounded garage
 * of 1..5 vehicle slots (`primary`, `car-2`..`car-5`).
 */
export function normalizeGarage(raw = {}) {
  const rawList = Array.isArray(raw?.cars)
    ? raw.cars
    : raw?.car && typeof raw.car === "object"
      ? [raw.car]
      : raw && typeof raw === "object" && Object.keys(EMPTY_CAR).some((key) => key in raw)
        ? [raw]
        : [];

  const cars = [];
  const usedIds = new Set();

  for (const item of rawList) {
    if (cars.length >= MAX_VEHICLES) break;
    const fallbackId = VEHICLE_SLOT_IDS.find((slotId) => !usedIds.has(slotId)) ?? "primary";
    const candidateId =
      typeof item?.id === "string" && VEHICLE_SLOT_IDS.includes(item.id) && !usedIds.has(item.id)
        ? item.id
        : fallbackId;
    usedIds.add(candidateId);
    cars.push(normalizeCarEntry(item, candidateId));
  }

  if (cars.length === 0) {
    cars.push({ id: "primary", ...EMPTY_CAR });
  }

  const requestedActiveId = typeof raw?.activeCarId === "string" ? raw.activeCarId : "";
  const activeCarId = cars.some((item) => item.id === requestedActiveId)
    ? requestedActiveId
    : cars[0].id;

  return { cars, activeCarId };
}

export function formatCarSlotLabel(car, index = 0) {
  const trimmed = typeof car?.label === "string" ? car.label.trim() : "";
  return trimmed || `Car ${index + 1}`;
}

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/** Lists saved dates by urgency and flags those inside their planning window. */
export function upcomingDecisions(car, today) {
  return DECISIONS.filter((decision) => car?.[decision.id])
    .map((decision) => {
      const date = car[decision.id];
      const daysAway = daysBetween(today, date);
      return {
        ...decision,
        date,
        daysAway,
        isPast: daysAway < 0,
        actNow: daysAway >= 0 && date <= addDays(today, decision.windowDays),
      };
    })
    .sort((a, b) => a.daysAway - b.daysAway);
}

/** Aggregates upcoming decisions across all saved vehicles in the garage, sorted by urgency. */
export function upcomingGarageDecisions(cars = [], today) {
  const all = [];
  (cars ?? []).forEach((car, index) => {
    const carLabel = formatCarSlotLabel(car, index);
    for (const decision of upcomingDecisions(car, today)) {
      all.push({
        ...decision,
        key: `${car.id || index}:${decision.id}`,
        carId: car.id || "primary",
        carLabel,
      });
    }
  });
  return all.sort((a, b) => a.daysAway - b.daysAway);
}
