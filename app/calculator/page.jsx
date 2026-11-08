"use client";

import { useState, useEffect, useRef } from "react";
import { INSURER_PROFILES, NCD_STEPS } from "../../src/decision-data.mjs";
import { formatCurrency } from "../../src/formatters.mjs";
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
    a.repairType === b.repairType &&
    (a.vehicleUsage || "private") === (b.vehicleUsage || "private") &&
    Number(a.commercialClaimLoading ?? 0) === Number(b.commercialClaimLoading ?? 0) &&
    Number(a.dailyDowntimeCost ?? 0) === Number(b.dailyDowntimeCost ?? 0) &&
    Number(a.claimDowntimeDays ?? 0) === Number(b.claimDowntimeDays ?? 0) &&
    Number(a.selfPayDowntimeDays ?? 0) === Number(b.selfPayDowntimeDays ?? 0)
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
  const initialShareProcessedRef = useRef(false);
  const myCarAppliedRef = useRef(false);
  const { car } = useMyCar();

  // Saved My Car figures prefill the policy fields once, unless a shared link already set them.
  useEffect(() => {
    if (myCarAppliedRef.current || typeof window === "undefined") return;
    if (window.location.search) {
      myCarAppliedRef.current = true;
      return;
    }
    if (car.currentPremium === "" && car.currentNcd === "" && car.excess === "") return;
    myCarAppliedRef.current = true;
    setInputs((current) => {
      const next = { ...current };
      if (car.currentPremium !== "") next.currentPremium = Number(car.currentPremium);
      if (car.excess !== "") next.excess = Number(car.excess);
      if (car.currentNcd !== "" && NCD_STEPS.includes(Number(car.currentNcd))) {
        next.currentNcd = Number(car.currentNcd);
      }
      return next;
    });
  }, [car]);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading || initialShareProcessedRef.current) return;
    initialShareProcessedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    const parsed = { ...DEFAULT_INPUTS };
    let hasExplicitParams = false;

    if (params.has("insurer") && INSURER_PROFILES[params.get("insurer")]) {
      parsed.insurer = params.get("insurer");
      hasExplicitParams = true;
    }

    if (params.has("repairCost")) {
      const val = Number(params.get("repairCost"));
      if (Number.isFinite(val) && val > 0) {
        parsed.repairCost = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("currentPremium")) {
      const val = Number(params.get("currentPremium"));
      if (Number.isFinite(val) && val > 0) {
        parsed.currentPremium = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("currentNcd")) {
      const val = Number(params.get("currentNcd"));
      if (NCD_STEPS.includes(val)) {
        parsed.currentNcd = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("excess")) {
      const val = Number(params.get("excess"));
      if (Number.isFinite(val) && val >= 0) {
        parsed.excess = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("horizonYears")) {
      const val = Number(params.get("horizonYears"));
      if ([3, 5].includes(val)) {
        parsed.horizonYears = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("liability")) {
      const val = params.get("liability");
      if (["at_fault", "non_fault", "partial_fault"].includes(val)) {
        parsed.liability = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("workshopType")) {
      const val = params.get("workshopType");
      if (["authorized", "independent"].includes(val)) {
        parsed.workshopType = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("repairType")) {
      const val = params.get("repairType");
      if (["general", "windscreen"].includes(val)) {
        parsed.repairType = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("vehicleUsage")) {
      const val = params.get("vehicleUsage");
      if (["private", "phv"].includes(val)) {
        parsed.vehicleUsage = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("commercialClaimLoading")) {
      const val = Number(params.get("commercialClaimLoading"));
      if (Number.isFinite(val) && val >= 0 && val <= 100) {
        parsed.commercialClaimLoading = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("dailyDowntimeCost")) {
      const val = Number(params.get("dailyDowntimeCost"));
      if (Number.isFinite(val) && val >= 0 && val <= 5000) {
        parsed.dailyDowntimeCost = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("claimDowntimeDays")) {
      const val = Number(params.get("claimDowntimeDays"));
      if (Number.isFinite(val) && val >= 0 && val <= 60) {
        parsed.claimDowntimeDays = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("selfPayDowntimeDays")) {
      const val = Number(params.get("selfPayDowntimeDays"));
      if (Number.isFinite(val) && val >= 0 && val <= 60) {
        parsed.selfPayDowntimeDays = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("ncdProtector")) {
      parsed.ncdProtector =
        params.get("ncdProtector") === "1" || params.get("ncdProtector") === "true";
      hasExplicitParams = true;
    }

    if (params.has("youngDriverInvolved")) {
      parsed.youngDriverInvolved =
        params.get("youngDriverInvolved") === "1" ||
        params.get("youngDriverInvolved") === "true";
      hasExplicitParams = true;
    }

    if (params.has("thirdPartyClaim")) {
      parsed.thirdPartyClaim =
        params.get("thirdPartyClaim") === "1" ||
        params.get("thirdPartyClaim") === "true";
      hasExplicitParams = true;
    }

    if (params.has("baseGrowthRate")) {
      const val = Number(params.get("baseGrowthRate"));
      if (Number.isFinite(val) && val >= -20 && val <= 50) {
        parsed.baseGrowthRate = val;
        hasExplicitParams = true;
      }
    }

    if (params.has("discountRate")) {
      const val = Number(params.get("discountRate"));
      if (Number.isFinite(val) && val >= 0 && val <= 20) {
        parsed.discountRate = val;
        hasExplicitParams = true;
      }
    }

    // Enforce protector eligibility threshold on incoming parameters
    const parsedProfile = INSURER_PROFILES[parsed.insurer] || INSURER_PROFILES.other;
    if (parsed.currentNcd < (parsedProfile.minNcdForProtector ?? 50)) {
      parsed.ncdProtector = false;
    }

    if (hasExplicitParams) {
      setInputs(parsed);

      if (Number(parsed.repairCost) > 0) {
        void calculateAndCommit(parsed);
      }
    }
  }, [authLoading]);

  const isDirty = Boolean(submittedInputs && !areInputsEqual(inputs, submittedInputs));

  function handleInputChange(field, value) {
    setInputs((prev) => {
      const next = { ...prev, [field]: value };
      const nextProfile = INSURER_PROFILES[next.insurer] || INSURER_PROFILES.other;
      const minNcd = nextProfile.minNcdForProtector ?? 50;
      if (Number(next.currentNcd) < minNcd && next.ncdProtector) {
        next.ncdProtector = false;
      }
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
    url.search = "";
    if (active.insurer) url.searchParams.set("insurer", active.insurer);
    if (Number(active.repairCost) > 0) url.searchParams.set("repairCost", String(active.repairCost));
    if (Number(active.currentPremium) > 0) url.searchParams.set("currentPremium", String(active.currentPremium));
    if (active.currentNcd !== undefined && active.currentNcd !== "") url.searchParams.set("currentNcd", String(active.currentNcd));
    if (Number(active.excess) >= 0 && active.excess !== "") url.searchParams.set("excess", String(active.excess));
    if (active.horizonYears) url.searchParams.set("horizonYears", String(active.horizonYears));
    if (active.liability) url.searchParams.set("liability", active.liability);
    if (active.workshopType) url.searchParams.set("workshopType", active.workshopType);
    if (active.repairType) url.searchParams.set("repairType", active.repairType);
    if (active.vehicleUsage && active.vehicleUsage !== "private") {
      url.searchParams.set("vehicleUsage", active.vehicleUsage);
      if (Number.isFinite(Number(active.commercialClaimLoading))) {
        url.searchParams.set("commercialClaimLoading", String(active.commercialClaimLoading));
      }
      if (Number.isFinite(Number(active.dailyDowntimeCost))) {
        url.searchParams.set("dailyDowntimeCost", String(active.dailyDowntimeCost));
      }
      if (Number.isFinite(Number(active.claimDowntimeDays))) {
        url.searchParams.set("claimDowntimeDays", String(active.claimDowntimeDays));
      }
      if (Number.isFinite(Number(active.selfPayDowntimeDays))) {
        url.searchParams.set("selfPayDowntimeDays", String(active.selfPayDowntimeDays));
      }
    }
    if (active.ncdProtector) url.searchParams.set("ncdProtector", "1");
    if (active.youngDriverInvolved) url.searchParams.set("youngDriverInvolved", "1");
    if (active.thirdPartyClaim) url.searchParams.set("thirdPartyClaim", "1");
    if (Number(active.baseGrowthRate) !== 5 && Number.isFinite(Number(active.baseGrowthRate))) {
      url.searchParams.set("baseGrowthRate", String(active.baseGrowthRate));
    }
    if (Number(active.discountRate) !== 3 && Number.isFinite(Number(active.discountRate))) {
      url.searchParams.set("discountRate", String(active.discountRate));
    }
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
    const profile = INSURER_PROFILES[insurer] || INSURER_PROFILES.other;
    const currentNcd = historicalInputs.currentNcd ?? 50;
    const rawProtector = Boolean(
      historicalInputs.ncdProtector ?? historicalInputs.hasNcdProtector ?? false
    );
    const ncdProtector = Boolean(
      rawProtector && currentNcd >= (profile.minNcdForProtector ?? 50)
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
