"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  STATUTORY_SERVICES,
  INSURER_HOTLINES,
  RTA_SECTION_84_RULES,
  ON_SCENE_CHECKLIST_ITEMS,
} from "../../src/emergency-data.mjs";

export default function EmergencyProtocolPage() {
  const [checkedItems, setCheckedItems] = useState({});
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine);
      const onOnline = () => setIsOffline(false);
      const onOffline = () => setIsOffline(true);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);

      try {
        const saved = sessionStorage.getItem("claimwise_emergency_checklist");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            setCheckedItems(parsed);
          }
        }
      } catch (err) {
        // Ignore session storage errors
      }

      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }
  }, []);

  const toggleCheck = (id) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        sessionStorage.setItem("claimwise_emergency_checklist", JSON.stringify(next));
      } catch (err) {
        // Ignore storage errors
      }
      return next;
    });
  };

  const clearChecklist = () => {
    setCheckedItems({});
    try {
      sessionStorage.removeItem("claimwise_emergency_checklist");
    } catch (err) {
      // Ignore
    }
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="section-pad" style={{ maxWidth: "880px", margin: "0 auto", paddingBottom: "64px" }}>
      {/* Header & Offline Banner */}
      <div style={{ marginTop: "24px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "4px",
              background: isOffline ? "#b45309" : "#0d9488",
              color: "#ffffff",
            }}
          >
            {isOffline ? "⚡ Offline Emergency Mode" : "Singapore Roadside & Carpark Protocol"}
          </span>
          <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
            Singapore GIA Motor Claims Framework (MCF)
          </span>
        </div>

        <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--ink)", margin: "0 0 10px 0" }}>
          Accident & Underground Carpark Emergency Kit
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          What to do in the first minutes after an accident on the road or in a car park. Once you have opened
          it, this page and the private settlement agreement keep working without mobile reception.
        </p>
      </div>

      {/* Immediate Action Gating Alert */}
      <div
        style={{
          background: "var(--amber-soft)",
          border: "1px solid var(--amber-border)",
          borderRadius: "var(--r-md)",
          padding: "18px 20px",
          marginBottom: "32px",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--amber)", margin: "0 0 8px 0" }}>
          Step 1: Stay safe, then check whether you must call the police
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 12px 0" }}>
          Under Section 84 of the Singapore Road Traffic Act and Singapore Police Force (SPF) guidelines, a Traffic
          Police accident report (or calling <strong>999</strong> for emergencies) is legally required only if any of
          the following criteria apply. Minor scrapes between Singapore-registered vehicles with no injuries do not
          require a police report:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
          {RTA_SECTION_84_RULES.map((rule) => (
            <div
              key={rule.id}
              style={{
                background: "#ffffff",
                border: "1px solid var(--amber-border)",
                borderRadius: "var(--r-sm)",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "0.8125rem", color: "var(--ink)", marginBottom: "4px" }}>
                ⚠️ {rule.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.4 }}>{rule.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive On-Scene Evidence Checklist */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md)",
          padding: "20px 22px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--ink)", margin: "0 0 4px 0" }}>
              Step 2: On-Scene Evidence Checklist ({completedCount}/{ON_SCENE_CHECKLIST_ITEMS.length})
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: 0 }}>
              Work through these steps before leaving the scene or moving vehicles.
            </p>
          </div>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={clearChecklist}
              style={{
                background: "transparent",
                border: "1px solid var(--line)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              Reset Checklist
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ON_SCENE_CHECKLIST_ITEMS.map((item) => {
            const isChecked = Boolean(checkedItems[item.id]);
            return (
              <label
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "var(--r-sm)",
                  border: `1px solid ${isChecked ? "var(--teal)" : "var(--line)"}`,
                  background: isChecked ? "var(--teal-soft)" : "var(--paper)",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCheck(item.id)}
                  style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "var(--teal)" }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: isChecked ? "var(--teal-dark)" : "var(--ink)",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "2px", lineHeight: 1.4 }}>
                    {item.subtext}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Tow Truck Scam & Predatory Workshop Advisory */}
      <div
        style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "var(--r-md)",
          padding: "18px 20px",
          marginBottom: "32px",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "#991b1b", margin: "0 0 8px 0" }}>
          🚨 Critical Advisory: Unauthorized Tow Truck Vultures
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#7f1d1d", lineHeight: 1.5, margin: "0 0 8px 0" }}>
          Within minutes of an accident, unauthorized third-party tow truck operators often arrive uncalled. They may
          claim they were sent by the Police or your insurer, and urge you to sign a document or tow your car to an
          unauthorized workshop.
        </p>
        <ul style={{ margin: "0 0 8px 0", paddingLeft: "20px", fontSize: "0.8125rem", color: "#991b1b", lineHeight: 1.5 }}>
          <li>
            <strong>Never sign any blank document or towing voucher</strong> under roadside pressure.
          </li>
          <li>
            Towing to an unauthorized independent workshop may void your insurer's approved repair warranty and can incur
            substantial unauthorized workshop excess surcharges (e.g. S$1,000 to S$3,000 depending on policy terms).
          </li>
          <li>
            Only contact your insurer's official hotline listed below or arrange towing through your insurer's authorized
            panel.
          </li>
        </ul>
      </div>

      {/* GIA 24-Hour Mandatory Reporting Rule */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md)",
          padding: "20px 22px",
          marginBottom: "32px",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--ink)", margin: "0 0 8px 0" }}>
          Step 3: The GIA 24-Hour Insurer Reporting Rule
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 12px 0" }}>
          Under the General Insurance Association of Singapore (GIA) Motor Claims Framework (MCF), motorists must report
          every accident with their vehicle to their insurer's Approved Reporting Centre (ARC) or authorized workshop
          <strong> within 24 hours or by the next working day</strong>.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
          <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--r-sm)" }}>
            <div style={{ fontWeight: "600", fontSize: "0.8125rem", color: "var(--ink)", marginBottom: "4px" }}>
              Even If You Plan to Settle Privately
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Lodge a report for record purposes only. This protects you against later fraudulent or exaggerated
              third-party injury claims.
            </div>
          </div>
          <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--r-sm)" }}>
            <div style={{ fontWeight: "600", fontSize: "0.8125rem", color: "var(--ink)", marginBottom: "4px" }}>
              Consequences of Failure to Report
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Failure to report may prejudice future claims, cause your insurer to repudiate liability, or result in an
              NCD reduction upon renewal according to policy clauses.
            </div>
          </div>
        </div>
      </div>

      {/* Verified Insurer & Emergency Hotlines */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md)",
          padding: "20px 22px",
          marginBottom: "32px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--ink)", margin: "0 0 4px 0" }}>
            Emergency and insurer hotlines
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: 0 }}>
            Operating hours and coverage vary by insurer. Verify assistance terms against your policy certificate.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)" }}>
            Emergency and road services
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
            {STATUTORY_SERVICES.map((s) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-sm)",
                  padding: "12px",
                  background: s.isEmergencyOnly ? "#fff7ed" : "var(--paper)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: "600", fontSize: "0.8125rem", color: "var(--ink)" }}>{s.name}</div>
                  <a
                    href={`tel:${s.phone}`}
                    style={{
                      background: s.isEmergencyOnly ? "#c2410c" : "var(--teal)",
                      color: "#ffffff",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      textDecoration: "none",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                    }}
                  >
                    📞 {s.displayPhone}
                  </a>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "6px", lineHeight: 1.4 }}>
                  {s.scope}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--muted-light)", marginTop: "4px" }}>
                  🕒 {s.availability}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)" }}>
            Authorized Insurer Hotlines
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
            {INSURER_HOTLINES.map((ins) => (
              <div
                key={ins.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-sm)",
                  padding: "12px",
                  background: "var(--paper)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: "600", fontSize: "0.8125rem", color: "var(--ink)" }}>{ins.name}</div>
                  <a
                    href={`tel:${ins.phone}`}
                    style={{
                      background: "var(--teal)",
                      color: "#ffffff",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      textDecoration: "none",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                    }}
                  >
                    📞 {ins.displayPhone}
                  </a>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "6px", lineHeight: 1.4 }}>
                  {ins.service}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--muted-light)", marginTop: "4px" }}>
                  🕒 {ins.hours}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Immediate Decision Gateways */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <Link
          href="/settlement"
          style={{
            background: "var(--teal)",
            color: "#ffffff",
            padding: "18px 20px",
            borderRadius: "var(--r-md)",
            textDecoration: "none",
            display: "block",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "4px" }}>
            Create a private settlement agreement →
          </div>
          <div style={{ fontSize: "0.8125rem", opacity: 0.9, lineHeight: 1.4 }}>
            If nobody was hurt, write down what you and the other driver agree, even without reception.
          </div>
        </Link>

        <Link
          href="/calculator"
          style={{
            background: "var(--card)",
            color: "var(--ink)",
            border: "1px solid var(--line-strong)",
            padding: "18px 20px",
            borderRadius: "var(--r-md)",
            textDecoration: "none",
            display: "block",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "4px" }}>
            Should you claim or pay yourself? →
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.4 }}>
            Evaluate NCD drop, excess thresholds, and break-even repair cost before agreeing to any settlement amount.
          </div>
        </Link>
      </div>
    </div>
  );
}
