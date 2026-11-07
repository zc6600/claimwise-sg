"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "../../src/formatters.mjs";
import {
  MAX_QUOTES,
  QUOTE_COMPARISON_DEFAULTS,
  compareQuotes,
} from "../../src/car-decisions/quote-comparison.mjs";
import { useMyCar } from "../my-car/useMyCar";
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
    if (applied.current || (car.currentPremium === "" && car.excess === "")) return;
    applied.current = true;
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
            <div className="field">
              <label htmlFor={`label-${index}`}>Name</label>
              <input
                id={`label-${index}`}
                maxLength={60}
                value={quote.label}
                onChange={(event) => updateQuote(index, "label")(event.target.value)}
              />
            </div>
            <div className="field-grid three-col">
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
                label="Extra excess outside authorised workshops"
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
        <div className="field-grid two-col">
          <NumberField
            id="claimProbabilityPct"
            label="Chance of claiming this year"
            suffix="%"
            max={100}
            hint="The default is an illustration, not a statistic."
            value={settings.claimProbabilityPct}
            onChange={updateSetting("claimProbabilityPct")}
          />
          <NumberField
            id="typicalRepairCost"
            label="Typical repair bill"
            prefix="S$"
            value={settings.typicalRepairCost}
            onChange={updateSetting("typicalRepairCost")}
          />
          <SelectField
            id="workshop"
            label="Where would you repair the car?"
            value={settings.usesNonAuthorisedWorkshop ? "independent" : "authorised"}
            onChange={(value) => updateSetting("usesNonAuthorisedWorkshop")(value === "independent")}
            options={[
              { value: "authorised", label: "Insurer's authorised workshop" },
              { value: "independent", label: "My own workshop" },
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
            {result.quotes.map((quote) => (
              <div className="tool-quote" key={`${quote.label}-${quote.premium}-${quote.excess}`}>
                <h3>{quote.label}</h3>
                <ResultRows
                  rows={[
                    ["Expected cost", formatCurrency(quote.expectedCost)],
                    ["Cost in a year with a claim", formatCurrency(quote.costWithClaim)],
                    ["You pay per claim", formatCurrency(quote.outOfPocketPerClaim)],
                    ...(quote.breakEvenProbabilityPct === null
                      ? []
                      : [[`Beats ${result.lowestPremiumLabel} above`, `${quote.breakEvenProbabilityPct}% claim chance`]]),
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
