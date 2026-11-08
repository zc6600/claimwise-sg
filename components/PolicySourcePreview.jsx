"use client";

import { useState } from "react";
import { getClausePdfInfo } from "../src/clause-documents.mjs";

export default function PolicySourcePreview({ clauseAudit = [], insurer = "income" }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [pinnedId, setPinnedId] = useState(null);
  const [viewMode, setViewMode] = useState("pdf"); // "pdf" | "summary"

  if (!clauseAudit.length) return null;

  const activeId = pinnedId || hoveredId;
  const activeClause = clauseAudit.find((item) => item.id === activeId) || null;
  const activePdfInfo = activeClause ? getClausePdfInfo(activeClause.id, insurer) : null;

  function handleRowClick(id) {
    if (pinnedId === id) {
      setPinnedId(null);
      setHoveredId(null);
    } else {
      setPinnedId(id);
      setHoveredId(id);
    }
  }

  function handleClose() {
    setPinnedId(null);
    setHoveredId(null);
  }

  return (
    <section
      className="policy-source-section"
      aria-label="Where each rule comes from"
      onMouseLeave={() => {
        if (!pinnedId) setHoveredId(null);
      }}
    >
      <div className="policy-source-heading">
        <div>
          <h3>Where each rule comes from</h3>
          <p>
            Hover or click any rule below to inspect its contractual rationale and view the
            matching page in the official insurer policy wording PDF.
          </p>
        </div>
        <span className="policy-source-count tabular-nums">
          {clauseAudit.length} rules
        </span>
      </div>

      <div className="policy-source-list">
        {clauseAudit.map((item) => {
          const isSelected = activeId === item.id;
          const isPinned = pinnedId === item.id;
          const itemPdf = getClausePdfInfo(item.id, insurer);

          return (
            <div key={item.id} className="policy-source-item">
              <button
                type="button"
                className={`policy-source-row${isSelected ? " is-active" : ""}${
                  isPinned ? " is-pinned" : ""
                }`}
                onMouseEnter={() => {
                  if (!pinnedId) setHoveredId(item.id);
                }}
                onFocus={() => {
                  if (!pinnedId) setHoveredId(item.id);
                }}
                onClick={() => handleRowClick(item.id)}
                aria-expanded={isSelected}
              >
                <div className="policy-source-row-main">
                  <div className="policy-source-row-title">
                    <span className="policy-source-datapoint">{item.dataPoint}</span>
                    <span className={`policy-status-pill is-${item.status || "active"}`}>
                      {item.statusLabel || item.status}
                    </span>
                  </div>
                  <span className="policy-source-ref">
                    {item.clauseRef}
                    {itemPdf ? ` · PDF p.${itemPdf.page}` : ""}
                  </span>
                </div>

                <div className="policy-source-row-meta tabular-nums">
                  <strong>{item.value}</strong>
                  <span className="policy-source-action" aria-hidden="true">
                    {isPinned ? "Pinned 📌" : itemPdf ? "PDF ↗" : "Details ↗"}
                  </span>
                </div>
              </button>

              {/* Print-only clause detail so printed/exported PDF reports include the full audit trail */}
              <div className="policy-source-print-detail">
                <p className="policy-print-rationale">{item.rationale}</p>
                <small className="policy-print-meta">
                  <strong>Reference:</strong> {item.clauseRef} ({item.authority})
                </small>
              </div>
            </div>
          );
        })}
      </div>

      {activeClause && (
        <div
          className="policy-source-popover"
          role="region"
          aria-label={`${activeClause.dataPoint} source preview`}
        >
          <div className="policy-popover-header">
            <div className="policy-popover-title">
              <div className="policy-popover-kicker">
                <span>{activeClause.category}</span>
                {activePdfInfo && (
                  <span className="tabular-nums">· Page {activePdfInfo.page}</span>
                )}
              </div>
              <strong>{activeClause.dataPoint}</strong>
              <span className="policy-popover-sub">{activeClause.clauseRef}</span>
            </div>

            <div className="policy-popover-controls">
              <div
                className="policy-mode-switch"
                role="group"
                aria-label="Preview display mode"
              >
                <button
                  type="button"
                  className={`policy-mode-btn${viewMode === "pdf" ? " is-selected" : ""}`}
                  onClick={() => setViewMode("pdf")}
                >
                  Official PDF
                </button>
                <button
                  type="button"
                  className={`policy-mode-btn${viewMode === "summary" ? " is-selected" : ""}`}
                  onClick={() => setViewMode("summary")}
                >
                  Clause summary
                </button>
              </div>

              <button
                type="button"
                className={`policy-pin-btn${pinnedId === activeClause.id ? " is-pinned" : ""}`}
                onClick={() =>
                  setPinnedId(pinnedId === activeClause.id ? null : activeClause.id)
                }
                aria-pressed={pinnedId === activeClause.id}
              >
                {pinnedId === activeClause.id ? "📌 Pinned" : "Pin"}
              </button>

              {activePdfInfo && (
                <a
                  href={activePdfInfo.anchorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="policy-external-link"
                >
                  Full tab ↗
                </a>
              )}

              <button
                type="button"
                className="policy-source-close"
                onClick={handleClose}
                aria-label="Close source preview"
              >
                ×
              </button>
            </div>
          </div>

          <div className="policy-popover-rationale">
            <p>{activeClause.rationale}</p>
          </div>

          {viewMode === "pdf" ? (
            <div className="policy-popover-frame-wrap">
              <iframe
                key={`${insurer}-${activeClause.id}`}
                loading="lazy"
                title={`${activeClause.dataPoint} official policy source`}
                src={`/api/clause-preview?id=${encodeURIComponent(
                  activeClause.id
                )}&insurer=${encodeURIComponent(insurer)}`}
              />
            </div>
          ) : (
            <dl className="policy-summary-grid">
              <div>
                <dt>Contractual clause reference</dt>
                <dd>{activeClause.clauseRef}</dd>
              </div>
              <div>
                <dt>Governing authority</dt>
                <dd>{activeClause.authority}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{activeClause.statutoryBasis}</dd>
              </div>
              <div>
                <dt>Summary (not the policy wording)</dt>
                <dd>{activeClause.illustrativeText}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
