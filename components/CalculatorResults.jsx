"use client";

import Link from "next/link";
import { formatCurrency, formatPercent } from "../src/formatters.mjs";
import { isNcdProtectorEligible } from "../src/decision-engine.mjs";
import PolicySourcePreview from "./PolicySourcePreview";
import TrajectoryVisualizer from "./TrajectoryVisualizer";
import StressTestSimulator from "./StressTestSimulator";

function getResultSourceMessage(resultMode, saveStatus) {
  if (resultMode === "saved") {
    return "Viewing the saved historical result. It has not been recalculated.";
  }
  if (saveStatus === "Saving…") {
    return resultMode === "recalculated"
      ? "Recalculated from saved inputs; saving the new comparison…"
      : "Calculated with the current model; saving the result…";
  }
  if (saveStatus === "Save unavailable") {
    return resultMode === "recalculated"
      ? "Recalculated from saved inputs, but the new result could not be saved."
      : "Calculated with the current model, but the result could not be saved.";
  }
  return resultMode === "recalculated"
    ? "Recalculated from saved inputs with the current model and saved as a new comparison."
    : "Calculated with the current model and saved to history.";
}

export default function CalculatorResults({
  inputs,
  profile,
  decision,
  resultMode,
  isDirty,
  isCalculating,
  authLoading,
  hasValidDraftQuote,
  showTable,
  saveStatus,
  shareStatus,
  onToggleTable,
  onRunSampleScenario,
  onShare,
}) {
  if (!decision) {
    return (
      <section className="preview-blueprint-card" aria-live="polite">
        <div className="verdict-top">
          <span className="blueprint-pill">Ready to calculate</span>
          <span className="verdict-horizon tabular-nums">
            {inputs.horizonYears}-year present value model
          </span>
        </div>

        <h2 className="blueprint-title">
          Enter your repair quote to run the comparison
        </h2>

        <p className="blueprint-lead">
          Enter your workshop repair quotation in Step 01 and review your policy terms.
          Click <strong>Calculate recommendation</strong> to model your{" "}
          {inputs.horizonYears}-year NCD step-down penalty and exact break-even threshold.
        </p>

        <div className="parameter-receipt">
          <div className="receipt-header">
            <span>Configured policy mechanics</span>
            <span className="tabular-nums">{profile.name}</span>
          </div>

          <dl className="receipt-list tabular-nums">
            <div className="receipt-row">
              <dt>Workshop repair quotation</dt>
              <dd>
                {hasValidDraftQuote ? (
                  <strong className="receipt-quote-ready">
                    {formatCurrency(inputs.repairCost)}
                  </strong>
                ) : (
                  <span className="receipt-quote-missing">Awaiting quote input</span>
                )}
              </dd>
            </div>

            <div className="receipt-row">
              <dt>Annual premium &amp; NCD</dt>
              <dd>
                {Number(inputs.currentPremium) > 0
                  ? formatCurrency(inputs.currentPremium)
                  : "—"}{" "}
                <span>at {formatPercent(inputs.currentNcd)} NCD</span>
              </dd>
            </div>

            <div className="receipt-row">
              <dt>Claim NCD impact</dt>
              <dd>Calculated when you run the model</dd>
            </div>

            <div className="receipt-row">
              <dt>Policy excess entered</dt>
              <dd>
                <strong>{formatCurrency(inputs.excess)}</strong>{" "}
                <span>Final excess includes policy surcharges, if applicable.</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="blueprint-actions">
          <button
            type="submit"
            form="calculator-form"
            className="button button-primary button-large"
            disabled={isCalculating || authLoading}
          >
            {authLoading
              ? "Checking sign-in…"
              : isCalculating
              ? "Calculating…"
              : "Calculate recommendation →"}
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={onRunSampleScenario}
            disabled={isCalculating || authLoading}
          >
            Try S$1,200 sample scenario
          </button>
        </div>
      </section>
    );
  }

  const claimIsBetter = decision.recommendation === "claim";
  const baseScenario = decision.baseScenario;
  const difference = baseScenario ? Math.abs(baseScenario.difference) : 0;
  const breakEven = baseScenario?.breakEvenRepairCost || 0;
  const selfPayTotal = baseScenario?.selfPayTotal || 0;
  const claimTotal = baseScenario?.claimTotal || 0;
  const maxTotal = Math.max(selfPayTotal, claimTotal, 1);

  const scaleMax = Math.max(
    breakEven * 1.35,
    Number(decision.inputs.repairCost) * 1.2,
    decision.effectiveExcess * 2,
    1000
  );
  const quotePct = Math.min(
    96,
    Math.max(4, (Number(decision.inputs.repairCost) / scaleMax) * 100)
  );
  const breakEvenPct = Math.min(92, Math.max(8, (breakEven / scaleMax) * 100));

  return (
    <>
      {resultMode && (
        <div className="result-source-banner" role="status">
          {getResultSourceMessage(resultMode, saveStatus)}
        </div>
      )}

      {isDirty && (
        <div className="dirty-banner" role="status">
          <span>
            You modified parameters on the left. Update to refresh this recommendation.
          </span>
          <button
            type="submit"
            form="calculator-form"
            className="button button-primary button-sm"
            disabled={isCalculating || authLoading}
          >
            Update calculation →
          </button>
        </div>
      )}

      {/* Print-Only Report Header & Input Summary */}
      <section className="print-report-header" aria-label="Printed report summary">
        <div className="print-report-brand">
          <strong>ClaimWise SG · Motor Insurance Claim Decision Report</strong>
          <span className="tabular-nums">
            {decision.profile?.name} — {decision.profile?.planName}
          </span>
        </div>
        <dl className="print-input-summary tabular-nums">
          <div>
            <dt>Repair quote</dt>
            <dd>{formatCurrency(decision.inputs.repairCost)}</dd>
          </div>
          <div>
            <dt>Annual premium</dt>
            <dd>{formatCurrency(decision.inputs.currentPremium)}</dd>
          </div>
          <div>
            <dt>Current NCD</dt>
            <dd>{formatPercent(decision.inputs.currentNcd)}</dd>
          </div>
          <div>
            <dt>Effective excess</dt>
            <dd>
              {formatCurrency(decision.effectiveExcess)} (base{" "}
              {formatCurrency(decision.inputs.excess)})
            </dd>
          </div>
          <div>
            <dt>Workshop &amp; category</dt>
            <dd>
              {decision.inputs.workshopType === "independent"
                ? "Independent"
                : "Authorised"}{" "}
              · {decision.inputs.repairType === "windscreen" ? "Windscreen" : "Bodywork"}
            </dd>
          </div>
          <div>
            <dt>Vehicle class</dt>
            <dd>
              {decision.inputs.vehicleUsage === "phv"
                ? "Commercial PHV (Z10/Z11)"
                : "Private Passenger (P10/P11)"}
            </dd>
          </div>
          <div>
            <dt>Liability &amp; riders</dt>
            <dd>
              {decision.inputs.liability === "non_fault"
                ? "100% Non-fault"
                : decision.inputs.liability === "partial_fault"
                ? "Split liability"
                : "At-fault"}
              {decision.inputs.ncdProtector && isNcdProtectorEligible(decision.inputs)
                ? " · NCD Protector"
                : ""}
            </dd>
          </div>
        </dl>
      </section>

      {/* 1. Primary Verdict Card */}
      <section
        className={`verdict-card ${claimIsBetter ? "is-claim" : "is-self-pay"} ${
          isDirty ? "is-stale" : ""
        }`}
        aria-live="polite"
      >
        <div className="verdict-top">
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <span className="verdict-pill">
              {decision.isBelowExcess
                ? "Below effective excess — self-pay"
                : claimIsBetter
                ? "Claiming is more cost-effective"
                : "Self-paying is more cost-effective"}
            </span>
            {decision.inputs.vehicleUsage === "phv" && (
              <span
                className="verdict-pill"
                style={{
                  background: "rgba(14, 165, 233, 0.15)",
                  color: "#0369a1",
                  borderColor: "rgba(14, 165, 233, 0.3)",
                }}
              >
                PHV Commercial (Z10/Z11)
              </span>
            )}
          </div>
          <span className="verdict-horizon tabular-nums">
            {decision.inputs.horizonYears}-year present value
          </span>
        </div>

        <h2 className="verdict-amount tabular-nums">
          {decision.isBelowExcess
            ? `Pay ${formatCurrency(decision.inputs.repairCost)} out-of-pocket`
            : claimIsBetter
            ? `Claiming saves about ${formatCurrency(difference)}`
            : `Self-paying saves about ${formatCurrency(difference)}`}
        </h2>

        <p className="verdict-explanation">
          {decision.isBelowExcess
            ? `Your repair quote (${formatCurrency(
                decision.inputs.repairCost
              )}) does not exceed your effective policy excess (${formatCurrency(
                decision.effectiveExcess
              )}). The insurer payout would be S$0.`
            : claimIsBetter
            ? `Your ${formatCurrency(
                decision.inputs.repairCost
              )} quote exceeds the ${formatCurrency(
                breakEven
              )} break-even threshold, so paying your ${formatCurrency(
                decision.effectiveExcess
              )} deductible and absorbing the renewal impact is cheaper than paying the full repair bill.`
            : `Paying ${formatCurrency(
                decision.inputs.repairCost
              )} today preserves your ${formatPercent(
                decision.selfPayNcdAfter
              )} renewal NCD and avoids ${formatCurrency(
                baseScenario.claimFutureDiscounted - baseScenario.selfPayFutureDiscounted
              )} in discounted renewal surcharges over ${
                decision.inputs.horizonYears
              } years.`}
        </p>

        {/* Break-Even Ruler */}
        <div className="breakeven-ruler">
          <div className="ruler-labels tabular-nums">
            <span>
              Your quote: <strong>{formatCurrency(decision.inputs.repairCost)}</strong>
            </span>
            <span>
              Break-even threshold: <strong>{formatCurrency(breakEven)}</strong>
            </span>
          </div>
          <div className="ruler-track">
            <div
              className="ruler-zone-selfpay"
              style={{ width: `${breakEvenPct}%` }}
            />
            <div
              className="ruler-threshold"
              style={{ left: `${breakEvenPct}%` }}
              title={`Break-even threshold: ${formatCurrency(breakEven)}`}
            />
            <div
              className={`ruler-marker ${claimIsBetter ? "is-claim" : "is-self-pay"}`}
              style={{ left: `${quotePct}%` }}
              title={`Your quote: ${formatCurrency(decision.inputs.repairCost)}`}
            />
          </div>
          <div className="ruler-caption">
            <span>← Self-pay cheaper (below {formatCurrency(breakEven)})</span>
            <span>Claim cheaper →</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <dl className="verdict-metrics tabular-nums">
          <div>
            <dt>Day 0 outflow</dt>
            <dd>
              {formatCurrency(baseScenario?.selfPayDay0Cost ?? decision.inputs.repairCost)}{" "}
              <span>vs.</span>{" "}
              {formatCurrency(baseScenario?.claimDay0Cost ?? decision.effectiveExcess)}
            </dd>
            <small>
              {baseScenario?.netDowntimeCost > 0
                ? "Includes vehicle downtime/rental"
                : "Self-pay repair vs. claim excess"}
            </small>
          </div>

          <div>
            <dt>Next renewal NCD</dt>
            <dd>
              {decision.claimNcdAfter === decision.selfPayNcdAfter
                ? `${formatPercent(decision.claimNcdAfter)} (Unchanged)`
                : `${formatPercent(decision.selfPayNcdAfter)} → ${formatPercent(
                    decision.claimNcdAfter
                  )}`}
            </dd>
            <small>Self-pay vs. claim path</small>
          </div>

          <div>
            <dt>Break-even repair</dt>
            <dd>{formatCurrency(breakEven)}</dd>
            <small>Minimum quote to justify claiming</small>
          </div>

          {baseScenario?.netDowntimeCost > 0 && (
            <div>
              <dt>Net downtime penalty</dt>
              <dd>+{formatCurrency(baseScenario.netDowntimeCost)}</dd>
              <small>
                {decision.inputs.claimDowntimeDays} claim days vs.{" "}
                {decision.inputs.selfPayDowntimeDays} self-pay day
              </small>
            </div>
          )}
        </dl>
      </section>

      {/* 2. Total Cost Comparison Bars */}
      <section className="comparison-card" aria-label="Total cost comparison">
        <div className="comparison-row">
          <div className="comparison-row-head">
            <div className="comparison-title-wrap">
              <strong>Self-pay path</strong>
              {!claimIsBetter && <span className="winner-tag">Lower cost</span>}
            </div>
            <strong className="comparison-total tabular-nums">
              {formatCurrency(selfPayTotal)}
            </strong>
          </div>
          <div className="comparison-bar-track">
            <div
              className={`comparison-bar-fill ${!claimIsBetter ? "is-winner" : ""}`}
              style={{ width: `${Math.max(8, (selfPayTotal / maxTotal) * 100)}%` }}
            />
          </div>
          <div className="comparison-sub tabular-nums">
            {formatCurrency(decision.inputs.repairCost)} repair
            {baseScenario?.selfPayDowntimeCost > 0
              ? ` + ${formatCurrency(baseScenario.selfPayDowntimeCost)} downtime`
              : ""}{" "}
            today + {formatCurrency(baseScenario?.selfPayFutureDiscounted)} over{" "}
            {decision.inputs.horizonYears} renewals (PV)
          </div>
        </div>

        <div className="comparison-row">
          <div className="comparison-row-head">
            <div className="comparison-title-wrap">
              <strong>Insurance claim path</strong>
              {claimIsBetter && <span className="winner-tag is-claim">Lower cost</span>}
            </div>
            <strong className="comparison-total tabular-nums">
              {formatCurrency(claimTotal)}
            </strong>
          </div>
          <div className="comparison-bar-track">
            <div
              className={`comparison-bar-fill ${claimIsBetter ? "is-winner-claim" : ""}`}
              style={{ width: `${Math.max(8, (claimTotal / maxTotal) * 100)}%` }}
            />
          </div>
          <div className="comparison-sub tabular-nums">
            {formatCurrency(baseScenario?.currentClaimCost)} deductible
            {baseScenario?.claimDowntimeCost > 0
              ? ` + ${formatCurrency(baseScenario.claimDowntimeCost)} downtime`
              : ""}{" "}
            today + {formatCurrency(baseScenario?.claimFutureDiscounted)} over{" "}
            {decision.inputs.horizonYears} renewals (PV)
          </div>
        </div>
      </section>

      {/* 2b. Private Settlement Agreement Callout for Self-Pay Recommendations */}
      {!claimIsBetter && (
        <section className="settlement-cta-card" aria-label="Private settlement action">
          <div className="settlement-cta-header">
            <span className="section-kicker">Recommended Next Step</span>
            <h3>Draft a Private Settlement Agreement</h3>
          </div>
          <p>
            When self-paying out-of-pocket, document the agreement in writing using a Singapore Motor Claims Framework (MCF) Private Settlement template. Note: You must still notify your insurer within 24 hours stating &ldquo;Settled Privately&rdquo;. The repair figure below is a suggested baseline to be agreed with the counterparty.
          </p>
          <div>
            <Link
              href={`/settlement?amount=${encodeURIComponent(
                decision.inputs.repairCost
              )}&mode=party_a_pays_party_b`}
              className="button button-primary"
            >
              Draft Private Settlement Template ({formatCurrency(decision.inputs.repairCost)}) →
            </Link>
          </div>
        </section>
      )}

      {/* 2c. Long-term decision prompt */}
      <section className="settlement-cta-card" aria-label="Upcoming car decisions">
        <div className="settlement-cta-header">
          <span className="section-kicker">Next Decision</span>
          <h3>Get a reminder before your insurance renews</h3>
        </div>
        <p>
          Save your renewal date and we will email you in time to check the NCD Protector and compare quotes.
        </p>
        <div>
          <Link href="/my-car" className="button button-secondary">
            Set up My Car →
          </Link>
        </div>
      </section>

      {/* 3. Active Policy Advisories */}
      {decision.advisories?.length > 0 && (
        <div className="advisory-stack">
          {decision.advisories.map((adv, i) => (
            <div key={i} className={`advisory-item is-${adv.type}`}>
              <strong>{adv.title}</strong>
              <p>{adv.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3b. Interactive Multi-Year Trajectory Visualizer */}
      <TrajectoryVisualizer
        baseScenario={baseScenario}
        inputs={decision.inputs}
        effectiveExcess={decision.effectiveExcess}
      />

      {/* 3c. Consecutive Incident Stress-Test & Resilience Buffer Simulator */}
      <StressTestSimulator decision={decision} />

      {/* 4. Expandable Year-by-Year Schedule */}
      <div className="breakdown-card">
        <button
          type="button"
          className="breakdown-toggle"
          aria-expanded={showTable}
          onClick={onToggleTable}
        >
          <div>
            <strong>Year-by-year renewal schedule</strong>
            <span>
              Nominal annual premiums and NCD recovery over{" "}
              {decision.inputs.horizonYears} years
            </span>
          </div>
          <svg
            className={`chevron-icon ${showTable ? "is-open" : ""}`}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div
          className={`breakdown-body ${showTable ? "is-open" : ""}`}
          hidden={!showTable}
        >
          <div className="table-wrap">
            <table className="tabular-nums">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Self-pay NCD</th>
                  <th>Self-pay premium</th>
                  <th>Claim NCD</th>
                  <th>Claim premium</th>
                  <th>Annual penalty</th>
                </tr>
              </thead>
              <tbody>
                {baseScenario?.selfPayYears.map((selfPayYear, idx) => {
                  const claimYear = baseScenario.claimYears[idx];
                  const gap = claimYear.premium - selfPayYear.premium;
                  return (
                    <tr key={selfPayYear.year}>
                      <td>Year {selfPayYear.year}</td>
                      <td>{formatPercent(selfPayYear.ncd)}</td>
                      <td>{formatCurrency(selfPayYear.premium)}</td>
                      <td>{formatPercent(claimYear.ncd)}</td>
                      <td>{formatCurrency(claimYear.premium)}</td>
                      <td className={gap > 0 ? "is-negative" : "is-positive"}>
                        {gap > 0 ? `+${formatCurrency(gap)}` : formatCurrency(gap)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Official Policy Clause Audit & PDF Source Viewer */}
      <PolicySourcePreview
        clauseAudit={decision.clauseAudit}
        insurer={decision.inputs.insurer}
      />

      {/* 6. Utility Actions */}
      <div className="result-toolbar">
        <span
          role="status"
          className={`button button-secondary ${
            saveStatus.startsWith("Saved") ? "is-saved" : ""
          }`}
        >
          {saveStatus || "Saved automatically"}
        </span>
        <button type="button" className="button button-ghost" onClick={onShare}>
          {shareStatus}
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => window.print()}
        >
          Print / PDF
        </button>
      </div>

      {/* 7. GIA MCF 24-Hour Rule */}
      <div className="result-disclaimer">
        <p>
          <strong>GIA 24-hour reporting rule:</strong> Under the Singapore Motor Claims
          Framework, all accidents must be reported to your insurer within 24 hours (or by
          the next working day), regardless of whether you file a claim. Reporting an
          incident does not obligate you to claim.
        </p>
      </div>
    </>
  );
}
