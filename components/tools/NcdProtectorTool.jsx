"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { INSURER_PROFILES, NCD_STEPS } from "../../src/decision-data.mjs";
import { formatCurrency } from "../../src/formatters.mjs";
import {
  NCD_PROTECTOR_DEFAULTS,
  evaluateNcdProtector,
} from "../../src/car-decisions/ncd-protector.mjs";
import { useMyCar } from "../my-car/useMyCar";
import { NumberField, ResultRows, SelectField } from "./ToolFields";

const VERDICTS = {
  buy: { title: "The rider looks worth buying", tone: "is-positive" },
  skip: { title: "The rider looks poor value", tone: "is-caution" },
  neutral: { title: "It is close either way", tone: "is-neutral" },
};

function describeBreakEven(result) {
  if (result.breakEvenProbabilityPct === null) {
    return "A protected claim would not change your renewal premiums.";
  }
  if (result.breakEvenProbabilityPct === 0) return "The rider is free, so it costs nothing to keep.";
  if (result.breakEvenProbabilityPct > 100) {
    return "Even one claim every year would not cover this rider price.";
  }
  // Round down so the stated frequency is never below the break-even claim chance.
  const years = Math.max(1, Math.floor(result.claimEveryYears));
  return `It pays off if you expect one at-fault claim about every ${years} years or more often.`;
}

export default function NcdProtectorTool() {
  const { car } = useMyCar();
  const applied = useRef(false);
  const [inputs, setInputs] = useState(NCD_PROTECTOR_DEFAULTS);
  const update = (field) => (value) => setInputs((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (applied.current || (car.currentPremium === "" && car.currentNcd === "")) return;
    applied.current = true;
    setInputs((current) => ({
      ...current,
      currentPremium: car.currentPremium === "" ? current.currentPremium : car.currentPremium,
      currentNcd: car.currentNcd === "" ? current.currentNcd : car.currentNcd,
    }));
  }, [car]);

  const result = useMemo(() => evaluateNcdProtector(inputs), [inputs]);
  const verdict = VERDICTS[result.recommendation];

  return (
    <div className="tool-layout">
      <form className="tool-card" onSubmit={(event) => event.preventDefault()}>
        <h2>Your renewal</h2>
        <div className="field-grid two-col">
          <SelectField
            id="insurer"
            label="Insurer"
            value={inputs.insurer}
            onChange={update("insurer")}
            options={Object.entries(INSURER_PROFILES).map(([value, profile]) => ({
              value,
              label: profile.name,
            }))}
          />
          <SelectField
            id="currentNcd"
            label="Current NCD"
            value={String(inputs.currentNcd)}
            onChange={update("currentNcd")}
            options={NCD_STEPS.map((step) => ({ value: String(step), label: `${step}%` }))}
          />
          <NumberField
            id="currentPremium"
            label="Renewal premium after NCD"
            prefix="S$"
            value={inputs.currentPremium}
            onChange={update("currentPremium")}
          />
          <NumberField
            id="protectorCost"
            label="NCD Protector price this year"
            prefix="S$"
            hint="Use the price on your renewal quote."
            value={inputs.protectorCost}
            onChange={update("protectorCost")}
          />
          <NumberField
            id="claimProbabilityPct"
            label="Your chance of an at-fault claim this year"
            suffix="%"
            max={100}
            hint="The default is an illustration, not a statistic. Change it to match your driving."
            value={inputs.claimProbabilityPct}
            onChange={update("claimProbabilityPct")}
          />
          <NumberField
            id="baseGrowthRate"
            label="Yearly premium growth"
            suffix="%"
            min={-20}
            max={50}
            value={inputs.baseGrowthRate}
            onChange={update("baseGrowthRate")}
          />
        </div>
      </form>

      <aside className="tool-result" aria-live="polite">
        {result.eligible && !result.ready ? (
          <p className="tool-headline">Enter your renewal premium to see the break-even point.</p>
        ) : result.eligible ? (
          <>
            <span className={`tool-verdict ${verdict.tone}`}>{verdict.title}</span>
            <p className="tool-headline">
              {describeBreakEven(result)}
            </p>
            <ResultRows
              rows={[
                ["Premium loss it would prevent", formatCurrency(result.premiumLossAvoided)],
                [
                  "Break-even claim chance",
                  result.breakEvenProbabilityPct === null
                    ? "Not available"
                    : `${result.breakEvenProbabilityPct}% a year`,
                ],
                ["Expected yearly benefit", formatCurrency(result.expectedBenefit)],
                ["Expected value after rider price", formatCurrency(result.netExpectedValue)],
              ]}
            />
          </>
        ) : (
          <>
            <span className="tool-verdict is-caution">Probably not available</span>
            <p className="tool-headline">
              This insurer’s rider normally requires a higher NCD than {inputs.currentNcd}%. Check your
              renewal notice.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
