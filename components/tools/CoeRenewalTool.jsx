"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "../../src/formatters.mjs";
import {
  COE_RENEWAL_DEFAULTS,
  PARF_COHORTS,
  compareCoeOptions,
} from "../../src/car-decisions/coe-renewal.mjs";
import { NumberField, ResultRows, SelectField } from "./ToolFields";

const COHORT_OPTIONS = [
  { value: PARF_COHORTS.BEFORE_FEB_2023, label: "COE from before the 2nd bidding of Feb 2023" },
  { value: PARF_COHORTS.FEB_2023_TO_FEB_2026, label: "COE from 2nd bidding of Feb 2023 to 1st of Feb 2026" },
  { value: PARF_COHORTS.FROM_FEB_2026, label: "COE from the 2nd bidding of Feb 2026 onwards" },
];

export default function CoeRenewalTool() {
  const [inputs, setInputs] = useState(COE_RENEWAL_DEFAULTS);
  const update = (field) => (value) => setInputs((current) => ({ ...current, [field]: value }));
  const result = useMemo(() => compareCoeOptions(inputs), [inputs]);
  const best = result.options.find((option) => option.id === result.bestOptionId);

  return (
    <div className="tool-layout">
      <form className="tool-card" onSubmit={(event) => event.preventDefault()}>
        <h2>Your current car</h2>
        <div className="field-grid two-col">
          <NumberField
            id="pqp"
            label="Current PQP for your category"
            prefix="S$"
            hint="Check the latest PQP on OneMotoring. The default is only a placeholder."
            value={inputs.pqp}
            onChange={update("pqp")}
          />
          <NumberField
            id="carAgeYears"
            label="Car age at decision"
            suffix="years"
            max={30}
            hint="This comparison is designed for a car close to its COE expiry."
            value={inputs.carAgeYears}
            onChange={update("carAgeYears")}
          />
          <NumberField
            id="arfPaid"
            label="ARF paid"
            prefix="S$"
            hint="Shown in your LTA vehicle records."
            value={inputs.arfPaid}
            onChange={update("arfPaid")}
          />
          <SelectField
            id="parfCohort"
            label="When your COE was obtained"
            value={inputs.parfCohort}
            onChange={update("parfCohort")}
            options={COHORT_OPTIONS}
          />
          <NumberField
            id="coeQuotaPremiumPaid"
            label="COE premium paid"
            prefix="S$"
            value={inputs.coeQuotaPremiumPaid}
            onChange={update("coeQuotaPremiumPaid")}
          />
          <NumberField
            id="coeUnusedMonths"
            label="Unused COE months"
            max={120}
            value={inputs.coeUnusedMonths}
            onChange={update("coeUnusedMonths")}
          />
          <NumberField
            id="scrapValue"
            label="Scrap or export offer"
            prefix="S$"
            value={inputs.scrapValue}
            onChange={update("scrapValue")}
          />
          <NumberField
            id="endOfRenewalValue"
            label="Car's value when the renewal ends"
            prefix="S$"
            value={inputs.endOfRenewalValue}
            onChange={update("endOfRenewalValue")}
          />
          <NumberField
            id="annualRoadTax"
            label="Road tax before surcharge, per year"
            prefix="S$"
            value={inputs.annualRoadTax}
            onChange={update("annualRoadTax")}
          />
          <NumberField
            id="currentCarAnnualCost"
            label="Repairs, insurance and inspection, per year"
            prefix="S$"
            hint="Estimate for this car as it gets older."
            value={inputs.currentCarAnnualCost}
            onChange={update("currentCarAnnualCost")}
          />
        </div>

        <h2 className="tool-subheading">The replacement car</h2>
        <div className="field-grid two-col">
          <NumberField
            id="replacementPrice"
            label="Price including COE"
            prefix="S$"
            value={inputs.replacementPrice}
            onChange={update("replacementPrice")}
          />
          <NumberField
            id="replacementYears"
            label="Years you would keep it"
            min={1}
            max={10}
            value={inputs.replacementYears}
            onChange={update("replacementYears")}
          />
          <NumberField
            id="replacementResaleValue"
            label="Expected resale value then"
            prefix="S$"
            value={inputs.replacementResaleValue}
            onChange={update("replacementResaleValue")}
          />
          <NumberField
            id="replacementAnnualCost"
            label="Road tax, repairs and insurance, per year"
            prefix="S$"
            value={inputs.replacementAnnualCost}
            onChange={update("replacementAnnualCost")}
          />
        </div>
      </form>

      <aside className="tool-result" aria-live="polite">
        <span className="tool-verdict is-positive">{best.label}</span>
        <p className="tool-headline">
          Lowest yearly economic cost at about {formatCurrency(best.annualCost)}, saving{" "}
          {formatCurrency(result.annualSavingVsNextBest)} a year over the next best option.
        </p>
        <ResultRows
          rows={result.options.map((option) => [
            `${option.label}: yearly cost`,
            formatCurrency(option.annualCost),
          ])}
        />
        <ResultRows
          rows={result.options.map((option) => [
            `${option.label}: cash needed now`,
            formatCurrency(option.upfront),
          ])}
        />
        <h3>Value released if you deregister today</h3>
        <ResultRows
          rows={[
            ["PARF rebate", formatCurrency(result.parfRebate)],
            ["COE rebate", formatCurrency(result.coeRebate)],
            ["Total with scrap value", formatCurrency(result.deregistrationValue)],
          ]}
        />
        <ul className="tool-option-notes">
          {result.options.map((option) => (
            <li key={option.id}>{option.note}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
