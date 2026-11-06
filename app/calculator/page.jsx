"use client";

import { useState, useEffect, useRef } from "react";
import { INSURER_PROFILES, NCD_STEPS } from "../../src/decision-data.mjs";
import { useAuth } from "../../components/AuthProvider";
import { saveCalculationRecord } from "../../lib/history-service";
import CalculationHistory from "../../components/CalculationHistory";
import CalculatorForm from "../../components/CalculatorForm";
import CalculatorResults from "../../components/CalculatorResults";

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

async function requestDecision(inputs, user) {
  const headers = { "content-type": "application/json" };
  if (user?.getIdToken) {
    headers.authorization = `Bearer ${await user.getIdToken()}`;
  }

  const response = await fetch("/api/decision", {
    method: "POST",
    headers,
    body: JSON.stringify({ inputs, persist: true }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to calculate this decision.");
  }
  return payload;
}

export default function CalculatorPage() {
  const { user, loading: authLoading } = useAuth();
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [submittedInputs, setSubmittedInputs] = useState(null);
  const [decision, setDecision] = useState(null);
  const [resultMode, setResultMode] = useState(null);
  const [errors, setErrors] = useState({});
  const [calculationError, setCalculationError] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [shareStatus, setShareStatus] = useState("Share link");
  const [saveStatus, setSaveStatus] = useState("");

  const repairCostInputRef = useRef(null);
  const premiumInputRef = useRef(null);
  const excessInputRef = useRef(null);

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

  const isDirty = Boolean(submittedInputs && !areInputsEqual(inputs, submittedInputs));

  function handleInputChange(field, value) {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setCalculationError("");
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

  async function calculateAndCommit(
    candidate,
    { resultMode: nextResultMode = "current" } = {}
  ) {
    if (authLoading) return;
    setIsCalculating(true);
    setCalculationError("");
    setSaveStatus("Saving…");

    try {
      const payload = await requestDecision(candidate, user);
      const calculatedDecision = payload.decision;
      setDecision(calculatedDecision);
      setSubmittedInputs(calculatedDecision.inputs);
      setResultMode(nextResultMode);
      const savedToCloud = Boolean(payload.meta?.persisted);
      let savedLocally = false;

      if (!savedToCloud) {
        try {
          await saveCalculationRecord(null, {
            decision: calculatedDecision,
          });
          savedLocally = true;
        } catch (error) {
          console.warn(
            "Local calculation history save failed:",
            error?.message || error
          );
        }
      }

      setSaveStatus(
        savedToCloud
          ? "Saved to cloud"
          : savedLocally
          ? user?.uid
            ? "Saved in browser (cloud unavailable)"
            : "Saved in browser"
          : "Save unavailable"
      );
    } catch (error) {
      setCalculationError(error.message || "Unable to calculate this decision.");
      setSaveStatus("Calculation failed");
    } finally {
      setIsCalculating(false);
    }
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (isCalculating || authLoading) return;
    const validationErrors = validateAllInputs(inputs);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstInvalid(validationErrors);
      return;
    }
    setErrors({});
    void calculateAndCommit({
      ...inputs,
      currentPremium: Number(inputs.currentPremium),
      excess: Number(inputs.excess),
      repairCost: Number(inputs.repairCost),
    });
  }

  function handleRunSampleScenario() {
    if (isCalculating || authLoading) return;
    const sample = {
      ...inputs,
      currentPremium:
        Number(inputs.currentPremium) > 0 ? Number(inputs.currentPremium) : 1650,
      excess: Number(inputs.excess) >= 0 ? Number(inputs.excess) : 600,
      repairCost: Number(inputs.repairCost) > 0 ? Number(inputs.repairCost) : 1200,
    };
    setErrors({});
    setInputs(sample);
    void calculateAndCommit(sample);
  }

  function handleReset() {
    setInputs(DEFAULT_INPUTS);
    setSubmittedInputs(null);
    setDecision(null);
    setResultMode(null);
    setErrors({});
    setCalculationError("");
    setSaveStatus("");
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

  function restoreHistoricalInputs(historicalInputs) {
    if (!historicalInputs) return null;
    return {
      insurer: historicalInputs.insurer || inputs.insurer || "income",
      currentPremium:
        historicalInputs.currentPremium ?? historicalInputs.annualPremium ?? 1650,
      currentNcd: historicalInputs.currentNcd ?? 50,
      excess: historicalInputs.excess ?? 600,
      repairCost: historicalInputs.repairCost ?? 1200,
      horizonYears: historicalInputs.horizonYears ?? 3,
      baseGrowthRate: historicalInputs.baseGrowthRate ?? 5,
      discountRate: historicalInputs.discountRate ?? DEFAULT_INPUTS.discountRate,
      ncdProtector:
        historicalInputs.ncdProtector ?? historicalInputs.hasNcdProtector ?? false,
      liability: historicalInputs.liability ?? DEFAULT_INPUTS.liability,
      thirdPartyClaim: historicalInputs.thirdPartyClaim ?? false,
      workshopType: historicalInputs.workshopType ?? DEFAULT_INPUTS.workshopType,
      youngDriverInvolved: historicalInputs.youngDriverInvolved ?? false,
      repairType: historicalInputs.repairType ?? DEFAULT_INPUTS.repairType,
    };
  }

  function handleLoadRecord(record) {
    if (!record?.inputs || isCalculating || authLoading) return;
    const restored = restoreHistoricalInputs(record.decision?.inputs || record.inputs);
    if (!restored) return;

    setErrors({});
    setCalculationError("");
    setInputs(restored);
    setShowTable(false);

    if (record.decision) {
      setDecision(record.decision);
      setSubmittedInputs(record.decision.inputs || restored);
      setResultMode("saved");
      setSaveStatus("Viewing saved result");
      return;
    }

    setDecision(null);
    setSubmittedInputs(null);
    setResultMode(null);
    setSaveStatus("Loaded saved inputs");
  }

  function handleRecalculateRecord(record) {
    if (!record?.inputs || isCalculating || authLoading) return;
    const restored = restoreHistoricalInputs(record.decision?.inputs || record.inputs);
    if (!restored) return;

    setErrors({});
    setInputs(restored);
    setShowTable(false);
    void calculateAndCommit(
      {
        ...restored,
        currentPremium: Number(restored.currentPremium),
        excess: Number(restored.excess),
        repairCost: Number(restored.repairCost),
      },
      { resultMode: "recalculated" }
    );
  }

  const profile = INSURER_PROFILES[inputs.insurer] || INSURER_PROFILES.other;
  const hasValidDraftQuote = Number(inputs.repairCost) > 0;

  return (
    <div className="calculator-studio-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Claim decision model</div>
          <h1>Compare claim vs. self-pay costs</h1>
        </div>
        <p>
          Configure your policy details and enter your workshop repair quotation, then run
          the model to compare your {inputs.horizonYears}-year net cash outlay.
        </p>
      </div>

      <div className="studio-grid">
        <CalculatorForm
          inputs={inputs}
          profile={profile}
          errors={errors}
          calculationError={calculationError}
          isCalculating={isCalculating}
          authLoading={authLoading}
          submittedInputs={submittedInputs}
          isDirty={isDirty}
          hasValidDraftQuote={hasValidDraftQuote}
          repairCostInputRef={repairCostInputRef}
          premiumInputRef={premiumInputRef}
          excessInputRef={excessInputRef}
          onInputChange={handleInputChange}
          onFieldBlur={handleFieldBlur}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />

        <div className="studio-results">
          <CalculatorResults
            inputs={inputs}
            profile={profile}
            decision={decision}
            resultMode={resultMode}
            isDirty={isDirty}
            isCalculating={isCalculating}
            authLoading={authLoading}
            hasValidDraftQuote={hasValidDraftQuote}
            showTable={showTable}
            saveStatus={saveStatus}
            shareStatus={shareStatus}
            onToggleTable={() => setShowTable(!showTable)}
            onRunSampleScenario={handleRunSampleScenario}
            onShare={handleShare}
          />

          <CalculationHistory
            onLoadRecord={handleLoadRecord}
            onRecalculateRecord={handleRecalculateRecord}
            isCalculating={isCalculating}
          />
        </div>
      </div>
    </div>
  );
}
