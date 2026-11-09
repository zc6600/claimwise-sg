"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "../../src/formatters.mjs";
import { PARF_COHORTS } from "../../src/car-decisions/coe-renewal.mjs";
import {
  OWNERSHIP_COST_DEFAULTS,
  POWERTRAINS,
  evaluateOwnershipCost,
} from "../../src/car-decisions/ownership-cost.mjs";
import { useMyCar } from "../my-car/useMyCar";
import { NumberField, ResultRows, SelectField } from "./ToolFields";

const POWERTRAIN_OPTIONS = [
  { value: POWERTRAINS.PETROL, label: "Petrol" },
  { value: POWERTRAINS.HYBRID, label: "Petrol hybrid" },
  { value: POWERTRAINS.ELECTRIC, label: "Fully electric" },
];

const COHORT_OPTIONS = [
  { value: PARF_COHORTS.FROM_FEB_2026, label: "From mid-Feb 2026 (new cars today)" },
  { value: PARF_COHORTS.FEB_2023_TO_FEB_2026, label: "Mid-Feb 2023 to mid-Feb 2026" },
  { value: PARF_COHORTS.BEFORE_FEB_2023, label: "Before mid-Feb 2023" },
];

// Typical energy use and prices, applied when the car type changes.
const ENERGY_DEFAULTS = {
  [POWERTRAINS.PETROL]: { consumptionPer100Km: 6.5, energyPrice: 3 },
  [POWERTRAINS.HYBRID]: { consumptionPer100Km: 4.5, energyPrice: 3 },
  [POWERTRAINS.ELECTRIC]: { consumptionPer100Km: 15, energyPrice: 0.6 },
};

