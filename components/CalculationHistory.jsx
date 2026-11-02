"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import {
  subscribeToCalculations,
  deleteCalculationRecord,
} from "../lib/history-service";
import Link from "next/link";
import { formatCurrency } from "../src/decision-engine.mjs";

export default function CalculationHistory({ onLoadRecord }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    const unsubscribe = subscribeToCalculations(user, (items) => {
      setRecords(items || []);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [user, mounted]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    await deleteCalculationRecord(user, id);
  }

  function formatRelativeTime(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffSecs = Math.floor((now - date) / 1000);
      if (diffSecs < 60) return "Just now";
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return date.toLocaleDateString("en-SG", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  return (
    <div className="history-card">
      <div className="history-header">
        <div className="history-title-group">
          <h3>Saved comparisons</h3>
        </div>
        <div className="history-sync-badge">
          <span className="history-sync-dot"></span>
          <span>{user ? "Cloud synced" : "Saved in browser"}</span>
        </div>
      </div>

      {!user && (
        <div className="history-signin-prompt">
          <Link href="/login">Sign in</Link> to sync saved comparisons across devices.
        </div>
      )}

      {loading ? (
        <div className="history-empty">Loading saved comparisons…</div>
      ) : records.length === 0 ? (
        <div className="history-empty">
          <p className="history-empty-title">No saved comparisons yet</p>
          <span>Save a scenario above to compare quotes from different workshops.</span>
        </div>
      ) : (
        <div className="history-list">
          {records.map((rec) => {
            const recommendation = String(rec.results?.recommendation || "")
              .toLowerCase()
              .replaceAll("_", "-");
            const isSelfPay = recommendation === "self-pay";
            const isClaim = recommendation === "claim";
            const badgeClass = isSelfPay ? "self-pay" : isClaim ? "claim" : "neutral";
            const badgeLabel = isSelfPay
              ? "Self-pay"
              : isClaim
              ? "Claim"
              : "Neutral";

            return (
              <div key={rec.id} className="history-item">
                <div className="history-item-top">
                  <span className="history-item-quote tabular-nums">
                    Quote {formatCurrency(rec.inputs?.repairCost || 0)}
                  </span>
                  <span className="history-item-date">
                    {formatRelativeTime(rec.createdAt)}
                  </span>
                </div>

                <div className="history-item-middle">
                  <span className={`history-badge ${badgeClass}`}>{badgeLabel}</span>
                  {rec.results?.savings > 0 && (
                    <span className="history-item-diff tabular-nums">
                      Saves {formatCurrency(rec.results.savings)}
                    </span>
                  )}
                </div>

                <div className="history-item-actions">
                  <button
                    type="button"
                    onClick={() => onLoadRecord(rec.inputs)}
                    className="history-load-btn"
                  >
                    Load parameters →
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(rec.id, e)}
                    className="history-delete-btn"
                    title="Delete record"
                    aria-label="Delete saved comparison"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
