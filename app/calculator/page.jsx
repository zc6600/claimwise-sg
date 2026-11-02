"use client";

import { useState, useEffect, useRef } from "react";
import {
  INSURER_PROFILES,
  NCD_STEPS,
  calculateDecision,
  formatCurrency,
  formatPercent,
} from "../../src/decision-engine.mjs";
import { useAuth } from "../../components/AuthProvider";
import { saveCalculationRecord } from "../../lib/history-service";
import CalculationHistory from "../../components/CalculationHistory";

const DEFAULT_INPUTS = {
  insurer: "income",
  currentPremium: 1650,
  currentNcd: 50,
  excess: 600,
  repairCost: "",
  horizonYears: 3,
  baseGrowthRate: 5,
  discountRate: 3,
  ncdProtector: false,
  liability: "at_fault",
  thirdPartyClaim: false,
  workshopType: "authorized",
  youngDriverInvolved: false,
  repairType: "general",
};

const QUICK_REPAIR_PRESETS = [800, 1200, 2200, 3500];

function validateField(field, value) {
  if (field === "repairCost") {
    const raw = String(value ?? "").trim();
    if (raw === "") {
      return "Enter your workshop repair quotation (or pick an estimate below) to calculate.";
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) {
      return "Enter a repair quotation greater than S$0.";
    }
  }
  if (field === "currentPremium") {
    const raw = String(value ?? "").trim();
    const num = Number(raw);
    if (raw === "" || !Number.isFinite(num) || num <= 0) {
      return "Enter your annual motor insurance premium (above S$0).";
    }
  }
  if (field === "excess") {
    const raw = String(value ?? "").trim();
    const num = Number(raw);
    if (raw === "" || !Number.isFinite(num) || num < 0) {
      return "Enter a valid policy excess (S$0 or higher).";
    }
  }
  return "";
}

function validateAllInputs(candidate) {
  const nextErrors = {};
  for (const field of ["repairCost", "currentPremium", "excess"]) {
    const msg = validateField(field, candidate[field]);
    if (msg) nextErrors[field] = msg;
  }
  return nextErrors;
}

function areInputsEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.insurer === b.insurer &&
    Number(a.currentPremium) === Number(b.currentPremium) &&
    Number(a.currentNcd) === Number(b.currentNcd) &&
    Number(a.excess) === Number(b.excess) &&
    Number(a.repairCost) === Number(b.repairCost) &&
    Number(a.horizonYears) === Number(b.horizonYears) &&
    Boolean(a.ncdProtector) === Boolean(b.ncdProtector) &&
    a.liability === b.liability &&
    Boolean(a.thirdPartyClaim) === Boolean(b.thirdPartyClaim) &&
    a.workshopType === b.workshopType &&
    Boolean(a.youngDriverInvolved) === Boolean(b.youngDriverInvolved) &&
    a.repairType === b.repairType
  );
}

