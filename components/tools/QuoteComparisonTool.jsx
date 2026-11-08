"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "../../src/formatters.mjs";
import {
  MAX_QUOTES,
  QUOTE_COMPARISON_DEFAULTS,
  compareQuotes,
} from "../../src/car-decisions/quote-comparison.mjs";
import { useMyCar } from "../my-car/useMyCar";
import { NCD_STEPS } from "../../src/decision-data.mjs";
import { NumberField, ResultRows, SelectField } from "./ToolFields";

const emptyQuote = (index) => ({
  label: `Quote ${index + 1}`,
  premium: "",
  excess: "",
  workshopSurcharge: "",
});

export default function QuoteComparisonTool() {
  const { car } = useMyCar();
  const applied = useRef(false);
  const [settings, setSettings] = useState(QUOTE_COMPARISON_DEFAULTS);
  const [quotes, setQuotes] = useState([emptyQuote(0), emptyQuote(1)]);

  useEffect(() => {
    if (applied.current || (car.currentPremium === "" && car.excess === "" && car.currentNcd === "")) {
      return;
    }
    applied.current = true;
    if (car.currentNcd !== "") {
      setSettings((current) => ({ ...current, currentNcd: car.currentNcd }));
    }
    setQuotes((current) =>
      current.map((quote, index) =>
        index === 0 ? { ...quote, premium: car.currentPremium, excess: car.excess } : quote
      )
    );
  }, [car]);

  const updateQuote = (index, field) => (value) =>
    setQuotes((current) =>
      current.map((quote, position) => (position === index ? { ...quote, [field]: value } : quote))
    );
  const removeQuote = (index) =>
    setQuotes((current) => current.filter((_, position) => position !== index));
  const updateSetting = (field) => (value) =>
    setSettings((current) => ({ ...current, [field]: value }));

  const result = useMemo(() => compareQuotes({ ...settings, quotes }), [settings, quotes]);

  return (
    <div className="tool-layout">
      <form className="tool-card" onSubmit={(event) => event.preventDefault()}>
        <h2>Your quotes</h2>
        {quotes.map((quote, index) => (
          <fieldset className="tool-fieldset" key={index}>
            <legend>Quote {index + 1}</legend>
            {quotes.length > 2 ? (
              <button
                type="button"
                className="button button-ghost tool-remove"
                aria-label={`Remove quote ${index + 1}`}
                onClick={() => removeQuote(index)}
              >
                Remove
              </button>
            ) : null}
            <div className="field-grid four-col">
              <div className="field">
                <label htmlFor={`label-${index}`}>Name</label>
                <input
                  id={`label-${index}`}
                  maxLength={60}
                  value={quote.label}
                  onChange={(event) => updateQuote(index, "label")(event.target.value)}
                />
              </div>
              <NumberField
                id={`premium-${index}`}
                label="Premium"
                prefix="S$"
                value={quote.premium}
                onChange={updateQuote(index, "premium")}
              />
              <NumberField
                id={`excess-${index}`}
                label="Excess"
                prefix="S$"
                value={quote.excess}
                onChange={updateQuote(index, "excess")}
              />
              <NumberField
                id={`surcharge-${index}`}
                label="Own-workshop extra"
                prefix="S$"
                value={quote.workshopSurcharge}
                onChange={updateQuote(index, "workshopSurcharge")}
              />
            </div>
          </fieldset>
        ))}

        {quotes.length < MAX_QUOTES ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setQuotes((current) => [...current, emptyQuote(current.length)])}
          >
            Add another quote
          </button>
        ) : null}

        <h2 className="tool-subheading">Your situation</h2>
        <div className="field-grid four-col">
          <SelectField
            id="currentNcd"
            label="Current NCD"
            value={String(settings.currentNcd)}
            onChange={updateSetting("currentNcd")}
            options={NCD_STEPS.map((step) => ({ value: String(step), label: `${step}%` }))}
          />
          <NumberField
            id="incidentProbabilityPct"
            label="Accident chance this year"
            suffix="%"
            max={100}
            hint="At fault. Default is only an example."
            value={settings.incidentProbabilityPct}
            onChange={updateSetting("incidentProbabilityPct")}
          />
          <NumberField
            id="typicalRepairCost"
            label="Typical repair bill"
            prefix="S$"
            hint="You claim only if it costs less."
            value={settings.typicalRepairCost}
            onChange={updateSetting("typicalRepairCost")}
          />
          <SelectField
            id="workshop"
            label="Repair at"
            value={settings.usesNonAuthorisedWorkshop ? "independent" : "authorised"}
            onChange={(value) => updateSetting("usesNonAuthorisedWorkshop")(value === "independent")}
            options={[
              { value: "authorised", label: "Authorised workshop" },
              { value: "independent", label: "Own workshop" },
            ]}
          />
        </div>
      </form>

      <aside className="tool-result" aria-live="polite">
        {result.ready ? (
          <>
            <span className={`tool-verdict ${result.lowestPremiumIsBest ? "is-positive" : "is-caution"}`}>
              {result.lowestPremiumIsBest
                ? "The cheapest premium also wins overall"
                : "The cheapest premium is not the best deal"}
            </span>
            <p className="tool-headline">
              {result.bestLabel} has the lowest expected cost
              {result.lowestPremiumIsBest
                ? "."
                : `, about ${formatCurrency(result.expectedSavingVsLowestPremium)} a year less than ${result.lowestPremiumLabel}.`}
            </p>
            {result.quotes.map((quote, position) => (
              <div className="tool-quote" key={position}>
                <h3>{quote.label}</h3>
                <ResultRows
                  rows={[
                    ["Expected cost", formatCurrency(quote.expectedCost)],
                    ["Cost in a year with an accident", formatCurrency(quote.costWithIncident)],
                    [
                      quote.wouldClaim ? "Per accident: claim" : "Per accident: pay workshop",
                      formatCurrency(quote.costPerIncident),
                    ],
                    ["NCD loss if you claim", formatCurrency(quote.ncdLoss)],
                    ...(quote.breakEvenProbabilityPct === null
                      ? []
                      : [[`Beats ${result.lowestPremiumLabel} above`, `${quote.breakEvenProbabilityPct}% accident chance`]]),
                  ]}
                />
              </div>
            ))}
          </>
        ) : (
          <p className="tool-headline">Enter at least two premiums to compare them.</p>
        )}
      </aside>
    </div>
  );
}
