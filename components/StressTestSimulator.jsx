"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatPercent } from "../src/formatters.mjs";
import { computeConsecutiveClaimStressTest } from "../src/stress-test-calculator.mjs";
import { meetsProtectorMinimum } from "../src/ncd/premium-path.mjs";

const SECOND_ACCIDENT_PRESETS = [1000, 1500, 2500, 4000];

export default function StressTestSimulator({ decision }) {
  const [isOpen, setIsOpen] = useState(false);
  const [secondRepairCost, setSecondRepairCost] = useState(1500);
  const [consecutiveLoadingPct, setConsecutiveLoadingPct] = useState(25);
  const [showSchedule, setShowSchedule] = useState(false);

  const stressResult = useMemo(() => {
    if (!decision || !decision.baseScenario || !decision.inputs) return null;
    try {
      return computeConsecutiveClaimStressTest(decision, {
        secondRepairCost,
        consecutiveLoadingPct,
      });
    } catch {
      return null;
    }
  }, [decision, secondRepairCost, consecutiveLoadingPct]);

  if (!decision || !stressResult) return null;

  const hasProtector = Boolean(
    decision.inputs.ncdProtector &&
      meetsProtectorMinimum(decision.inputs.currentNcd, decision.profile)
  );

  return (
    <section className="stress-test-card" aria-label="Consecutive claim stress test">
      <div className="stress-test-header">
        <div>
          <span className="section-kicker">Second accident</span>
          <h3 style={{ margin: "4px 0 6px 0", fontSize: "1.15rem" }}>
            What if you have another accident this year?
          </h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-secondary-text, #64748b)" }}>
            See how a second at-fault accident within 12 months would change both options.
          </p>
        </div>
        <button
          type="button"
          className="button button-ghost button-sm"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          {isOpen ? "Hide Stress Test ▲" : "Simulate 2nd Accident ▼"}
        </button>
      </div>

      {isOpen && (
        <div className="stress-test-body" style={{ marginTop: "16px" }}>
          {/* Preset Selector */}
          <div className="stress-test-controls" style={{ marginBottom: "16px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-primary-text, #334155)", display: "block", marginBottom: "6px" }}>
              Estimated 2nd collision repair quotation:
            </span>
            <div className="preset-chips" role="group" aria-label="Second accident repair presets">
              {SECOND_ACCIDENT_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`preset-chip tabular-nums ${
                    secondRepairCost === amt ? "is-active" : ""
                  }`}
                  onClick={() => setSecondRepairCost(amt)}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Dual Path Comparison Cards */}
          <div
            className="stress-test-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {/* Scenario A: Claimed Incident 1 */}
            <div
              style={{
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "8px",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "0.9rem", color: "#b91c1c" }}>
                  If You Claim Incident 1
                </strong>
                <span className="tabular-nums" style={{ fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.15)", color: "#b91c1c", padding: "2px 6px", borderRadius: "4px" }}>
                  {stressResult.incident1IsAtFault ? "2 At-Fault Claims on Record" : "1 Non-Fault + 1 At-Fault"}
                </span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px 0", fontSize: "0.83rem", color: "var(--color-secondary-text, #475569)", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>
                  • Year 2 Renewal NCD:{" "}
                  <strong style={{ color: "#b91c1c" }}>
                    {formatPercent(stressResult.claimYear2Ncd)}
                  </strong>{" "}
                  {hasProtector ? "(Protector exhausted on 1st claim)" : "(Double step-down)"}
                </li>
                <li>
                  • Underwriting Surcharge:{" "}
                  <strong style={{ color: "#b91c1c" }}>
                    {stressResult.claimSchedule[1].consecutiveLoadingPct > 0
                      ? `+${stressResult.claimSchedule[1].consecutiveLoadingPct}% adverse loading`
                      : "0% adverse loading"}
                    {stressResult.claimSchedule[1].commercialLoadingPct > 0
                      ? ` (+${stressResult.claimSchedule[1].commercialLoadingPct}% commercial)`
                      : ""}
                  </strong>
                </li>
                <li>
                  • Incident 2 Claim Outlay:{" "}
                  <span className="tabular-nums">
                    {formatCurrency(stressResult.secondIncidentClaimOutflow)}
                  </span>
                </li>
              </ul>
              <div style={{ borderTop: "1px dashed rgba(239, 68, 68, 0.2)", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Multi-year total:</span>
                <strong className="tabular-nums" style={{ fontSize: "1.05rem", color: "#b91c1c" }}>
                  {formatCurrency(stressResult.claimConsecutiveTotal)}
                </strong>
              </div>
            </div>

            {/* Scenario B: Self-Paid Incident 1 */}
            <div
              style={{
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "8px",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "0.9rem", color: "#047857" }}>
                  If You Self-Pay Incident 1
                </strong>
                <span className="tabular-nums" style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "#047857", padding: "2px 6px", borderRadius: "4px" }}>
                  1 Claim on Record
                </span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px 0", fontSize: "0.83rem", color: "var(--color-secondary-text, #475569)", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>
                  • Year 2 Renewal NCD:{" "}
                  <strong style={{ color: "#047857" }}>
                    {formatPercent(stressResult.selfPayYear2Ncd)}
                  </strong>{" "}
                  {hasProtector ? "(Protector shields 2nd claim!)" : "(Single step-down)"}
                </li>
                <li>
                  • Underwriting Surcharge:{" "}
                  <strong style={{ color: "#047857" }}>
                    0% adverse loading
                    {stressResult.selfPaySchedule[1].commercialLoadingPct > 0
                      ? ` (+${stressResult.selfPaySchedule[1].commercialLoadingPct}% commercial)`
                      : ""}
                  </strong>
                </li>
                <li>
                  • Incident 2 Claim Outlay:{" "}
                  <span className="tabular-nums">
                    {formatCurrency(stressResult.secondIncidentClaimOutflow)}
                  </span>
                </li>
              </ul>
              <div style={{ borderTop: "1px dashed rgba(16, 185, 129, 0.25)", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Multi-year total:</span>
                <strong className="tabular-nums" style={{ fontSize: "1.05rem", color: "#047857" }}>
                  {formatCurrency(stressResult.selfPayConsecutiveTotal)}
                </strong>
              </div>
            </div>
          </div>

          {/* Resilience Buffer Banner */}
          <div
            style={{
              background: "rgba(14, 165, 233, 0.08)",
              border: "1px solid rgba(14, 165, 233, 0.25)",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <strong style={{ fontSize: "0.92rem", color: "#0369a1" }}>
                  Clean Record Resilience Buffer:{" "}
                  <span className="tabular-nums">
                    +{formatCurrency(Math.max(0, stressResult.resilienceBuffer))}
                  </span>
                </strong>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#475569" }}>
                  {stressResult.resilienceBuffer > 0 ? (
                    <>
                      Keeping your record clean on Incident 1 provides an additional{" "}
                      <strong>{formatCurrency(stressResult.resilienceBuffer)}</strong> margin
                      against future risk, reducing your total 2-accident outlay to{" "}
                      <strong>{formatCurrency(stressResult.selfPayConsecutiveTotal)}</strong> (vs.{" "}
                      <strong>{formatCurrency(stressResult.claimConsecutiveTotal)}</strong> on the
                      claim path).
                    </>
                  ) : (
                    <>
                      Under a consecutive collision scenario, total estimated outlay is{" "}
                      <strong>{formatCurrency(stressResult.selfPayConsecutiveTotal)}</strong>{" "}
                      (self-pay) vs.{" "}
                      <strong>{formatCurrency(stressResult.claimConsecutiveTotal)}</strong> (claim).
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="reset-link"
                style={{ fontSize: "0.8rem" }}
                onClick={() => setShowSchedule((prev) => !prev)}
              >
                {showSchedule ? "Hide details" : "View renewal details"}
              </button>
            </div>
          </div>

          {/* Optional Year-by-Year Schedule */}
          {showSchedule && (
            <div style={{ overflowX: "auto", marginTop: "10px" }}>
              <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.1)", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px" }}>Year</th>
                    <th style={{ padding: "6px 8px" }}>Claim Path NCD</th>
                    <th style={{ padding: "6px 8px" }}>Claim Premium (PV)</th>
                    <th style={{ padding: "6px 8px" }}>Self-Pay Path NCD</th>
                    <th style={{ padding: "6px 8px" }}>Self-Pay Premium (PV)</th>
                  </tr>
                </thead>
                <tbody>
                  {stressResult.claimSchedule.map((cYear, idx) => {
                    const spYear = stressResult.selfPaySchedule[idx];
                    return (
                      <tr key={cYear.year} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <td style={{ padding: "6px 8px" }}>Year {cYear.year}</td>
                        <td style={{ padding: "6px 8px", color: cYear.ncd === 0 ? "#b91c1c" : "inherit" }}>
                          {formatPercent(cYear.ncd)} {cYear.loadingPct > 0 ? `(+${cYear.loadingPct}%)` : ""}
                        </td>
                        <td style={{ padding: "6px 8px" }} className="tabular-nums">
                          {formatCurrency(cYear.discountedPremium)}
                        </td>
                        <td style={{ padding: "6px 8px", color: "#047857" }}>
                          {formatPercent(spYear.ncd)}
                        </td>
                        <td style={{ padding: "6px 8px" }} className="tabular-nums">
                          {formatCurrency(spYear.discountedPremium)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