export default function CalculatorPage() {
  const { user } = useAuth();
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [submittedInputs, setSubmittedInputs] = useState(null);
  const [errors, setErrors] = useState({});
  const [showTable, setShowTable] = useState(false);
  const [shareStatus, setShareStatus] = useState("Share link");
  const [saveStatus, setSaveStatus] = useState("Save comparison");

  const repairCostInputRef = useRef(null);
  const premiumInputRef = useRef(null);
  const excessInputRef = useRef(null);

  // Hydrate initial query parameters if navigated from Home quick estimator
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qRepair = params.get("repairCost");
    const qNcd = params.get("currentNcd");
    if (qRepair !== null || qNcd !== null) {
      const parsedRepair =
        qRepair !== null && Number(qRepair) > 0 ? Number(qRepair) : "";
      const parsedNcd =
        qNcd !== null && NCD_STEPS.includes(Number(qNcd))
          ? Number(qNcd)
          : DEFAULT_INPUTS.currentNcd;

      setInputs((prev) => ({
        ...prev,
        repairCost: parsedRepair !== "" ? parsedRepair : prev.repairCost,
        currentNcd: parsedNcd,
      }));
    }
  }, []);

  // Live preview calculation (for parameter receipt before submit)
  const previewDecision = calculateDecision({
    ...inputs,
    repairCost: Number(inputs.repairCost) > 0 ? Number(inputs.repairCost) : 0,
  });

  // Committed calculation (only after explicit form submission or loading a saved record)
  const decision = submittedInputs ? calculateDecision(submittedInputs) : null;
  const isDirty = Boolean(submittedInputs && !areInputsEqual(inputs, submittedInputs));

  function handleInputChange(field, value) {
    setInputs((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleFieldBlur(field) {
    const msg = validateField(field, inputs[field]);
    setErrors((prev) => {
      if (!msg && !prev[field]) return prev;
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  }

  function focusFirstInvalid(validationErrors) {
    if (validationErrors.repairCost && repairCostInputRef.current) {
      repairCostInputRef.current.focus();
    } else if (validationErrors.currentPremium && premiumInputRef.current) {
      premiumInputRef.current.focus();
    } else if (validationErrors.excess && excessInputRef.current) {
      excessInputRef.current.focus();
    }
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    const validationErrors = validateAllInputs(inputs);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstInvalid(validationErrors);
      return;
    }
    setErrors({});
    setSubmittedInputs({
      ...inputs,
      currentPremium: Number(inputs.currentPremium),
      excess: Number(inputs.excess),
      repairCost: Number(inputs.repairCost),
    });
  }

  function handleRunSampleScenario() {
    const sample = {
      ...inputs,
      currentPremium: Number(inputs.currentPremium) > 0 ? Number(inputs.currentPremium) : 1650,
      excess: Number(inputs.excess) >= 0 ? Number(inputs.excess) : 600,
      repairCost: Number(inputs.repairCost) > 0 ? Number(inputs.repairCost) : 1200,
    };
    setErrors({});
    setInputs(sample);
    setSubmittedInputs(sample);
  }

  function handleReset() {
    setInputs(DEFAULT_INPUTS);
    setSubmittedInputs(null);
    setErrors({});
    setShowTable(false);
  }

  async function handleShare() {
    const active = submittedInputs || inputs;
    const url = new URL(window.location.href);
    if (Number(active.repairCost) > 0) {
      url.searchParams.set("repairCost", String(active.repairCost));
    }
    url.searchParams.set("currentNcd", String(active.currentNcd));
    const shareUrl = url.toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: "ClaimWise SG Decision Estimate",
          text: "Motor insurance claim vs. self-pay cost comparison",
          url: shareUrl,
        });
        setShareStatus("Shared");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("Link copied");
      }
    } catch {
      setShareStatus("Share link");
    }
    setTimeout(() => setShareStatus("Share link"), 2200);
  }

  async function handleSaveCalculation() {
    if (!decision) return;
    setSaveStatus("Saving…");
    try {
      const base = decision.scenarios?.[1] || decision.scenarios?.[0] || decision.baseScenario;
      await saveCalculationRecord(user, {
        title: `Repair quote ${formatCurrency(decision.inputs.repairCost)}`,
        inputs: { ...decision.inputs },
        results: {
          recommendation: decision.recommendation,
          savings: Math.abs(base?.difference || 0),
          breakEvenCost: base?.breakEvenRepairCost || 0,
          claimScenario: { threeYearTotal: base?.claimTotal || 0 },
          selfPayScenario: { threeYearTotal: base?.selfPayTotal || 0 },
        },
      });
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus("Save comparison"), 2500);
    } catch (e) {
      console.warn("Save error:", e);
      setSaveStatus("Save failed");
      setTimeout(() => setSaveStatus("Save comparison"), 2500);
    }
  }

  function handleLoadRecord(historicalInputs) {
    if (!historicalInputs) return;
    const restored = {
      insurer: historicalInputs.insurer || inputs.insurer || "income",
      currentPremium: historicalInputs.currentPremium ?? historicalInputs.annualPremium ?? 1650,
      currentNcd: historicalInputs.currentNcd ?? 50,
      excess: historicalInputs.excess ?? 600,
      repairCost: historicalInputs.repairCost ?? 1200,
      horizonYears: historicalInputs.horizonYears ?? 3,
      baseGrowthRate: historicalInputs.baseGrowthRate ?? 5,
      discountRate: historicalInputs.discountRate ?? DEFAULT_INPUTS.discountRate,
      ncdProtector: historicalInputs.ncdProtector ?? historicalInputs.hasNcdProtector ?? false,
      liability: historicalInputs.liability ?? DEFAULT_INPUTS.liability,
      thirdPartyClaim: historicalInputs.thirdPartyClaim ?? false,
      workshopType: historicalInputs.workshopType ?? DEFAULT_INPUTS.workshopType,
      youngDriverInvolved: historicalInputs.youngDriverInvolved ?? false,
      repairType: historicalInputs.repairType ?? DEFAULT_INPUTS.repairType,
    };
    setErrors({});
    setInputs(restored);
    setSubmittedInputs(restored);
  }

  const profile = INSURER_PROFILES[inputs.insurer] || INSURER_PROFILES.other;
  const hasValidDraftQuote = Number(inputs.repairCost) > 0;

  const claimIsBetter = decision?.recommendation === "claim";
  const baseScenario = decision?.baseScenario;
  const difference = baseScenario ? Math.abs(baseScenario.difference) : 0;
  const breakEven = baseScenario?.breakEvenRepairCost || 0;
  const selfPayTotal = baseScenario?.selfPayTotal || 0;
  const claimTotal = baseScenario?.claimTotal || 0;
  const maxTotal = Math.max(selfPayTotal, claimTotal, 1);

  const scaleMax = decision
    ? Math.max(
        breakEven * 1.35,
        Number(decision.inputs.repairCost) * 1.2,
        decision.effectiveExcess * 2,
        1000
      )
    : 1000;
  const quotePct = decision
    ? Math.min(96, Math.max(4, (Number(decision.inputs.repairCost) / scaleMax) * 100))
    : 0;
  const breakEvenPct = decision
    ? Math.min(92, Math.max(8, (breakEven / scaleMax) * 100))
    : 0;

  return (
    <div className="calculator-studio-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Claim decision model</div>
          <h1>Compare claim vs. self-pay costs</h1>
        </div>
        <p>
          Configure your policy details and enter your workshop repair quotation, then run the
          model to compare your {inputs.horizonYears}-year net cash outlay.
        </p>
      </div>

      <div className="studio-grid">
        {/* LEFT COLUMN: Parameter Form */}
        <form
          id="calculator-form"
          className="decision-form"
          noValidate
          onSubmit={handleSubmit}
          aria-label="Policy and accident parameters"
        >
          {/* Section 1: Repair Quote & Core Policy Schedule */}
          <div className="form-section">
            <div className="form-section-top">
              <div className="form-section-title">
                <span className="step-badge tabular-nums">01</span>
                <div>
                  <h2>Repair quote &amp; policy schedule</h2>
                  <p>Your workshop estimate and current motor insurance terms</p>
                </div>
              </div>
              <button type="button" className="reset-link" onClick={handleReset}>
                Reset form
              </button>
            </div>

            {/* Primary Input: Repair Quote right at the top above the fold */}
            <div className="field field-highlight">
              <div className="field-label-row">
                <label htmlFor="calc-repair-cost">Workshop repair quotation</label>
                <span className="required-tag">Primary input</span>
              </div>
              <div className="input-prefix">
                <span>S$</span>
                <input
                  ref={repairCostInputRef}
                  id="calc-repair-cost"
                  name="repairCost"
                  type="number"
                  min="1"
                  step="50"
                  placeholder="Enter workshop quote, e.g. 1200"
                  required
                  aria-invalid={errors.repairCost ? "true" : undefined}
                  aria-describedby={
                    errors.repairCost
                      ? "calc-repair-cost-hint calc-repair-cost-error"
                      : "calc-repair-cost-hint"
                  }
                  className="tabular-nums"
                  value={inputs.repairCost}
                  onChange={(e) => handleInputChange("repairCost", e.target.value)}
                  onBlur={() => handleFieldBlur("repairCost")}
                />
              </div>
              {errors.repairCost && (
                <small id="calc-repair-cost-error" className="field-error" role="alert">
                  {errors.repairCost}
                </small>
              )}
              <div id="calc-repair-cost-hint" className="preset-row">
                <span className="preset-label">Quick estimate:</span>
                <div className="preset-chips" role="group" aria-label="Sample repair amounts">
                  {QUICK_REPAIR_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`preset-chip tabular-nums ${Number(inputs.repairCost) === amt ? "is-active" : ""}`}
                      onClick={() => handleInputChange("repairCost", amt)}
                    >
                      {formatCurrency(amt)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Insurer Select */}
            <div className="field">
              <label htmlFor="calc-insurer">Insurer &amp; plan</label>
              <select
                id="calc-insurer"
                name="insurer"
                aria-describedby="calc-insurer-hint"
                value={inputs.insurer}
                onChange={(e) => handleInputChange("insurer", e.target.value)}
              >
                {Object.entries(INSURER_PROFILES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.name} — {item.planName}
                  </option>
                ))}
              </select>
              <small id="calc-insurer-hint" className="field-hint tabular-nums">
                −{profile.ncdDropPoints}% NCD step-down · +{formatCurrency(profile.unauthorizedWorkshopExcess)} non-authorised workshop · +{formatCurrency(profile.youngDriverExcess)} young driver
              </small>
            </div>

            {/* Current NCD Segmented Control */}
            <div className="field">
              <span className="field-label">Current No Claims Discount (NCD)</span>
              <div className="segmented-row" role="group" aria-label="Current NCD">
                {NCD_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={`segment-btn tabular-nums ${inputs.currentNcd === step ? "is-selected" : ""}`}
                    onClick={() => handleInputChange("currentNcd", step)}
                  >
                    {step}%
                  </button>
                ))}
              </div>
            </div>

            {/* Premium & Excess */}
            <div className="field-grid two-col">
              <div className="field">
                <label htmlFor="calc-premium">Annual premium (after NCD)</label>
                <div className="input-prefix">
                  <span>S$</span>
                  <input
                    ref={premiumInputRef}
                    id="calc-premium"
                    name="currentPremium"
                    type="number"
                    min="1"
                    step="10"
                    required
                    aria-invalid={errors.currentPremium ? "true" : undefined}
                    aria-describedby={errors.currentPremium ? "calc-premium-error" : undefined}
                    className="tabular-nums"
                    value={inputs.currentPremium}
                    onChange={(e) => handleInputChange("currentPremium", e.target.value)}
                    onBlur={() => handleFieldBlur("currentPremium")}
                  />
                </div>
                {errors.currentPremium && (
                  <small id="calc-premium-error" className="field-error" role="alert">
                    {errors.currentPremium}
                  </small>
                )}
              </div>

              <div className="field">
                <label htmlFor="calc-excess">Standard policy excess</label>
                <div className="input-prefix">
                  <span>S$</span>
                  <input
                    ref={excessInputRef}
                    id="calc-excess"
                    name="excess"
                    type="number"
                    min="0"
                    step="50"
                    required
                    aria-invalid={errors.excess ? "true" : undefined}
                    aria-describedby={errors.excess ? "calc-excess-error" : undefined}
                    className="tabular-nums"
                    value={inputs.excess}
                    onChange={(e) => handleInputChange("excess", e.target.value)}
                    onBlur={() => handleFieldBlur("excess")}
                  />
                </div>
                {errors.excess && (
                  <small id="calc-excess-error" className="field-error" role="alert">
                    {errors.excess}
                  </small>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Workshop, Liability & Riders */}
          <div className="form-section">
            <div className="form-section-top">
              <div className="form-section-title">
                <span className="step-badge tabular-nums">02</span>
                <div>
                  <h2>Workshop, liability &amp; riders</h2>
                  <p>Repair channel, fault assessment, and optional policy conditions</p>
                </div>
              </div>
            </div>

            {/* Workshop Preference */}
            <div className="field">
              <span className="field-label">Workshop type</span>
              <div className="choice-grid two-col" role="group" aria-label="Workshop type">
                <button
                  type="button"
                  className={`choice-card ${inputs.workshopType === "authorized" ? "is-selected" : ""}`}
                  onClick={() => handleInputChange("workshopType", "authorized")}
                >
                  <strong>Authorised workshop</strong>
                  <small>Standard schedule excess applies</small>
                </button>
                <button
                  type="button"
                  className={`choice-card ${inputs.workshopType === "independent" ? "is-selected" : ""}`}
                  onClick={() => handleInputChange("workshopType", "independent")}
                >
                  <strong>Independent workshop</strong>
                  <small className="tabular-nums">
                    Adds +{formatCurrency(profile.unauthorizedWorkshopExcess)} surcharge
                  </small>
                </button>
              </div>
            </div>

            {/* Liability */}
            <div className="field">
              <span className="field-label">Accident liability</span>
              <div className="choice-grid three-col" role="group" aria-label="Accident liability">
                <button
                  type="button"
                  className={`choice-card ${inputs.liability === "at_fault" ? "is-selected" : ""}`}
                  onClick={() => handleInputChange("liability", "at_fault")}
                >
                  <strong>At-fault / single car</strong>
                  <small>Standard NCD step-down</small>
                </button>
                <button
                  type="button"
                  className={`choice-card ${inputs.liability === "non_fault" ? "is-selected" : ""}`}
                  onClick={() => handleInputChange("liability", "non_fault")}
                >
                  <strong>100% non-fault</strong>
                  <small>NCD shielded under MCF</small>
                </button>
                <button
                  type="button"
                  className={`choice-card ${inputs.liability === "partial_fault" ? "is-selected" : ""}`}
                  onClick={() => handleInputChange("liability", "partial_fault")}
                >
                  <strong>Split liability (50/50)</strong>
                  <small>Standard NCD step-down</small>
                </button>
              </div>
            </div>

            {/* Damage Category & Horizon */}
            <div className="field-grid two-col">
              <div className="field">
                <span className="field-label">Damage category</span>
                <div className="segmented-row" role="group" aria-label="Damage category">
                  <button
                    type="button"
                    className={`segment-btn ${inputs.repairType === "general" ? "is-selected" : ""}`}
                    onClick={() => handleInputChange("repairType", "general")}
                  >
                    Bodywork
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${inputs.repairType === "windscreen" ? "is-selected" : ""}`}
                    onClick={() => handleInputChange("repairType", "windscreen")}
                  >
                    Windscreen
                  </button>
                </div>
              </div>

              <div className="field">
                <span className="field-label">Comparison horizon</span>
                <div className="segmented-row" role="group" aria-label="Comparison horizon">
                  <button
                    type="button"
                    className={`segment-btn tabular-nums ${inputs.horizonYears === 3 ? "is-selected" : ""}`}
                    onClick={() => handleInputChange("horizonYears", 3)}
                  >
                    3 years
                  </button>
                  <button
                    type="button"
                    className={`segment-btn tabular-nums ${inputs.horizonYears === 5 ? "is-selected" : ""}`}
                    onClick={() => handleInputChange("horizonYears", 5)}
                  >
                    5 years
                  </button>
                </div>
              </div>
            </div>

            {/* Policy Switches */}
            <div className="switch-group">
              <label className="toggle-field">
                <input
                  type="checkbox"
                  name="ncdProtector"
                  checked={inputs.ncdProtector}
                  onChange={(e) => handleInputChange("ncdProtector", e.target.checked)}
                />
                <span className="toggle-ui"></span>
                <span>
                  <strong>NCD Protector rider active</strong>
                  <small>Shields your current NCD tier for 1 at-fault claim</small>
                </span>
              </label>

              <label className="toggle-field">
                <input
                  type="checkbox"
                  name="youngDriverInvolved"
                  checked={inputs.youngDriverInvolved}
                  onChange={(e) => handleInputChange("youngDriverInvolved", e.target.checked)}
                />
                <span className="toggle-ui"></span>
                <span>
                  <strong>Young or inexperienced driver at the wheel</strong>
                  <small className="tabular-nums">
                    Under 25 or licence held under 2 years (+{formatCurrency(profile.youngDriverExcess)} excess)
                  </small>
                </span>
              </label>

              <label className="toggle-field">
                <input
                  type="checkbox"
                  name="thirdPartyClaim"
                  checked={inputs.thirdPartyClaim}
                  onChange={(e) => handleInputChange("thirdPartyClaim", e.target.checked)}
                />
                <span className="toggle-ui"></span>
                <span>
                  <strong>Third party is claiming against my policy</strong>
                  <small>If you bear liability, your insurer settles the third-party claim and steps down NCD even if you self-pay your own car</small>
                </span>
              </label>
            </div>
          </div>

          {/* Form Submit Bar */}
          <div className="form-submit-bar">
            <div className="form-submit-status">
              {!submittedInputs ? (
                <span>
                  {hasValidDraftQuote
                    ? `Ready to evaluate ${formatCurrency(inputs.repairCost)} repair quote`
                    : "Enter your workshop repair quotation in Step 01 to calculate"}
                </span>
              ) : isDirty ? (
                <span className="status-dirty">
                  Parameters updated — click to recalculate recommendation
                </span>
              ) : (
                <span className="status-synced">
                  Showing results for {formatCurrency(submittedInputs.repairCost)} quote
                </span>
              )}
            </div>
            <div className="form-submit-actions">
              <button type="submit" className="button button-primary button-large">
                {!submittedInputs
                  ? "Calculate recommendation →"
                  : isDirty
                  ? "Update calculation →"
                  : "Recalculate →"}
              </button>
            </div>
          </div>
        </form>

        {/* RIGHT COLUMN: Sticky Answer Panel */}
        <div className="studio-results">
          {!decision ? (
            /* Pre-Submit State: Structured Model Blueprint & Live Parameter Summary */
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
                Click <strong>Calculate recommendation</strong> to model your {inputs.horizonYears}-year
                NCD step-down penalty and exact break-even threshold.
              </p>

              {/* Live Parameter Receipt (shows active rules without giving a premature verdict) */}
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
                    <dt>Next renewal NCD if claiming</dt>
                    <dd>
                      {previewDecision.claimNcdAfter === previewDecision.selfPayNcdAfter ? (
                        <span className="receipt-tag is-protected">
                          {formatPercent(previewDecision.claimNcdAfter)} (Protected)
                        </span>
                      ) : (
                        <span>
                          {formatPercent(inputs.currentNcd)} →{" "}
                          <strong>{formatPercent(previewDecision.claimNcdAfter)}</strong>
                        </span>
                      )}
                    </dd>
                  </div>

                  <div className="receipt-row">
                    <dt>Effective day-1 claim excess</dt>
                    <dd>
                      <strong>{formatCurrency(previewDecision.effectiveExcess)}</strong>
                      {previewDecision.effectiveExcess > Number(inputs.excess || 0) && (
                        <span> (incl. surcharges)</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="blueprint-actions">
                <button
                  type="submit"
                  form="calculator-form"
                  className="button button-primary button-large"
                >
                  Calculate recommendation →
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={handleRunSampleScenario}
                >
                  Try S$1,200 sample scenario
                </button>
              </div>
            </section>
          ) : (
            <>
              {/* Dirty State Notification Bar if inputs changed after submit */}
              {isDirty && (
                <div className="dirty-banner" role="status">
                  <span>
                    You modified parameters on the left. Update to refresh this recommendation.
                  </span>
                  <button
                    type="submit"
                    form="calculator-form"
                    className="button button-primary button-sm"
                  >
                    Update calculation →
                  </button>
                </div>
              )}

              {/* 1. Primary Verdict Card */}
              <section
                className={`verdict-card ${claimIsBetter ? "is-claim" : "is-self-pay"} ${
                  isDirty ? "is-stale" : ""
                }`}
                aria-live="polite"
              >
                <div className="verdict-top">
                  <span className="verdict-pill">
                    {decision.isBelowExcess
                      ? "Below effective excess — self-pay"
                      : claimIsBetter
                      ? "Claiming is more cost-effective"
                      : "Self-paying is more cost-effective"}
                  </span>
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
                    ? `Your repair quote (${formatCurrency(decision.inputs.repairCost)}) does not exceed your effective policy excess (${formatCurrency(decision.effectiveExcess)}). The insurer payout would be S$0.`
                    : claimIsBetter
                    ? `Your ${formatCurrency(decision.inputs.repairCost)} quote exceeds the ${formatCurrency(breakEven)} break-even threshold, so paying your ${formatCurrency(decision.effectiveExcess)} deductible and absorbing the renewal impact is cheaper than paying the full repair bill.`
                    : `Paying ${formatCurrency(decision.inputs.repairCost)} today preserves your ${formatPercent(decision.selfPayNcdAfter)} renewal NCD and avoids ${formatCurrency(baseScenario.claimFutureDiscounted - baseScenario.selfPayFutureDiscounted)} in discounted renewal surcharges over ${decision.inputs.horizonYears} years.`}
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
                    <dt>Day-1 outflow</dt>
                    <dd>
                      {formatCurrency(decision.inputs.repairCost)} <span>vs.</span>{" "}
                      {formatCurrency(decision.effectiveExcess)}
                    </dd>
                    <small>Self-pay repair vs. claim excess</small>
                  </div>

                  <div>
                    <dt>Next renewal NCD</dt>
                    <dd>
                      {decision.claimNcdAfter === decision.selfPayNcdAfter
                        ? `${formatPercent(decision.claimNcdAfter)} (Unchanged)`
                        : `${formatPercent(decision.selfPayNcdAfter)} → ${formatPercent(decision.claimNcdAfter)}`}
                    </dd>
                    <small>Self-pay vs. claim path</small>
                  </div>

                  <div>
                    <dt>Break-even repair</dt>
                    <dd>{formatCurrency(breakEven)}</dd>
                    <small>Minimum quote to justify claiming</small>
                  </div>
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
                    {formatCurrency(decision.inputs.repairCost)} repair today +{" "}
                    {formatCurrency(baseScenario?.selfPayFutureDiscounted)} over{" "}
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
                    {formatCurrency(baseScenario?.currentClaimCost)} deductible today +{" "}
                    {formatCurrency(baseScenario?.claimFutureDiscounted)} over{" "}
                    {decision.inputs.horizonYears} renewals (PV)
                  </div>
                </div>
              </section>

              {/* 3. Active Policy Advisories (if any) */}
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

              {/* 4. Expandable Year-by-Year Schedule */}
              <div className="breakdown-card">
                <button
                  type="button"
                  className="breakdown-toggle"
                  aria-expanded={showTable}
                  onClick={() => setShowTable(!showTable)}
                >
                  <div>
                    <strong>Year-by-year renewal schedule</strong>
                    <span>
                      Nominal annual premiums and NCD recovery over {decision.inputs.horizonYears} years
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

                {showTable && (
                  <div className="breakdown-body">
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
                )}
              </div>

              {/* 5. Utility Actions */}
              <div className="result-toolbar">
                <button
                  type="button"
                  className={`button button-secondary ${saveStatus === "Saved" ? "is-saved" : ""}`}
                  onClick={handleSaveCalculation}
                >
                  {saveStatus}
                </button>
                <button type="button" className="button button-ghost" onClick={handleShare}>
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

              {/* 6. GIA MCF 24-Hour Rule */}
              <div className="result-disclaimer">
                <p>
                  <strong>GIA 24-hour reporting rule:</strong> Under the Singapore Motor Claims
                  Framework, all accidents must be reported to your insurer within 24 hours (or by
                  the next working day), regardless of whether you file a claim. Reporting an
                  incident does not obligate you to claim.
                </p>
              </div>
            </>
          )}

          <CalculationHistory onLoadRecord={handleLoadRecord} />
        </div>
      </div>
    </div>
  );
}
