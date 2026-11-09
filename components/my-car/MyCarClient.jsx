"use client";

import { useState } from "react";
import Link from "next/link";
import { NCD_STEPS } from "../../src/decision-data.mjs";
import {
  MAX_VEHICLES,
  formatCarSlotLabel,
  hasCarDetails,
  upcomingGarageDecisions,
} from "../../src/my-car.mjs";
import { singaporeToday } from "../../src/reminders/schedule.mjs";
import { deleteGarageCar, saveGarageCar } from "../../lib/my-car-service";
import ReminderSignup from "../reminders/ReminderSignup";
import { NumberField, SelectField } from "../tools/ToolFields";
import { useMyCar } from "./useMyCar";

const DATE_FIELDS = [
  { id: "insuranceRenewal", label: "Insurance renewal date" },
  { id: "coeExpiry", label: "COE expiry date" },
  { id: "loanReview", label: "Car loan review date", hint: "For example, when your lock-in ends." },
];

function describeDays(decision) {
  if (decision.isPast) return "Date has passed. Update it when you can.";
  if (decision.daysAway === 0) return "Today";
  return `In ${decision.daysAway} days`;
}

export default function MyCarClient() {
  const { car, cars, activeCarId, setCar, selectCar, addCar, applyGarage, user } = useMyCar();
  const [saveMessage, setSaveMessage] = useState("");
  const update = (field) => (value) => setCar((current) => ({ ...current, [field]: value }));
  const decisions = upcomingGarageDecisions(cars, singaporeToday());
  const activeIndex = Math.max(
    0,
    cars.findIndex((item) => item.id === activeCarId)
  );
  const canAddCar = cars.length < MAX_VEHICLES;

  async function handleSave(event) {
    event.preventDefault();
    try {
      const nextGarage = await saveGarageCar(user, { cars, activeCarId }, car);
      applyGarage(nextGarage, { broadcast: true });
      setSaveMessage(
        user
          ? "Saved to your account."
          : "Saved in this browser. Sign in to keep it across devices."
      );
    } catch {
      setSaveMessage("Saved in this browser, but your account could not be updated.");
    }
  }

  async function handleDelete() {
    try {
      const nextGarage = await deleteGarageCar(user, { cars, activeCarId }, activeCarId);
      applyGarage(nextGarage, { broadcast: true });
      setSaveMessage(
        cars.length > 1
          ? "Removed this car from your garage."
          : "Your saved car details were deleted."
      );
    } catch {
      setSaveMessage("Your account copy could not be deleted. Try again.");
    }
  }

  return (
    <div className="my-car-page">
      <div className="garage-bar" aria-label="Saved vehicles">
        <div className="garage-tabs" role="tablist" aria-label="Select a car">
          {cars.map((item, index) => {
            const isSelected = item.id === activeCarId;
            const slotName = formatCarSlotLabel(item, index);
            const saved = hasCarDetails(item);
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`garage-tab${isSelected ? " is-active" : ""}${saved ? " is-saved" : ""}`}
                onClick={() => {
                  selectCar(item.id);
                  setSaveMessage("");
                }}
              >
                <span className="garage-tab-dot" aria-hidden="true" />
                <span>{slotName}</span>
              </button>
            );
          })}
          {canAddCar ? (
            <button
              type="button"
              className="garage-add-btn"
              onClick={() => {
                addCar();
                setSaveMessage("");
              }}
            >
              + Add another car
            </button>
          ) : null}
        </div>
        <span className="garage-hint">
          {cars.length > 1
            ? "The selected car prefills the insurance and ownership calculators."
            : "Own more than one car? Add up to 5 cars and switch between them anytime."}
        </span>
      </div>

      <div className="tool-layout">
        <form className="tool-card" onSubmit={handleSave}>
          <h2>{formatCarSlotLabel(car, activeIndex)} details</h2>
          <p className="field-hint">
            These fill in the calculators for you. Do not enter your registration number.
          </p>
          <div className="field-grid two-col">
            <div className="field">
              <label htmlFor="car-label">Nickname</label>
              <input
                id="car-label"
                maxLength={40}
                placeholder={`e.g. ${activeIndex === 0 ? "Family sedan" : `Car ${activeIndex + 1}`}`}
                value={car.label}
                onChange={(event) => update("label")(event.target.value)}
              />
            </div>
            {DATE_FIELDS.map((field) => (
              <div className="field" key={field.id}>
                <label htmlFor={field.id}>{field.label}</label>
                <input
                  id={field.id}
                  type="date"
                  value={car[field.id]}
                  onChange={(event) => update(field.id)(event.target.value)}
                />
                {field.hint ? <span className="field-hint">{field.hint}</span> : null}
              </div>
            ))}
            <NumberField
              id="currentPremium"
              label="Current premium after NCD"
              prefix="S$"
              value={car.currentPremium}
              onChange={update("currentPremium")}
            />
            <NumberField
              id="excess"
              label="Policy excess"
              prefix="S$"
              value={car.excess}
              onChange={update("excess")}
            />
            <SelectField
              id="currentNcd"
              label="Current NCD"
              value={String(car.currentNcd)}
              onChange={update("currentNcd")}
              options={[
                { value: "", label: "Not set" },
                ...NCD_STEPS.map((step) => ({ value: String(step), label: `${step}%` })),
              ]}
            />
          </div>
          <div className="reminder-actions">
            <button type="submit" className="button button-primary">
              Save car
            </button>
            <button type="button" className="button button-ghost" onClick={handleDelete}>
              {cars.length > 1 ? "Remove this car" : "Delete saved details"}
            </button>
          </div>
          {saveMessage ? (
            <p className="reminder-success" role="status">
              {saveMessage}
            </p>
          ) : null}
        </form>

        <aside className="tool-result">
          <h2>
            {cars.length > 1
              ? "All cars: what’s next"
              : car.label
                ? `${car.label}: what’s next`
                : "What’s next"}
          </h2>
          {decisions.length === 0 ? (
            <p className="tool-headline">Add a date to see your upcoming decisions.</p>
          ) : (
            <ul className="decision-list">
              {decisions.map((decision) => (
                <li key={decision.key} className={decision.actNow ? "is-urgent" : undefined}>
                  <div className="decision-head">
                    <h3>
                      {cars.length > 1 ? `${decision.carLabel} · ${decision.title}` : decision.title}
                    </h3>
                    <span className="decision-date tabular-nums">{describeDays(decision)}</span>
                  </div>
                  <p>{decision.prompt}</p>
                  <Link
                    href={decision.href}
                    onClick={() => {
                      if (decision.carId && decision.carId !== activeCarId) {
                        selectCar(decision.carId);
                      }
                    }}
                  >
                    {decision.actionLabel} <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <ReminderSignup
        className="is-wide"
        dates={{
          insuranceRenewal: car.insuranceRenewal,
          coeExpiry: car.coeExpiry,
          loanReview: car.loanReview,
        }}
      />
    </div>
  );
}