export default function OwnershipCostTool() {
  const { car, activeCarId } = useMyCar();
  const applied = useRef(null);
  const [inputs, setInputs] = useState(OWNERSHIP_COST_DEFAULTS);
  const update = (field) => (value) => setInputs((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (applied.current === activeCarId || car.currentPremium === "") return;
    applied.current = activeCarId;
    setInputs((current) => ({ ...current, insurancePerYear: car.currentPremium }));
  }, [car, activeCarId]);

  const result = useMemo(() => evaluateOwnershipCost(inputs), [inputs]);
  const isElectric = inputs.powertrain === POWERTRAINS.ELECTRIC;
  const usesEngine = inputs.powertrain !== POWERTRAINS.ELECTRIC;
  const usesMotor = inputs.powertrain !== POWERTRAINS.PETROL;
  const largestFirst = [...result.items].sort((a, b) => b.monthly - a.monthly);
  const years = result.inputs.yearsOwned;

  return (
    <div className="tool-layout">
      <form className="tool-card" onSubmit={(event) => event.preventDefault()}>
        <h2>The car</h2>
        <div className="field-grid three-col">
          <SelectField
            id="powertrain"
            label="Type"
            value={inputs.powertrain}
            onChange={(value) =>
              setInputs((current) => ({ ...current, powertrain: value, ...ENERGY_DEFAULTS[value] }))
            }
            options={POWERTRAIN_OPTIONS}
          />
          {usesEngine ? (
            <NumberField id="engineCc" label="Engine" suffix="cc" value={inputs.engineCc} onChange={update("engineCc")} />
          ) : null}
          {usesMotor ? (
            <NumberField id="powerKw" label="Motor power" suffix="kW" value={inputs.powerKw} onChange={update("powerKw")} />
          ) : null}
          <NumberField id="price" label="Price with COE" prefix="S$" value={inputs.price} onChange={update("price")} />
          <NumberField
            id="omv"
            label="OMV"
            prefix="S$"
            hint="Sets the loan limit."
            value={inputs.omv}
            onChange={update("omv")}
          />
          <NumberField
            id="yearsOwned"
            label="Years you will keep it"
            min={0.5}
            max={10}
            value={inputs.yearsOwned}
            onChange={update("yearsOwned")}
          />
        </div>

        <h2 className="tool-subheading">Loan</h2>
        <div className="field-grid three-col">
          <NumberField
            id="loanPct"
            label="Loan"
            suffix="% of price"
            max={70}
            value={inputs.loanPct}
            onChange={update("loanPct")}
          />
          <NumberField id="flatRatePct" label="Flat rate" suffix="%" max={30} value={inputs.flatRatePct} onChange={update("flatRatePct")} />
          <NumberField id="loanYears" label="Loan tenure" suffix="years" min={0.5} max={7} value={inputs.loanYears} onChange={update("loanYears")} />
        </div>

        <h2 className="tool-subheading">Running costs</h2>
        <div className="field-grid three-col">
          <NumberField id="insurancePerYear" label="Insurance per year" prefix="S$" value={inputs.insurancePerYear} onChange={update("insurancePerYear")} />
          <NumberField id="kmPerYear" label="Distance per year" suffix="km" value={inputs.kmPerYear} onChange={update("kmPerYear")} />
          <NumberField
            id="consumptionPer100Km"
            label={isElectric ? "Energy use" : "Fuel use"}
            suffix={isElectric ? "kWh/100km" : "L/100km"}
            value={inputs.consumptionPer100Km}
            onChange={update("consumptionPer100Km")}
          />
          <NumberField
            id="energyPrice"
            label={isElectric ? "Charging price" : "Pump price"}
            prefix="S$"
            suffix={isElectric ? "per kWh" : "per litre"}
            value={inputs.energyPrice}
            onChange={update("energyPrice")}
          />
          <NumberField id="parkingPerMonth" label="Parking per month" prefix="S$" value={inputs.parkingPerMonth} onChange={update("parkingPerMonth")} />
          <NumberField id="maintenancePerYear" label="Servicing per year" prefix="S$" value={inputs.maintenancePerYear} onChange={update("maintenancePerYear")} />
        </div>

        <details className="tool-more">
          <summary>More details: rebates, COE, and resale</summary>
          <div className="field-grid three-col">
            <NumberField id="arfPaid" label="ARF paid" prefix="S$" value={inputs.arfPaid} onChange={update("arfPaid")} />
            <NumberField id="coePremiumPaid" label="COE premium paid" prefix="S$" value={inputs.coePremiumPaid} onChange={update("coePremiumPaid")} />
            <SelectField
              id="parfCohort"
              label="Registered"
              value={inputs.parfCohort}
              onChange={update("parfCohort")}
              options={COHORT_OPTIONS}
            />
            <NumberField id="carAgeYears" label="Car age now" suffix="years" max={20} value={inputs.carAgeYears} onChange={update("carAgeYears")} />
            <NumberField id="coeYearsLeft" label="COE years left" min={0.5} max={10} value={inputs.coeYearsLeft} onChange={update("coeYearsLeft")} />
            <NumberField id="erpPerMonth" label="ERP and tolls per month" prefix="S$" value={inputs.erpPerMonth} onChange={update("erpPerMonth")} />
            <NumberField
              id="expectedEndValue"
              label="Expected resale value"
              prefix="S$"
              hint="Leave blank to use the rebates you would get back."
              value={inputs.expectedEndValue}
              onChange={update("expectedEndValue")}
            />
          </div>
        </details>
      </form>

      <aside className="tool-result" aria-live="polite">
        <span className="tool-verdict is-neutral">True cost</span>
        <p className="tool-headline">
          About {formatCurrency(result.totalMonthly)} a month, or{" "}
          {formatCurrency(result.totalOverOwnership)} over {years} {years === 1 ? "year" : "years"}
          {result.costPerKm === null ? "." : ` (S$${result.costPerKm.toFixed(2)} per km).`}
        </p>
        <ResultRows rows={largestFirst.map((item) => [item.label, formatCurrency(item.monthly)])} />

        <h3>Cash you pay</h3>
        <ResultRows
          rows={[
            ["Down payment", formatCurrency(result.downPayment)],
            ["Each month during the loan", formatCurrency(result.cashPerMonthDuringLoan)],
            ["Each month after the loan", formatCurrency(result.cashPerMonthAfterLoan)],
          ]}
        />
        <p className="tool-footnote">
          {result.endValueSource === "estimate"
            ? `Uses your resale estimate of ${formatCurrency(result.endValue)}.`
            : `Assumes the car is worth its ${formatCurrency(result.endValue)} rebates when you stop.`}
          {result.loanCapped ? ` Loan capped at the ${result.loanCapPct}% MAS limit for this OMV.` : ""}
        </p>
      </aside>
    </div>
  );
}
