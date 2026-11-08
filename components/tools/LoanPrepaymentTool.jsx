"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "../../src/formatters.mjs";
import {
  LOAN_PREPAYMENT_DEFAULTS,
  evaluateLoanPrepayment,
} from "../../src/car-decisions/loan-prepayment.mjs";
import { NumberField, ResultRows } from "./ToolFields";

export default function LoanPrepaymentTool() {
  const [inputs, setInputs] = useState(LOAN_PREPAYMENT_DEFAULTS);
  const update = (field) => (value) => setInputs((current) => ({ ...current, [field]: value }));
  const result = useMemo(() => evaluateLoanPrepayment(inputs), [inputs]);

  return (
    <div className="tool-layout">
      <form className="tool-card" onSubmit={(event) => event.preventDefault()}>
        <h2>Your loan</h2>
        <div className="field-grid two-col">
          <NumberField
            id="originalPrincipal"
            label="Original loan amount"
            prefix="S$"
            value={inputs.originalPrincipal}
            onChange={update("originalPrincipal")}
          />
          <NumberField
            id="flatRatePct"
            label="Flat interest rate"
            suffix="% a year"
            max={30}
            value={inputs.flatRatePct}
            onChange={update("flatRatePct")}
          />
          <NumberField
            id="tenureMonths"
            label="Loan tenure"
            suffix="months"
            min={1}
            max={120}
            step={1}
            value={inputs.tenureMonths}
            onChange={update("tenureMonths")}
          />
          <NumberField
            id="monthsPaid"
            label="Instalments already paid"
            max={120}
            step={1}
            value={inputs.monthsPaid}
            onChange={update("monthsPaid")}
          />
          <NumberField
            id="rebateFeePct"
            label="Fee on the interest rebate"
            suffix="%"
            max={100}
            hint="Often 20%. Check your agreement."
            value={inputs.rebateFeePct}
            onChange={update("rebateFeePct")}
          />
          <NumberField
            id="penaltyPctOfOriginal"
            label="Penalty on original loan"
            suffix="%"
            max={20}
            value={inputs.penaltyPctOfOriginal}
            onChange={update("penaltyPctOfOriginal")}
          />
          <NumberField
            id="adminFee"
            label="Admin fee"
            prefix="S$"
            value={inputs.adminFee}
            onChange={update("adminFee")}
          />
          <NumberField
            id="alternativeReturnPct"
            label="Return your cash earns instead"
            suffix="% a year"
            max={30}
            value={inputs.alternativeReturnPct}
            onChange={update("alternativeReturnPct")}
          />
        </div>
      </form>

      <aside className="tool-result" aria-live="polite">
        {result.ready ? (
          <>
            <span className={`tool-verdict ${result.recommendation === "settle" ? "is-positive" : "is-caution"}`}>
              {result.recommendation === "settle" ? "Settling early looks better" : "Keeping the loan looks better"}
            </span>
            <p className="tool-headline">
              {result.breakEvenReturnPct === null
                ? "Settling would cost at least as much as paying every remaining instalment."
                : `Settling wins unless your cash can earn more than ${result.breakEvenReturnPct}% a year.`}
            </p>
            <ResultRows
              rows={[
                ["Estimated settlement", formatCurrency(result.settlementAmount)],
                ["Remaining instalments", formatCurrency(result.remainingInstalments)],
                ["Interest rebate", formatCurrency(result.grossInterestRebate)],
                ["Fees and penalty", formatCurrency(result.rebateFee + result.penalty + result.inputs.adminFee)],
                ["Cash saved before investment returns", formatCurrency(result.nominalSaving)],
                ["Benefit after investment returns", formatCurrency(result.netPresentBenefit)],
              ]}
            />
          </>
        ) : (
          <p className="tool-headline">Enter an active loan to see the settlement estimate.</p>
        )}
      </aside>
    </div>
  );
}
