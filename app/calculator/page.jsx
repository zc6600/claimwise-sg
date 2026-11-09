"use client";

import { useState, useEffect, useRef } from "react";
import { INSURER_PROFILES, NCD_STEPS } from "../../src/decision-data.mjs";
import { formatCurrency } from "../../src/formatters.mjs";
import { isNcdProtectorEligible } from "../../src/ncd/premium-path.mjs";
import {
  buildShareParams,
  parseSharedInputs,
  sameClaimInputs,
} from "../../src/claim-share-link.mjs";
import { useAuth } from "../../components/AuthProvider";
import { saveCalculationRecord } from "../../lib/history-service";
import CalculationHistory from "../../components/CalculationHistory";
import CalculatorForm from "../../components/CalculatorForm";
import CalculatorResults from "../../components/CalculatorResults";
import { useMyCar } from "../../components/my-car/useMyCar";

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
  vehicleUsage: "private",
  commercialClaimLoading: 15,
  dailyDowntimeCost: 80,
  claimDowntimeDays: 5,
  selfPayDowntimeDays: 1,
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
  const initialShareProcessedRef = useRef(false);
  const myCarAppliedRef = useRef(null);
  const { car, activeCarId } = useMyCar();

  // Saved My Car figures prefill the policy fields for the active car, unless a shared link set them.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.search) {
      myCarAppliedRef.current = activeCarId;
      return;
    }
    if (myCarAppliedRef.current === activeCarId) return;
    if (car.currentPremium === "" && car.currentNcd === "" && car.excess === "") return;
    myCarAppliedRef.current = activeCarId;
    setInputs((current) => {
      const next = { ...current };
      if (car.currentPremium !== "") next.currentPremium = Number(car.currentPremium);
      if (car.excess !== "") next.excess = Number(car.excess);
      if (car.currentNcd !== "" && NCD_STEPS.includes(Number(car.currentNcd))) {
        next.currentNcd = Number(car.currentNcd);
      }
      return next;
    });
  }, [car, activeCarId]);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading || initialShareProcessedRef.current) return;
    initialShareProcessedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    const { inputs: parsed, hasExplicitParams } = parseSharedInputs(params, DEFAULT_INPUTS);

    if (hasExplicitParams) {
      setInputs(parsed);

      if (Number(parsed.repairCost) > 0) {
        void calculateAndCommit(parsed);
      }
    }
  }, [authLoading]);

  const isDirty = Boolean(submittedInputs && !sameClaimInputs(inputs, submittedInputs));

  function handleInputChange(field, value) {
    setInputs((prev) => {
      const next = { ...prev, [field]: value };
      if (next.ncdProtector && !isNcdProtectorEligible(next)) next.ncdProtector = false;
      return next;
    });
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
    const active = isDirty ? inputs : (submittedInputs || inputs);
    const url = new URL(window.location.href);
    url.search = buildShareParams(active).toString();
    const shareUrl = url.toString();

    const repairSummary = Number(active.repairCost) > 0 ? ` for ${formatCurrency(active.repairCost)} repair quote` : "";
    const insurerName = (INSURER_PROFILES[active.insurer] || INSURER_PROFILES.other).name;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "ClaimWise SG Decision Estimate",
          text: `Motor insurance claim vs. self-pay decision${repairSummary} (${insurerName})`,
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
    const insurer = historicalInputs.insurer || inputs.insurer || "income";
    const currentNcd = historicalInputs.currentNcd ?? 50;
    const rawProtector = Boolean(
      historicalInputs.ncdProtector ?? historicalInputs.hasNcdProtector ?? false
    );
    const ncdProtector = Boolean(
      rawProtector && isNcdProtectorEligible({ insurer, currentNcd })
    );

    return {
      insurer,
      currentPremium:
        historicalInputs.currentPremium ?? historicalInputs.annualPremium ?? 1650,
      currentNcd,
      excess: historicalInputs.excess ?? 600,
      repairCost: historicalInputs.repairCost ?? 1200,
      horizonYears: historicalInputs.horizonYears ?? 3,
      baseGrowthRate: historicalInputs.baseGrowthRate ?? 5,
      discountRate: historicalInputs.discountRate ?? DEFAULT_INPUTS.discountRate,
      ncdProtector,
      liability: historicalInputs.liability ?? DEFAULT_INPUTS.liability,
      thirdPartyClaim: historicalInputs.thirdPartyClaim ?? false,
      workshopType: historicalInputs.workshopType ?? DEFAULT_INPUTS.workshopType,
      youngDriverInvolved: historicalInputs.youngDriverInvolved ?? false,
      repairType: historicalInputs.repairType ?? DEFAULT_INPUTS.repairType,
      vehicleUsage: historicalInputs.vehicleUsage ?? DEFAULT_INPUTS.vehicleUsage,
      commercialClaimLoading:
        historicalInputs.commercialClaimLoading ?? DEFAULT_INPUTS.commercialClaimLoading,
      dailyDowntimeCost:
        historicalInputs.dailyDowntimeCost ?? DEFAULT_INPUTS.dailyDowntimeCost,
      claimDowntimeDays:
        historicalInputs.claimDowntimeDays ?? DEFAULT_INPUTS.claimDowntimeDays,
      selfPayDowntimeDays:
        historicalInputs.selfPayDowntimeDays ?? DEFAULT_INPUTS.selfPayDowntimeDays,
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
          <div className="section-kicker">After an accident</div>
          <h1>Compare claim vs. self-pay costs</h1>
        </div>
        <p>
          Enter your policy details and the workshop quote to compare the total cost of claiming
          and paying yourself over the next {inputs.horizonYears} years.
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
