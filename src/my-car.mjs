import { addDays, isValidDateString } from "./reminders/schedule.mjs";
import { NCD_STEPS } from "./decision-data.mjs";

const MAX_LABEL_LENGTH = 40;

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
  return Object.values(car ?? {}).some((value) => value !== "" && value !== null && value !== undefined);
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
