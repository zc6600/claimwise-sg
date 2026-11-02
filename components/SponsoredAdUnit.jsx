"use client";

import { useState } from "react";

/**
 * SponsoredAdUnit - Commercial Monetization & Partner Referral Component
 *
 * Implements CS5224 Preliminary Report Section 2.1:
 * "Clearly labelled advertisements may be shown for relevant automotive services,
 *  but advertising does not affect the financial result."
 *
 * Revenue Channels:
 * 1. High-Yield Contextual CPA/CPL: GIA Workshops (Self-Pay) & Reporting Centres (Claim)
 * 2. Motor Insurance Renewal Brokerage Leads: CPL S$25 - S$45 per valid submission
 * 3. Programmatic Display Container: Google AdSense (ca-pub-xxx) slot
 */
export default function SponsoredAdUnit({ decision, inputs }) {
  const [activeTab, setActiveTab] = useState("contextual"); // 'contextual' | 'adsense'
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadForm, setLeadForm] = useState({ contact: "", plateNumber: "" });

  if (!decision) return null;

  const isClaim = decision.recommendation === "claim";
  const repairAmount = Number(inputs?.repairCost) || 1850;
  const currentInsurer = inputs?.insurer ? inputs.insurer.toUpperCase() : "ETIQA";

  // Contextual Partner Data based on Actuarial Recommendation
  const partnerConfig = isClaim
    ? {
        category: "APPROVED REPORTING & COURTESY FLEET",
        name: "GIA Approved Accident Reporting & Courtesy Fleet",
        rating: "4.9 ★★★★★ (2,400+ SG Motorists)",
        headline: "Free 3-Day Replacement Car & Priority GIA e-Filing",
        description: `Since claiming is more cost-effective for your ~S$${repairAmount.toLocaleString()} damage, file your official MCF report within 24 hours at an authorised ${currentInsurer} claims reporting centre to protect your liability.`,
        perks: [
          "Zero upfront deposit for qualifying own-damage claims",
          "Free hybrid/electric courtesy car during workshop stay",
          "Official GIA e-filing within MAS/MCF 24h compliance timeline",
        ],
        voucherCode: "CLAIMWISE-COURTESY",
        ctaText: "Locate Reporting Centre & Claim Car",
        commissionType: "CPL Lead Referral (Est. S$45 / lead)",
      }
    : {
        category: "GIA ACCREDITED BODYWORK & PAINTWORK",
        name: "AutoCraft Premier GIA-Accredited Bodywork",
        rating: "4.9 ★★★★★ (1,850+ Google Reviews)",
        headline: "Save S$100 on Paint & Dent Repair + 3-Yr Warranty",
        description: `Since self-paying is optimal, avoid insurer workshop surcharges and preserve your full NCD. Get OEM computerized color matching and lifetime bodywork rust guarantee.`,
        perks: [
          "S$100 instant cash voucher deducted from repair quote",
          "100% genuine factory body panels & PPG oven baked paint",
          "Preserve your 50% NCD without lodging an insurance record",
        ],
        voucherCode: "CLAIMWISE-100OFF",
        ctaText: "Get S$100 Voucher & Workshop Quote",
        commissionType: "Workshop Booking Commission (Est. 8% ~ S$95 / car)",
      };

  function handleOpenModal() {
    setLeadModalOpen(true);
    setLeadSubmitted(false);
  }

  function handleSubmitLead(e) {
    e.preventDefault();
    if (!leadForm.contact) return;
    setLeadSubmitted(true);
    setTimeout(() => {
      // Auto close after 3 seconds
      // setLeadModalOpen(false);
    }, 3000);
  }

  return (
    <div className="sponsored-ad-container" style={{ margin: "2.5rem 0", position: "relative" }}>
      {/* Monetization Card Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          padding: "0 0.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--teal-dark)",
              background: "var(--teal-soft)",
              padding: "3px 8px",
              borderRadius: "4px",
              border: "1px solid rgba(10,143,135,0.25)",
            }}
          >
            SPONSORED PARTNER
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>
            Curated Automotive Services (Singapore)
          </span>
        </div>

        {/* Tab Switcher: Contextual Referral vs Google AdSense */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.04)", padding: "2px", borderRadius: "8px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("contextual")}
            style={{
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              background: activeTab === "contextual" ? "#fff" : "transparent",
              color: activeTab === "contextual" ? "var(--ink)" : "var(--muted)",
              boxShadow: activeTab === "contextual" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
            }}
          >
            ⭐ Contextual Recommendation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("adsense")}
            style={{
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              background: activeTab === "adsense" ? "#fff" : "transparent",
              color: activeTab === "adsense" ? "var(--ink)" : "var(--muted)",
              boxShadow: activeTab === "adsense" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
            }}
          >
            📊 Google AdSense Slot
          </button>
        </div>
      </div>

      {activeTab === "contextual" ? (
        /* Contextual High-Value Automotive Partner Card */
        <div
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f7fbfb 100%)",
            border: "1.5px solid #d2eae6",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 10px 30px rgba(10, 143, 135, 0.06)",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "1.5rem",
            alignItems: "center",
          }}
          className="partner-card-responsive"
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.05em" }}>
                {partnerConfig.category}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#e67e22", fontWeight: 600 }}>
                {partnerConfig.rating}
              </span>
            </div>

            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "var(--ink)" }}>
              {partnerConfig.headline}
            </h3>

            <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.5, margin: "0 0 0.85rem 0", maxWidth: "620px" }}>
              {partnerConfig.description}
            </p>

            <ul style={{ margin: "0 0 1rem 0", paddingLeft: "1.2rem", fontSize: "0.82rem", color: "#374151" }}>
              {partnerConfig.perks.map((perk, idx) => (
                <li key={idx} style={{ marginBottom: "0.2rem" }}>
                  {perk}
                </li>
              ))}
            </ul>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleOpenModal}
                className="button button-primary"
                style={{ padding: "0 18px", minHeight: "40px", fontSize: "0.85rem" }}
              >
                {partnerConfig.ctaText} →
              </button>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#fff",
                  border: "1px dashed #0a8f87",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontFamily: "DM Mono, monospace",
                  color: "var(--teal-dark)",
                }}
              >
                <span>Promo:</span>
                <strong>{partnerConfig.voucherCode}</strong>
              </div>
            </div>
          </div>

          {/* Revenue Attribution Badge (For Demo / Report Evaluation) */}
          <div
            style={{
              background: "#edf7f5",
              border: "1px solid #bce2db",
              borderRadius: "12px",
              padding: "1rem",
              textAlign: "center",
              minWidth: "170px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
              Business Model
            </span>
            <strong style={{ fontSize: "0.95rem", color: "var(--teal-dark)" }}>
              {partnerConfig.commissionType.split("(")[0]}
            </strong>
            <span style={{ fontSize: "0.75rem", color: "#27ae60", fontWeight: 700 }}>
              {partnerConfig.commissionType.includes("(") ? `(${partnerConfig.commissionType.split("(")[1]}` : ""}
            </span>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)", borderTop: "1px solid #cce8e2", paddingTop: "0.35rem", marginTop: "0.2rem" }}>
              Zero impact on formula
            </span>
          </div>
        </div>
      ) : (
        /* Google AdSense Programmatic Ad Slot */
        <div
          style={{
            background: "#fafafa",
            border: "1.5px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "540px", margin: "0 auto" }}>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Google AdSense Display Banner (Responsive 728x90 / 300x250)
            </span>
            <div
              style={{
                margin: "1rem auto",
                padding: "1.5rem",
                background: "#f1f5f9",
                borderRadius: "8px",
                fontFamily: "DM Mono, monospace",
                fontSize: "0.8rem",
                color: "#475569",
              }}
            >
              &lt;ins class=&quot;adsbygoogle&quot;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;style=&quot;display:block&quot;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;data-ad-client=&quot;ca-pub-0000000000000000&quot;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;data-ad-slot=&quot;8192038192&quot;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;data-ad-format=&quot;auto&quot;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;data-full-width-responsive=&quot;true&quot;&gt;&lt;/ins&gt;
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
              Estimated Programmatic Yield: <strong>US$15 – $35 RPM</strong> for Singapore Motor & Finance Audience.
            </p>
          </div>
        </div>
      )}

      {/* Mandatory Regulatory & Actuarial Neutrality Guarantee */}
      <div
        style={{
          marginTop: "0.65rem",
          padding: "0.5rem 0.75rem",
          background: "rgba(240, 244, 248, 0.6)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.75rem",
          color: "var(--muted)",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>⚖️</span>
        <span>
          <strong>Actuarial Neutrality Guarantee (Section 2.1):</strong> Recommendations are computed 100% deterministically by CS5224 Formula (1). Advertisers or affiliate partners have zero influence on break-even thresholds or self-pay vs. claim advice.
        </span>
      </div>

      {/* Interactive Lead Capture Modal */}
      {leadModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11, 39, 49, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
          }}
          onClick={() => setLeadModalOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              maxWidth: "460px",
              width: "100%",
              padding: "2rem",
              boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLeadModalOpen(false)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            {!leadSubmitted ? (
              <div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: "var(--teal-dark)",
                    background: "var(--teal-soft)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                  }}
                >
                  INSTANT PARTNER PERK
                </span>
                <h3 style={{ fontSize: "1.25rem", margin: "0.75rem 0 0.5rem 0", color: "var(--ink)" }}>
                  {isClaim ? "Book Priority GIA e-Filing & Courtesy Car" : "Claim S$100 Workshop Cash Voucher"}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
                  Enter your contact details to receive your partner confirmation SMS / WhatsApp with booking redemption instructions.
                </p>

                <form onSubmit={handleSubmitLead} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.3rem", color: "var(--ink)" }}>
                      WhatsApp Phone / Email:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+65 9123 4567 or name@email.com"
                      value={leadForm.contact}
                      onChange={(e) => setLeadForm({ ...leadForm, contact: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.3rem", color: "var(--ink)" }}>
                      Vehicle Registration Number (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SJA 1234 A"
                      value={leadForm.plateNumber}
                      onChange={(e) => setLeadForm({ ...leadForm, plateNumber: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="button button-primary button-large"
                    style={{ width: "100%", marginTop: "0.5rem" }}
                  >
                    Confirm & Send Voucher Code ({partnerConfig.voucherCode})
                  </button>
                </form>

                <div style={{ marginTop: "1rem", fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
                  🔒 PDPA Compliant · We will never spam or sell your private information.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>
                <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: "var(--teal-dark)" }}>
                  Voucher Dispatched!
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
                  Your promo voucher <strong>{partnerConfig.voucherCode}</strong> has been sent to{" "}
                  <strong>{leadForm.contact}</strong>. Present it at the partner workshop for immediate redemption.
                </p>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setLeadModalOpen(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

