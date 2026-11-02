"use client";

import { useState } from "react";
import Link from "next/link";
import {
  NCD_STEPS,
  calculateDecision,
  formatCurrency,
  formatPercent,
} from "../src/decision-engine.mjs";

const QUICK_QUOTES = [800, 1200, 2200, 3500];

export default function HomePage() {
  const [repairCost, setRepairCost] = useState(1200);
  const [currentNcd, setCurrentNcd] = useState(50);
  const [currentPremium] = useState(1650);
  const [excess] = useState(600);

  const decision = calculateDecision({
    insurer: "income",
    currentPremium,
    currentNcd,
    excess,
    repairCost,
    horizonYears: 3,
    baseGrowthRate: 5,
    discountRate: 3,
    ncdProtector: false,
    liability: "at_fault",
    thirdPartyClaim: false,
    workshopType: "authorized",
    youngDriverInvolved: false,
    repairType: "general",
  });

  const base = decision.baseScenario;
  const breakEven = base?.breakEvenRepairCost || 0;
  const savings = Math.abs(base?.difference || 0);
  const claimIsBetter = decision.recommendation === "claim";

  const scaleMax = Math.max(breakEven * 1.35, repairCost * 1.2, excess * 2, 1000);
  const quotePct = Math.min(96, Math.max(4, (repairCost / scaleMax) * 100));
  const breakEvenPct = Math.min(92, Math.max(8, (breakEven / scaleMax) * 100));

  const queryParams = new URLSearchParams({
    repairCost: String(repairCost),
    currentNcd: String(currentNcd),
  }).toString();

  return (
    <div className="home-page">
      <section className="hero section-pad">
        <div className="hero-copy">
          <div className="section-kicker">Singapore motor insurance · GIA MCF model</div>
          <h1>After a minor accident, should you claim or self-pay?</h1>
          <p className="hero-lead">
            Filing an own-damage claim in Singapore steps your No Claims Discount down by 30
            percentage points for up to three renewals. Model your exact break-even repair
            threshold before you decide.
          </p>

          <div className="hero-actions">
            <Link className="button button-primary button-large" href={`/calculator?${queryParams}`}>
              Open full calculator <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button-ghost button-large" href="/rules">
              Insurer NCD rules
            </Link>
          </div>

          <dl className="hero-facts">
            <div>
              <dt>Standard GIA step-down</dt>
              <dd className="tabular-nums">−30% NCD</dd>
            </div>
            <div>
              <dt>Recovery horizon</dt>
              <dd className="tabular-nums">3 renewals</dd>
            </div>
            <div>
              <dt>SG insurers modelled</dt>
              <dd className="tabular-nums">5 profiles</dd>
            </div>
          </dl>
        </div>

        {/* Live Interactive Quick Estimator */}
        <div className="quick-estimator" aria-label="Interactive quick claim estimator">
          <div className="estimator-header">
            <div>
              <span className="estimator-kicker">Interactive preview</span>
              <h2>Quick break-even check</h2>
            </div>
            <span className="estimator-assumptions tabular-nums">
              S$1,650/yr premium · S$600 excess
            </span>
          </div>

          <div className="estimator-controls">
            <div className="field">
              <div className="field-label-row">
                <label htmlFor="home-repair-quote">Workshop repair quote</label>
                <div className="preset-pills" role="group" aria-label="Preset repair quotes">
                  {QUICK_QUOTES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={`preset-pill tabular-nums ${Number(repairCost) === q ? "is-selected" : ""}`}
                      onClick={() => setRepairCost(q)}
                    >
                      {formatCurrency(q)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-prefix">
                <span>S$</span>
                <input
                  id="home-repair-quote"
                  type="number"
                  min="0"
                  step="50"
                  className="tabular-nums"
                  value={repairCost}
                  onChange={(e) => setRepairCost(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>

            <div className="field">
              <span className="field-label">Current NCD tier</span>
              <div className="segmented-row" role="group" aria-label="Current NCD tier">
                {NCD_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={`segment-btn tabular-nums ${currentNcd === step ? "is-selected" : ""}`}
                    onClick={() => setCurrentNcd(step)}
                  >
                    {step}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Verdict & Break-Even Ruler */}
          <div className={`estimator-verdict ${claimIsBetter ? "is-claim" : "is-self-pay"}`}>
            <div className="verdict-top">
              <span className="verdict-pill">
                {decision.isBelowExcess
                  ? "Below policy excess"
                  : claimIsBetter
                  ? "Claiming is lower cost"
                  : "Self-paying is lower cost"}
              </span>
              <span className="verdict-horizon">3-year net present value</span>
            </div>

            <div className="verdict-headline tabular-nums">
              {decision.isBelowExcess
                ? `Pay ${formatCurrency(repairCost)} out-of-pocket`
                : claimIsBetter
                ? `Claiming saves about ${formatCurrency(savings)}`
                : `Self-paying saves about ${formatCurrency(savings)}`}
            </div>

            <p className="verdict-sub">
              {decision.isBelowExcess
                ? `Quote does not exceed your ${formatCurrency(excess)} excess, so insurer payout is S$0.`
                : `NCD shifts ${formatPercent(currentNcd)} → ${formatPercent(decision.claimNcdAfter)} if you claim. Break-even repair quote is ${formatCurrency(breakEven)}.`}
            </p>

            {/* Break-even ruler */}
            <div className="breakeven-ruler">
              <div className="ruler-labels tabular-nums">
                <span>
                  Your quote: <strong>{formatCurrency(repairCost)}</strong>
                </span>
                <span>
                  Break-even: <strong>{formatCurrency(breakEven)}</strong>
                </span>
              </div>
              <div className="ruler-track">
                <div
                  className="ruler-zone-selfpay"
                  style={{ width: `${breakEvenPct}%` }}
                />
                <div
                  className="ruler-threshold"
                  style={{ left: `${breakEvenPct}%` }}
                  title={`Break-even threshold: ${formatCurrency(breakEven)}`}
                />
                <div
                  className={`ruler-marker ${claimIsBetter ? "is-claim" : "is-self-pay"}`}
                  style={{ left: `${quotePct}%` }}
                  title={`Your repair quote: ${formatCurrency(repairCost)}`}
                />
              </div>
              <div className="ruler-caption">
                <span>← Self-pay zone (below {formatCurrency(breakEven)})</span>
                <span>Claim zone →</span>
              </div>
            </div>

            <div className="estimator-totals tabular-nums">
              <div>
                <span>3-yr total if self-pay</span>
                <strong>{formatCurrency(base?.selfPayTotal)}</strong>
              </div>
              <div>
                <span>3-yr total if claim</span>
                <strong>{formatCurrency(base?.claimTotal)}</strong>
              </div>
            </div>
          </div>

          <div className="estimator-footer">
            <Link href={`/calculator?${queryParams}`} className="estimator-link">
              Customise insurer, workshop type, NCD protector & liability <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Grounding 3-column overview */}
      <section className="home-principles section-pad">
        <div className="principles-header">
          <h2>Why comparing your repair bill to your excess isn’t enough</h2>
          <p>
            A S$1,200 repair bill looks higher than a S$600 policy excess—until you account for
            three years of reduced No Claims Discount.
          </p>
        </div>

        <div className="principles-grid">
          <article className="principle-item">
            <span className="principle-num tabular-nums">01</span>
            <h3>Day-one deductible</h3>
            <p>
              When you file an own-damage claim, you still pay your standard excess—plus mandatory
              surcharges if you use a non-authorised workshop or a young/inexperienced driver was at
              the wheel.
            </p>
          </article>

          <article className="principle-item">
            <span className="principle-num tabular-nums">02</span>
            <h3>Multi-year NCD penalty</h3>
            <p>
              Without an NCD Protector rider, one at-fault claim reduces your discount by 30
              percentage points (for example, 50% down to 20%) and takes three claim-free renewals
              to climb back.
            </p>
          </article>

          <article className="principle-item">
            <span className="principle-num tabular-nums">03</span>
            <h3>Exact break-even point</h3>
            <p>
              Claiming only saves money when the workshop quote exceeds your effective excess plus
              the discounted sum of those future renewal surcharges.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
