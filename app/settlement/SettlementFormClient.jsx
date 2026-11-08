"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  SETTLEMENT_MODES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  validateSettlementInputs,
  formatSettlementAmount,
  generateSettlementClauseText,
} from "../../src/settlement-form.mjs";

function getSingaporeTodayDate() {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export default function SettlementFormClient() {
  const searchParams = useSearchParams();
  const today = getSingaporeTodayDate();

  const [inputs, setInputs] = useState({
    noInjuryConfirmed: false,
    noGovPropertyDamageConfirmed: false,
    accidentDate: today,
    accidentTime: "14:30",
    accidentLocation: "",
    settlementDate: today,
    partyAName: "",
    partyANric: "",
    partyAVehicle: "",
    partyAContact: "",
    partyAInsurer: "Income Insurance",
    partyBName: "",
    partyBNric: "",
    partyBVehicle: "",
    partyBContact: "",
    partyBInsurer: "Etiqa Insurance",
    settlementMode: SETTLEMENT_MODES.PARTY_A_PAYS_PARTY_B,
    settlementAmount: "",
    paymentMethod: PAYMENT_METHODS.PAYNOW,
  });

  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const queryAmount = searchParams.get("amount");
    const queryVehicle = searchParams.get("vehicle");
    const queryMode = searchParams.get("mode");

    setInputs((prev) => ({
      ...prev,
      settlementAmount: queryAmount || prev.settlementAmount,
      partyAVehicle: queryVehicle || prev.partyAVehicle,
      settlementMode:
        queryMode && Object.values(SETTLEMENT_MODES).includes(queryMode)
          ? queryMode
          : prev.settlementMode,
    }));
  }, [searchParams]);

  const handleChange = (field, value) => {
    setInputs((prev) => {
      const next = { ...prev, [field]: value };
      if (hasSubmitted) {
        const validation = validateSettlementInputs(next);
        setErrors(validation.errors);
      }
      return next;
    });
  };

  const handlePrint = (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    const validation = validateSettlementInputs(inputs);
    setErrors(validation.errors);
    if (validation.isValid) {
      window.print();
    }
  };

  const clauseText = generateSettlementClauseText(inputs);
  const isPrerequisitesMet = inputs.noInjuryConfirmed && inputs.noGovPropertyDamageConfirmed;

  return (
    <div className="settlement-page section-pad">
      <div className="page-header no-print">
        <div>
          <div className="section-kicker">Contractual Document Template</div>
          <h1>Private Settlement Agreement (Motor Property Damage)</h1>
        </div>
        <p>
          Generate a standardized written agreement for minor, non-injury traffic accidents between
          motorists in Singapore, structured around Singapore Motor Claims Framework (MCF) principles.
        </p>
      </div>

      <div className="settlement-notice-box no-print" style={{ marginBottom: "24px" }}>
        <strong>Important Singapore GIA MCF Compliance Notice:</strong>
        <p style={{ margin: "6px 0 0 0", fontSize: "0.8125rem", lineHeight: 1.5 }}>
          A private settlement is a binding contract between motorists for property damage. It does
          not bind licensed insurers. Under Singapore General Insurance Association (GIA) MCF rules,{" "}
          <strong>both motorists must still lodge an official accident report with their respective insurers within 24 hours (or next working day)</strong>{" "}
          indicating &ldquo;Settled Privately&rdquo;. Private settlement is strictly prohibited if any person is injured or if government property was damaged.
        </p>
      </div>

      <div className="settlement-grid">
        {/* Editor Form */}
        <div className="settlement-editor no-print">
          <div className="studio-card">
            <h2 className="studio-card-title">1. Statutory Eligibility Confirmation</h2>
            <div className="field-group" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label className="checkbox-label" style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={inputs.noInjuryConfirmed}
                  onChange={(e) => handleChange("noInjuryConfirmed", e.target.checked)}
                  style={{ marginTop: "3px" }}
                />
                <span style={{ fontSize: "0.8125rem", lineHeight: 1.4 }}>
                  <strong>No Personal Injury:</strong> I confirm that NO driver, passenger, or pedestrian sustained any bodily injuries in this accident.
                </span>
              </label>
              {errors.noInjuryConfirmed && (
                <p className="field-error">{errors.noInjuryConfirmed}</p>
              )}

              <label className="checkbox-label" style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={inputs.noGovPropertyDamageConfirmed}
                  onChange={(e) => handleChange("noGovPropertyDamageConfirmed", e.target.checked)}
                  style={{ marginTop: "3px" }}
                />
                <span style={{ fontSize: "0.8125rem", lineHeight: 1.4 }}>
                  <strong>No Government Property Damage:</strong> I confirm that NO public infrastructure or government property (e.g. guard rails, road dividers, lamp posts) was damaged.
                </span>
              </label>
              {errors.noGovPropertyDamageConfirmed && (
                <p className="field-error">{errors.noGovPropertyDamageConfirmed}</p>
              )}
            </div>

            <h2 className="studio-card-title" style={{ marginTop: "24px" }}>
              2. Accident Particulars
            </h2>
            <div className="field-group">
              <div className="field-grid">
                <div>
                  <label className="field-label" htmlFor="accidentDate">
                    Date of Accident
                  </label>
                  <input
                    id="accidentDate"
                    type="date"
                    className="text-input"
                    value={inputs.accidentDate}
                    onChange={(e) => handleChange("accidentDate", e.target.value)}
                  />
                  {errors.accidentDate && <p className="field-error">{errors.accidentDate}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="accidentTime">
                    Approximate Time
                  </label>
                  <input
                    id="accidentTime"
                    type="time"
                    className="text-input"
                    value={inputs.accidentTime}
                    onChange={(e) => handleChange("accidentTime", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="field-label" htmlFor="accidentLocation">
                  Location of Accident (e.g., PIE towards Changi near Exit 8)
                </label>
                <input
                  id="accidentLocation"
                  type="text"
                  className="text-input"
                  placeholder="Street / Expressway, Landmark"
                  value={inputs.accidentLocation}
                  onChange={(e) => handleChange("accidentLocation", e.target.value)}
                />
                {errors.accidentLocation && (
                  <p className="field-error">{errors.accidentLocation}</p>
                )}
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="field-label" htmlFor="settlementDate">
                  Date of Agreement Execution (Signing Date)
                </label>
                <input
                  id="settlementDate"
                  type="date"
                  className="text-input"
                  value={inputs.settlementDate}
                  onChange={(e) => handleChange("settlementDate", e.target.value)}
                />
                {errors.settlementDate && <p className="field-error">{errors.settlementDate}</p>}
              </div>
            </div>

            <h2 className="studio-card-title" style={{ marginTop: "24px" }}>
              3. Party A Details (Your Particulars)
            </h2>
            <div className="field-group">
              <div className="field-grid">
                <div>
                  <label className="field-label" htmlFor="partyAName">
                    Full Name (as in NRIC)
                  </label>
                  <input
                    id="partyAName"
                    type="text"
                    className="text-input"
                    placeholder="e.g. Tan Ah Teck"
                    value={inputs.partyAName}
                    onChange={(e) => handleChange("partyAName", e.target.value)}
                  />
                  {errors.partyAName && <p className="field-error">{errors.partyAName}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="partyANric">
                    NRIC / FIN
                  </label>
                  <input
                    id="partyANric"
                    type="text"
                    className="text-input"
                    placeholder="e.g. S1234567A"
                    value={inputs.partyANric}
                    onChange={(e) => handleChange("partyANric", e.target.value.toUpperCase())}
                  />
                  {errors.partyANric && <p className="field-error">{errors.partyANric}</p>}
                </div>
              </div>

              <div className="field-grid" style={{ marginTop: "12px" }}>
                <div>
                  <label className="field-label" htmlFor="partyAVehicle">
                    Vehicle Registration No.
                  </label>
                  <input
                    id="partyAVehicle"
                    type="text"
                    className="text-input"
                    placeholder="e.g. SBA1234A"
                    value={inputs.partyAVehicle}
                    onChange={(e) => handleChange("partyAVehicle", e.target.value.toUpperCase())}
                  />
                  {errors.partyAVehicle && <p className="field-error">{errors.partyAVehicle}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="partyAContact">
                    Contact Mobile No.
                  </label>
                  <input
                    id="partyAContact"
                    type="tel"
                    className="text-input"
                    placeholder="e.g. 91234567"
                    value={inputs.partyAContact}
                    onChange={(e) => handleChange("partyAContact", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="field-label" htmlFor="partyAInsurer">
                  Motor Insurer
                </label>
                <input
                  id="partyAInsurer"
                  type="text"
                  className="text-input"
                  placeholder="e.g. Income Insurance"
                  value={inputs.partyAInsurer}
                  onChange={(e) => handleChange("partyAInsurer", e.target.value)}
                />
              </div>
            </div>

            <h2 className="studio-card-title" style={{ marginTop: "24px" }}>
              4. Party B Details (Counterparty Particulars)
            </h2>
            <div className="field-group">
              <div className="field-grid">
                <div>
                  <label className="field-label" htmlFor="partyBName">
                    Full Name (as in NRIC)
                  </label>
                  <input
                    id="partyBName"
                    type="text"
                    className="text-input"
                    placeholder="e.g. Lee Wei Ling"
                    value={inputs.partyBName}
                    onChange={(e) => handleChange("partyBName", e.target.value)}
                  />
                  {errors.partyBName && <p className="field-error">{errors.partyBName}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="partyBNric">
                    NRIC / FIN
                  </label>
                  <input
                    id="partyBNric"
                    type="text"
                    className="text-input"
                    placeholder="e.g. T9876543Z"
                    value={inputs.partyBNric}
                    onChange={(e) => handleChange("partyBNric", e.target.value.toUpperCase())}
                  />
                  {errors.partyBNric && <p className="field-error">{errors.partyBNric}</p>}
                </div>
              </div>

              <div className="field-grid" style={{ marginTop: "12px" }}>
                <div>
                  <label className="field-label" htmlFor="partyBVehicle">
                    Vehicle Registration No.
                  </label>
                  <input
                    id="partyBVehicle"
                    type="text"
                    className="text-input"
                    placeholder="e.g. SKL5678B"
                    value={inputs.partyBVehicle}
                    onChange={(e) => handleChange("partyBVehicle", e.target.value.toUpperCase())}
                  />
                  {errors.partyBVehicle && <p className="field-error">{errors.partyBVehicle}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="partyBContact">
                    Contact Mobile No.
                  </label>
                  <input
                    id="partyBContact"
                    type="tel"
                    className="text-input"
                    placeholder="e.g. 98765432"
                    value={inputs.partyBContact}
                    onChange={(e) => handleChange("partyBContact", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="field-label" htmlFor="partyBInsurer">
                  Motor Insurer
                </label>
                <input
                  id="partyBInsurer"
                  type="text"
                  className="text-input"
                  placeholder="e.g. Etiqa Insurance"
                  value={inputs.partyBInsurer}
                  onChange={(e) => handleChange("partyBInsurer", e.target.value)}
                />
              </div>
            </div>

            <h2 className="studio-card-title" style={{ marginTop: "24px" }}>
              5. Settlement Consideration &amp; Terms
            </h2>
            <div className="field-group">
              <div className="radio-group" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="settlementMode"
                    value={SETTLEMENT_MODES.PARTY_A_PAYS_PARTY_B}
                    checked={inputs.settlementMode === SETTLEMENT_MODES.PARTY_A_PAYS_PARTY_B}
                    onChange={(e) => handleChange("settlementMode", e.target.value)}
                  />
                  <span>Party A pays Party B agreed settlement amount</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="settlementMode"
                    value={SETTLEMENT_MODES.PARTY_B_PAYS_PARTY_A}
                    checked={inputs.settlementMode === SETTLEMENT_MODES.PARTY_B_PAYS_PARTY_A}
                    onChange={(e) => handleChange("settlementMode", e.target.value)}
                  />
                  <span>Party B pays Party A agreed settlement amount</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="settlementMode"
                    value={SETTLEMENT_MODES.MUTUAL_DISCHARGE}
                    checked={inputs.settlementMode === SETTLEMENT_MODES.MUTUAL_DISCHARGE}
                    onChange={(e) => handleChange("settlementMode", e.target.value)}
                  />
                  <span>Mutual Discharge: Both parties bear own repair costs without monetary exchange</span>
                </label>
              </div>

              {inputs.settlementMode !== SETTLEMENT_MODES.MUTUAL_DISCHARGE && (
                <div style={{ marginTop: "16px" }}>
                  <div className="field-grid">
                    <div>
                      <label className="field-label" htmlFor="settlementAmount">
                        Agreed Settlement Amount (SGD)
                      </label>
                      <input
                        id="settlementAmount"
                        type="number"
                        min="1"
                        step="0.01"
                        className="text-input"
                        placeholder="e.g. 1200"
                        value={inputs.settlementAmount}
                        onChange={(e) => handleChange("settlementAmount", e.target.value)}
                      />
                      {errors.settlementAmount && (
                        <p className="field-error">{errors.settlementAmount}</p>
                      )}
                    </div>

                    <div>
                      <label className="field-label" htmlFor="paymentMethod">
                        Payment Method
                      </label>
                      <select
                        id="paymentMethod"
                        className="text-input"
                        value={inputs.paymentMethod}
                        onChange={(e) => handleChange("paymentMethod", e.target.value)}
                      >
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {errors.paymentMethod && (
                        <p className="field-error">{errors.paymentMethod}</p>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "6px" }}>
                    Note: The prefilled amount from the calculator is an estimate. Ensure both parties have inspected the damage and mutually agreed to the final sum before signing.
                  </p>
                </div>
              )}
            </div>

            <div className="hero-actions" style={{ marginTop: "28px", display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={handlePrint}
                className="button button-primary button-large"
              >
                Print / Save Document (PDF)
              </button>
              <Link href="/calculator" className="button button-secondary">
                Back to Calculator
              </Link>
            </div>
          </div>
        </div>

        {/* Document Preview Pane */}
        <div className="settlement-preview-pane">
          {!isPrerequisitesMet && (
            <div className="no-print" style={{ padding: "16px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "6px", marginBottom: "16px", color: "#9f1239", fontSize: "0.875rem" }}>
              <strong>Prerequisite Requirement:</strong> You must check the statutory declarations confirming NO personal injury and NO government property damage before this agreement can be finalized.
            </div>
          )}

          <div className="settlement-sheet">
            <header className="sheet-header">
              <div className="sheet-title-badge">MOTOR CLAIMS FRAMEWORK (MCF) PRIVATE SETTLEMENT TEMPLATE</div>
              <h1>AGREEMENT FOR PRIVATE SETTLEMENT OF MOTOR ACCIDENTS</h1>
              <p className="sheet-subtitle">
                (WITHOUT ADMISSION OF LEGAL LIABILITY · PHYSICAL MOTOR VEHICLE PROPERTY DAMAGE ONLY)
              </p>
            </header>

            <section className="sheet-section">
              <div className="sheet-grid-meta">
                <div>
                  <strong>Date of Accident:</strong> {inputs.accidentDate || "________________"}
                </div>
                <div>
                  <strong>Approximate Time:</strong> {inputs.accidentTime || "________"}
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Location of Accident:</strong>{" "}
                  {inputs.accidentLocation || "________________________________________________"}
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Date of Agreement Execution:</strong>{" "}
                  {inputs.settlementDate || "________________"}
                </div>
              </div>
            </section>

            <section className="sheet-section">
              <h2>1. PARTICULARS OF PARTIES</h2>
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th style={{ width: "24%" }}>Particular</th>
                    <th style={{ width: "38%" }}>Party A (Driver / Vehicle Owner)</th>
                    <th style={{ width: "38%" }}>Party B (Driver / Vehicle Owner)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Full Name (as in NRIC):</td>
                    <td>{inputs.partyAName || "________________________"}</td>
                    <td>{inputs.partyBName || "________________________"}</td>
                  </tr>
                  <tr>
                    <td>NRIC / FIN:</td>
                    <td>{inputs.partyANric || "________________________"}</td>
                    <td>{inputs.partyBNric || "________________________"}</td>
                  </tr>
                  <tr>
                    <td>Vehicle Registration No:</td>
                    <td><strong>{inputs.partyAVehicle || "________"}</strong></td>
                    <td><strong>{inputs.partyBVehicle || "________"}</strong></td>
                  </tr>
                  <tr>
                    <td>Motor Insurer:</td>
                    <td>{inputs.partyAInsurer || "________________________"}</td>
                    <td>{inputs.partyBInsurer || "________________________"}</td>
                  </tr>
                  <tr>
                    <td>Contact Mobile:</td>
                    <td>{inputs.partyAContact || "________________________"}</td>
                    <td>{inputs.partyBContact || "________________________"}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="sheet-section">
              <h2>2. TERMS OF SETTLEMENT &amp; RELEASE</h2>
              <div className="sheet-clause-box">
                <p>{clauseText}</p>
              </div>

              <ol className="sheet-legal-terms">
                <li>
                  <strong>No Admission of Liability:</strong> This settlement agreement is executed solely as an amicable compromise between the undersigned parties and does not constitute any admission of fault or legal liability by either Party A or Party B.
                </li>
                <li>
                  <strong>Full &amp; Final Satisfaction for Property Damage:</strong> Subject to the full receipt of the agreed settlement sum (where applicable), each party hereby releases and forever discharges the other party from all claims, demands, costs, and actions exclusively in respect of motor vehicle property damage arising from the accident.
                </li>
                <li>
                  <strong>Personal Injury Reservation:</strong> This agreement pertains strictly to motor vehicle physical property damage. It does not affect, compromise, or extinguish any statutory rights or claims in respect of bodily injury or death.
                </li>
                <li>
                  <strong>Covenant Not to Claim:</strong> The parties mutually covenant that neither party shall submit an insurance claim against the other party&apos;s motor insurance policy regarding the property damage compromised under this agreement.
                </li>
                <li>
                  <strong>GIA MCF 24-Hour Notification Requirement:</strong> Both parties acknowledge that under the Singapore Motor Claims Framework (MCF), they remain obligated to file an accident report with their respective authorized insurers within 24 hours (or the next working day) stating &ldquo;Settled Privately&rdquo; for record purposes.
                </li>
              </ol>
            </section>

            <section className="sheet-section sheet-signatures">
              <h2>3. EXECUTION &amp; SIGNATURES</h2>
              <div className="sheet-sig-grid">
                <div className="sig-block">
                  <div className="sig-line"></div>
                  <p><strong>Signature of Party A</strong></p>
                  <span>Name: {inputs.partyAName || "________________"}</span>
                  <span>Date Signed: {inputs.settlementDate || "________________"}</span>
                </div>
                <div className="sig-block">
                  <div className="sig-line"></div>
                  <p><strong>Signature of Party B</strong></p>
                  <span>Name: {inputs.partyBName || "________________"}</span>
                  <span>Date Signed: {inputs.settlementDate || "________________"}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
