"use client";

import { useState } from "react";

export default function PolicySourcePreview({ clauseAudit = [], insurer = "income" }) {
  const [activeId, setActiveId] = useState(null);
  const activeClause = clauseAudit.find((item) => item.id === activeId);

  if (!clauseAudit.length) return null;

  return (
    <section
      className="policy-source-section"
      aria-label="Official policy source pages"
    >
      <div className="policy-source-heading">
        <div>
          <h3>Check the policy wording</h3>
          <p>Hover over or focus a row to view the matching page in the official PDF.</p>
        </div>
      </div>
      <div className="policy-source-list">
        {clauseAudit.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`policy-source-row${activeId === item.id ? " is-active" : ""}`}
            onMouseEnter={() => setActiveId(item.id)}
            onFocus={() => setActiveId(item.id)}
            onClick={() => setActiveId(item.id)}
            aria-expanded={activeId === item.id}
          >
            <span>{item.dataPoint}</span>
            <strong>{item.value}</strong>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {activeClause && (
        <div className="policy-source-popover" role="region" aria-label={`${activeClause.dataPoint} source preview`}>
          <button type="button" className="policy-source-close" onClick={() => setActiveId(null)} aria-label="Close source preview">×</button>
          <iframe
            key={`${insurer}-${activeClause.id}`}
            title={`${activeClause.dataPoint} official policy source`}
            src={`/api/clause-preview?id=${encodeURIComponent(activeClause.id)}&insurer=${encodeURIComponent(insurer)}`}
          />
        </div>
      )}
    </section>
  );
}
