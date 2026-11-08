"use client";

import { useState } from "react";
import { formatCurrency, formatPercent } from "../src/formatters.mjs";
import {
  computeCumulativeTrajectory,
  findTrajectoryCrossover,
  computeNcdTrajectory,
} from "../src/trajectory-calculator.mjs";

export default function TrajectoryVisualizer({ baseScenario, inputs, effectiveExcess }) {
  const [activeTab, setActiveTab] = useState("outflow"); // 'outflow' | 'ncd'
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);

  if (!baseScenario) return null;

  const points = computeCumulativeTrajectory(baseScenario, inputs, effectiveExcess);
  const ncdPoints = computeNcdTrajectory(baseScenario, inputs);
  const crossover = findTrajectoryCrossover(points);

  if (points.length === 0) return null;

  // SVG dimensions
  const width = 540;
  const height = 240;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Max value for outflow scaling
  const maxOutflow = Math.max(
    ...points.map((p) => Math.max(p.selfPayOutflow, p.claimOutflow)),
    1000
  );
  const yTicks = [0, Math.round(maxOutflow * 0.5), Math.round(maxOutflow)];

  // Dynamic NCD scale
  const maxObservedNcd = Math.max(50, ...ncdPoints.map((p) => Math.max(p.selfPayNcd, p.claimNcd)));
  const ncdCeiling = Math.min(100, maxObservedNcd + 10);

  // Helper to map (yearIndex, value) to SVG coordinates with single-point fallback
  const getX = (index) => {
    if (points.length <= 1) return padLeft + plotWidth / 2;
    return padLeft + (index / (points.length - 1)) * plotWidth;
  };

  const getYOutflow = (val) => padTop + plotHeight - (val / maxOutflow) * plotHeight;
  const getYNcd = (ncdVal) => padTop + plotHeight - (ncdVal / ncdCeiling) * plotHeight;

  // Generate SVG polyline points (only if 2+ points exist)
  const selfPayPolyline =
    points.length >= 2
      ? points.map((p, i) => `${getX(i)},${getYOutflow(p.selfPayOutflow)}`).join(" ")
      : "";
  const claimPolyline =
    points.length >= 2
      ? points.map((p, i) => `${getX(i)},${getYOutflow(p.claimOutflow)}`).join(" ")
      : "";

  const selfPayNcdPolyline =
    ncdPoints.length >= 2
      ? ncdPoints.map((p, i) => `${getX(i)},${getYNcd(p.selfPayNcd)}`).join(" ")
      : "";
  const claimNcdPolyline =
    ncdPoints.length >= 2
      ? ncdPoints.map((p, i) => `${getX(i)},${getYNcd(p.claimNcd)}`).join(" ")
      : "";

  const activeIndex = selectedPointIndex !== null ? selectedPointIndex : points.length - 1;
  const activePoint = points[activeIndex] || points[0];
  const activeNcdPoint = ncdPoints[activeIndex] || ncdPoints[0];

  const handleKeySelect = (e, index) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedPointIndex(index);
    }
  };

  return (
    <div className="trajectory-card" aria-label="Multi-year financial trajectory visualizer">
      <div className="trajectory-header">
        <div>
          <span className="section-kicker">Cost over time</span>
          <h3 className="trajectory-title">How the two options compare year by year</h3>
        </div>

        <div className="chart-mode-tabs" role="tablist" aria-label="Trajectory chart modes">
          <button
            type="button"
            role="tab"
            id="tab-outflow"
            aria-selected={activeTab === "outflow"}
            aria-controls="panel-trajectory"
            className={`tab-btn ${activeTab === "outflow" ? "is-active" : ""}`}
            onClick={() => setActiveTab("outflow")}
          >
            Cumulative Cost (S$)
          </button>
          <button
            type="button"
            role="tab"
            id="tab-ncd"
            aria-selected={activeTab === "ncd"}
            aria-controls="panel-trajectory"
            className={`tab-btn ${activeTab === "ncd" ? "is-active" : ""}`}
            onClick={() => setActiveTab("ncd")}
          >
            NCD Trajectory (%)
          </button>
        </div>
      </div>

      {crossover.hasCrossover && activeTab === "outflow" && (
        <div className="trajectory-crossover-banner" role="status">
          <span className="crossover-badge">Break-Even Milestone</span>
          <span>{crossover.description}</span>
        </div>
      )}

      {/* SVG Canvas wrapped in accessible region */}
      <div
        id="panel-trajectory"
        role="tabpanel"
        aria-labelledby={activeTab === "outflow" ? "tab-outflow" : "tab-ncd"}
        className="svg-chart-container"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="trajectory-svg"
          aria-hidden="true"
        >
          {/* Grid lines */}
          {activeTab === "outflow" ? (
            yTicks.map((tick, idx) => {
              const yPos = getYOutflow(tick);
              return (
                <g key={idx} className="chart-grid-line">
                  <line x1={padLeft} y1={yPos} x2={width - padRight} y2={yPos} />
                  <text x={padLeft - 8} y={yPos + 4} textAnchor="end" className="chart-axis-label">
                    {formatCurrency(tick)}
                  </text>
                </g>
              );
            })
          ) : (
            [0, 20, 40, 50].map((ncdTick) => {
              const yPos = getYNcd(ncdTick);
              return (
                <g key={ncdTick} className="chart-grid-line">
                  <line x1={padLeft} y1={yPos} x2={width - padRight} y2={yPos} />
                  <text x={padLeft - 8} y={yPos + 4} textAnchor="end" className="chart-axis-label">
                    {ncdTick}%
                  </text>
                </g>
              );
            })
          )}

          {/* X Axis Labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={getX(i)}
              y={height - 10}
              textAnchor="middle"
              className={`chart-axis-label ${activeIndex === i ? "is-selected" : ""}`}
            >
              {p.label}
            </text>
          ))}

          {/* Lines & Points */}
          {activeTab === "outflow" ? (
            <>
              {claimPolyline && (
                <polyline
                  fill="none"
                  stroke="var(--coral, #e11d48)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={claimPolyline}
                />
              )}
              {selfPayPolyline && (
                <polyline
                  fill="none"
                  stroke="var(--teal, #0d9488)"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={selfPayPolyline}
                />
              )}

              {points.map((p, i) => (
                <g
                  key={i}
                  tabIndex={0}
                  role="button"
                  aria-label={`Milestone ${p.label}: Self-pay ${formatCurrency(p.selfPayOutflow)}, Claim ${formatCurrency(p.claimOutflow)}`}
                  onClick={() => setSelectedPointIndex(i)}
                  onKeyDown={(e) => handleKeySelect(e, i)}
                  className="chart-interactive-dot-group"
                >
                  <circle
                    cx={getX(i)}
                    cy={getYOutflow(p.claimOutflow)}
                    r={activeIndex === i ? 6 : 4}
                    fill="var(--coral, #e11d48)"
                    className="chart-dot"
                  />
                  <circle
                    cx={getX(i)}
                    cy={getYOutflow(p.selfPayOutflow)}
                    r={activeIndex === i ? 6 : 4}
                    fill="var(--teal, #0d9488)"
                    className="chart-dot"
                  />
                </g>
              ))}
            </>
          ) : (
            <>
              {claimNcdPolyline && (
                <polyline
                  fill="none"
                  stroke="var(--coral, #e11d48)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={claimNcdPolyline}
                />
              )}
              {selfPayNcdPolyline && (
                <polyline
                  fill="none"
                  stroke="var(--teal, #0d9488)"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={selfPayNcdPolyline}
                />
              )}

              {ncdPoints.map((p, i) => (
                <g
                  key={i}
                  tabIndex={0}
                  role="button"
                  aria-label={`Milestone ${p.label}: Self-pay NCD ${formatPercent(p.selfPayNcd)}, Claim NCD ${formatPercent(p.claimNcd)}`}
                  onClick={() => setSelectedPointIndex(i)}
                  onKeyDown={(e) => handleKeySelect(e, i)}
                  className="chart-interactive-dot-group"
                >
                  <circle
                    cx={getX(i)}
                    cy={getYNcd(p.claimNcd)}
                    r={activeIndex === i ? 6 : 4}
                    fill="var(--coral, #e11d48)"
                    className="chart-dot"
                  />
                  <circle
                    cx={getX(i)}
                    cy={getYNcd(p.selfPayNcd)}
                    r={activeIndex === i ? 6 : 4}
                    fill="var(--teal, #0d9488)"
                    className="chart-dot"
                  />
                </g>
              ))}
            </>
          )}
        </svg>
      </div>

      {/* Accessible milestone selector bar */}
      <div className="milestone-selector-bar" role="group" aria-label="Trajectory milestone selector">
        {points.map((p, i) => (
          <button
            key={i}
            type="button"
            className={`milestone-pill ${activeIndex === i ? "is-selected" : ""}`}
            onClick={() => setSelectedPointIndex(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Legend & Milestone Readout */}
      <div className="trajectory-footer">
        <div className="trajectory-legend">
          <span className="legend-item">
            <span className="legend-swatch is-self-pay"></span>
            <strong>Self-Pay Path</strong>
            {activeTab === "outflow" ? (
              <span className="tabular-nums">
                ({formatCurrency(activePoint.selfPayOutflow)} at {activePoint.label})
              </span>
            ) : (
              <span className="tabular-nums">
                ({formatPercent(activeNcdPoint.selfPayNcd)} NCD)
              </span>
            )}
          </span>

          <span className="legend-item">
            <span className="legend-swatch is-claim"></span>
            <strong>Insurance Claim Path</strong>
            {activeTab === "outflow" ? (
              <span className="tabular-nums">
                ({formatCurrency(activePoint.claimOutflow)} at {activePoint.label})
              </span>
            ) : (
              <span className="tabular-nums">
                ({formatPercent(activeNcdPoint.claimNcd)} NCD)
              </span>
            )}
          </span>
        </div>

        <div className="trajectory-hint">
          Click any milestone pill or dot above to inspect cumulative cash flow.
        </div>
      </div>
    </div>
  );
}
