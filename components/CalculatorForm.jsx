"use client";

import { INSURER_PROFILES, NCD_STEPS } from "../src/decision-data.mjs";
import { formatCurrency } from "../src/formatters.mjs";

const QUICK_REPAIR_PRESETS = [800, 1200, 2200, 3500];

export default function CalculatorForm({
  inputs,
  profile,
  errors,
  calculationError,
  isCalculating,
  authLoading,
  submittedInputs,
  isDirty,
  hasValidDraftQuote,
  repairCostInputRef,
  premiumInputRef,
  excessInputRef,
  onInputChange,
  onFieldBlur,
  onSubmit,
  onReset,
}) {
  const ageThreshold = profile.youngDriverAgeThreshold || 25;
  const isProtectorEligible = Number(inputs.currentNcd) >= (profile.minNcdForProtector || 50);

  return (
    <form
      id="calculator-form"
      className="decision-form"
      noValidate
      onSubmit={onSubmit}
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
          <button type="button" className="reset-link" onClick={onReset}>
            Reset form
          </button>
        </div>

        {/* Primary Input: Repair Quote */}
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
              onChange={(e) => onInputChange("repairCost", e.target.value)}
              onBlur={() => onFieldBlur("repairCost")}
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
                  className={`preset-chip tabular-nums ${
                    Number(inputs.repairCost) === amt ? "is-active" : ""
                  }`}
                  onClick={() => onInputChange("repairCost", amt)}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Classification (Private vs Commercial PHV) */}
        <div className="field">
          <span className="field-label">Vehicle classification</span>
          <div className="choice-grid two-col" role="group" aria-label="Vehicle classification">
            <button
              type="button"
              className={`choice-card ${
                (inputs.vehicleUsage || "private") === "private" ? "is-selected" : ""
              }`}
              onClick={() => {
                onInputChange("vehicleUsage", "private");
                onInputChange("commercialClaimLoading", 0);
                onInputChange("dailyDowntimeCost", 0);
              }}
            >
              <strong>Private Passenger (P10/P11)</strong>
              <small>Standard personal motor insurance</small>
            </button>
            <button
              type="button"
              className={`choice-card ${
                inputs.vehicleUsage === "phv" ? "is-selected" : ""
              }`}
              onClick={() => {
                onInputChange("vehicleUsage", "phv");
                onInputChange("commercialClaimLoading", 15);
                onInputChange("dailyDowntimeCost", 80);
                onInputChange("claimDowntimeDays", 5);
                onInputChange("selfPayDowntimeDays", 1);
              }}
            >
              <strong>Private Hire / Commercial (Z10/Z11)</strong>
              <small>Grab / Gojek / Tada commercial policy</small>
            </button>
          </div>
        </div>

        {/* PHV Commercial Parameters Panel */}
        {inputs.vehicleUsage === "phv" && (
          <div
            className="phv-customization-box"
            style={{
              background: "rgba(14, 165, 233, 0.08)",
              border: "1px solid rgba(14, 165, 233, 0.25)",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <strong style={{ fontSize: "0.9rem", color: "var(--color-primary-text, #0369a1)" }}>
                PHV Commercial Policy &amp; Loss-of-Use Parameters
              </strong>
              <button
                type="button"
                className="reset-link"
                style={{ fontSize: "0.78rem" }}
                onClick={() => {
                  onInputChange("currentPremium", 3200);
                  onInputChange("excess", 1500);
                  onInputChange("commercialClaimLoading", 15);
                  onInputChange("dailyDowntimeCost", 80);
                  onInputChange("claimDowntimeDays", 5);
                  onInputChange("selfPayDowntimeDays", 1);
                }}
              >
                Apply typical PHV baseline (S$3,200 / S$1,500)
              </button>
            </div>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--color-secondary-text, #64748b)",
                margin: "0 0 12px 0",
              }}
            >
              Commercial policies incur underwriting renewal loading upon at-fault claims and workshop downtime / vehicle rental loss.
            </p>
            <div className="field-grid two-col" style={{ gap: "10px" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="calc-phv-loading" style={{ fontSize: "0.8rem" }}>
                  Renewal claim loading (%)
                </label>
                <div className="input-prefix">
                  <span>%</span>
                  <input
                    id="calc-phv-loading"
                    name="commercialClaimLoading"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    className="tabular-nums"
                    value={inputs.commercialClaimLoading ?? 15}
                    onChange={(e) => onInputChange("commercialClaimLoading", e.target.value)}
                  />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="calc-phv-downtime" style={{ fontSize: "0.8rem" }}>
                  Daily rental / downtime cost (S$)
                </label>
                <div className="input-prefix">
                  <span>S$</span>
                  <input
                    id="calc-phv-downtime"
                    name="dailyDowntimeCost"
                    type="number"
                    min="0"
                    max="5000"
                    step="10"
                    className="tabular-nums"
                    value={inputs.dailyDowntimeCost ?? 80}
                    onChange={(e) => onInputChange("dailyDowntimeCost", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="field-grid two-col" style={{ gap: "10px", marginTop: "10px" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="calc-phv-claim-days" style={{ fontSize: "0.8rem" }}>
                  Insurance claim repair downtime
                </label>
                <div className="input-prefix">
                  <span>Days</span>
                  <input
                    id="calc-phv-claim-days"
                    name="claimDowntimeDays"
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    className="tabular-nums"
                    value={inputs.claimDowntimeDays ?? 5}
                    onChange={(e) => onInputChange("claimDowntimeDays", e.target.value)}
                  />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="calc-phv-selfpay-days" style={{ fontSize: "0.8rem" }}>
                  Private repair downtime
                </label>
                <div className="input-prefix">
                  <span>Days</span>
                  <input
                    id="calc-phv-selfpay-days"
                    name="selfPayDowntimeDays"
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    className="tabular-nums"
                    value={inputs.selfPayDowntimeDays ?? 1}
                    onChange={(e) => onInputChange("selfPayDowntimeDays", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insurer Select */}
        <div className="field">
          <label htmlFor="calc-insurer">Insurer &amp; plan</label>
          <select
            id="calc-insurer"
            name="insurer"
            aria-describedby="calc-insurer-hint"
            value={inputs.insurer}
            onChange={(e) => onInputChange("insurer", e.target.value)}
          >
            {Object.entries(INSURER_PROFILES).map(([key, item]) => (
              <option key={key} value={key}>
                {item.name} — {item.planName}
              </option>
            ))}
          </select>
          <small id="calc-insurer-hint" className="field-hint tabular-nums">
            −{profile.ncdDropPoints}% NCD step-down · +
            {formatCurrency(profile.unauthorizedWorkshopExcess)} non-authorised workshop · +
            {formatCurrency(profile.youngDriverExcess)} young driver
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
                className={`segment-btn tabular-nums ${
                  inputs.currentNcd === step ? "is-selected" : ""
                }`}
                onClick={() => onInputChange("currentNcd", step)}
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
                onChange={(e) => onInputChange("currentPremium", e.target.value)}
                onBlur={() => onFieldBlur("currentPremium")}
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
                onChange={(e) => onInputChange("excess", e.target.value)}
                onBlur={() => onFieldBlur("excess")}
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
              className={`choice-card ${
                inputs.workshopType === "authorized" ? "is-selected" : ""
              }`}
              onClick={() => onInputChange("workshopType", "authorized")}
            >
              <strong>Authorised workshop</strong>
              <small>Standard schedule excess applies</small>
            </button>
            <button
              type="button"
              className={`choice-card ${
                inputs.workshopType === "independent" ? "is-selected" : ""
              }`}
              onClick={() => onInputChange("workshopType", "independent")}
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
              onClick={() => onInputChange("liability", "at_fault")}
            >
              <strong>At-fault / single car</strong>
              <small>Standard NCD step-down</small>
            </button>
            <button
              type="button"
              className={`choice-card ${inputs.liability === "non_fault" ? "is-selected" : ""}`}
              onClick={() => onInputChange("liability", "non_fault")}
            >
              <strong>100% non-fault</strong>
              <small>NCD shielded under MCF</small>
            </button>
            <button
              type="button"
              className={`choice-card ${
                inputs.liability === "partial_fault" ? "is-selected" : ""
              }`}
              onClick={() => onInputChange("liability", "partial_fault")}
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
                className={`segment-btn ${
                  inputs.repairType === "general" ? "is-selected" : ""
                }`}
                onClick={() => onInputChange("repairType", "general")}
              >
                Bodywork
              </button>
              <button
                type="button"
                className={`segment-btn ${
                  inputs.repairType === "windscreen" ? "is-selected" : ""
                }`}
                onClick={() => onInputChange("repairType", "windscreen")}
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
                className={`segment-btn tabular-nums ${
                  inputs.horizonYears === 3 ? "is-selected" : ""
                }`}
                onClick={() => onInputChange("horizonYears", 3)}
              >
                3 years
              </button>
              <button
                type="button"
                className={`segment-btn tabular-nums ${
                  inputs.horizonYears === 5 ? "is-selected" : ""
                }`}
                onClick={() => onInputChange("horizonYears", 5)}
              >
                5 years
              </button>
            </div>
          </div>
        </div>

        {/* Policy Switches */}
        <div className="switch-group">
          <label className={`toggle-field ${!isProtectorEligible ? "is-disabled" : ""}`}>
            <input
              type="checkbox"
              name="ncdProtector"
              checked={Boolean(inputs.ncdProtector && isProtectorEligible)}
              disabled={!isProtectorEligible}
              onChange={(e) => onInputChange("ncdProtector", e.target.checked)}
            />
            <span className="toggle-ui"></span>
            <span>
              <strong>NCD Protector rider active</strong>
              <small>
                {isProtectorEligible
                  ? "Shields your current NCD tier for 1 at-fault claim"
                  : `Requires minimum ${profile.minNcdForProtector}% NCD for ${profile.name} (currently ${inputs.currentNcd}%)`}
              </small>
            </span>
          </label>

          <label className="toggle-field">
            <input
              type="checkbox"
              name="youngDriverInvolved"
              checked={inputs.youngDriverInvolved}
              onChange={(e) => onInputChange("youngDriverInvolved", e.target.checked)}
            />
            <span className="toggle-ui"></span>
            <span>
              <strong>Young or inexperienced driver at the wheel</strong>
              <small className="tabular-nums">
                Under {ageThreshold} or licence held under 2 years (+
                {formatCurrency(profile.youngDriverExcess)} excess)
              </small>
            </span>
          </label>

          <label className="toggle-field">
            <input
              type="checkbox"
              name="thirdPartyClaim"
              checked={inputs.thirdPartyClaim}
              onChange={(e) => onInputChange("thirdPartyClaim", e.target.checked)}
            />
            <span className="toggle-ui"></span>
            <span>
              <strong>Third party is claiming against my policy</strong>
              <small>
                If you bear liability, your insurer settles the third-party claim and steps
                down NCD even if you self-pay your own car
              </small>
            </span>
          </label>
        </div>
      </div>

      {/* Form Submit Bar */}
      <div className="form-submit-bar">
        <div className="form-submit-status">
          {authLoading ? (
            <span role="status">Checking your sign-in status…</span>
          ) : calculationError ? (
            <span className="field-error" role="alert">
              {calculationError}
            </span>
          ) : isCalculating ? (
            <span role="status">Calculating and saving your comparison…</span>
          ) : !submittedInputs ? (
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
          <button
            type="submit"
            className="button button-primary button-large"
            disabled={isCalculating || authLoading}
          >
            {authLoading
              ? "Checking sign-in…"
              : isCalculating
              ? "Calculating…"
              : !submittedInputs
              ? "Calculate recommendation →"
              : isDirty
              ? "Update calculation →"
              : "Recalculate →"}
          </button>
        </div>
      </div>
    </form>
  );
}
