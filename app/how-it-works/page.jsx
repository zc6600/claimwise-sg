import Link from "next/link";

export const metadata = {
  title: "How It Works · ClaimWise SG",
  description:
    "Learn how ClaimWise SG models motor insurance claim decisions, NCD step-downs, and break-even repair costs in Singapore.",
};

export default function HowItWorksPage() {
  return (
    <section className="how-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Methodology & actuarial model</div>
          <h1>How the financial model works</h1>
        </div>
        <p>
          ClaimWise SG evaluates an own-damage motor claim by comparing your immediate repair
          outflow against the discounted multi-year cost of losing your No Claims Discount.
        </p>
      </div>

      <div className="how-grid">
        <article className="how-step">
          <span className="step-badge tabular-nums">01</span>
          <h2>Immediate outflow (Day 1)</h2>
          <p>
            After an accident, you either pay the workshop repair bill yourself or pay your
            effective policy excess to file an own-damage claim.
          </p>
          <ul className="how-list">
            <li>
              <strong>Self-pay path:</strong> Day-1 cost equals the full workshop repair quote.
            </li>
            <li>
              <strong>Claim path:</strong> Day-1 cost equals your standard excess plus any
              applicable non-authorised workshop or young-driver surcharge.
            </li>
          </ul>
        </article>

        <article className="how-step">
          <span className="step-badge tabular-nums">02</span>
          <h2>Multi-year NCD trajectory (Years 1–5)</h2>
          <p>
            Under Singapore General Insurance Association (GIA) standards, a single at-fault claim
            triggers a <strong>30 percentage point NCD step-down</strong> (for example, 50% drops
            to 20% at next renewal).
          </p>
          <ul className="how-list">
            <li>
              <strong>Self-pay path:</strong> Preserves your 50% discount across renewals (unless a
              third party claims against your policy).
            </li>
            <li>
              <strong>Claim path:</strong> Pays higher renewal premiums while recovering +10% NCD
              per claim-free year (20% → 30% → 40% → 50%).
            </li>
          </ul>
        </article>

        <article className="how-step">
          <span className="step-badge tabular-nums">03</span>
          <h2>Discounted break-even threshold</h2>
          <p>
            The break-even repair cost is the exact workshop quote where both paths have equal
            present-value cost:
          </p>
          <div className="formula-box tabular-nums">
            Break-even = Effective excess + PV(Claim renewals − Self-pay renewals)
          </div>
          <p>
            When your workshop quote is <strong>below</strong> this figure, self-paying saves
            money. When it is <strong>above</strong>, filing a claim is more cost-effective.
          </p>
        </article>
      </div>

      {/* Worked Example Card */}
      <div className="worked-example-card">
        <div className="worked-example-header">
          <div>
            <h2>Worked example: S$1,200 repair quote at 50% NCD</h2>
            <p>
              Based on a S$1,650 current annual premium (S$3,300 gross base premium), S$600 policy
              excess, 5% annual base growth, and 3% discount rate over 3 years.
            </p>
          </div>
        </div>

        <dl className="worked-example-grid tabular-nums">
          <div>
            <dt>Effective policy excess</dt>
            <dd>S$600</dd>
            <small>Paid on Day 1 if claiming at an authorised workshop</small>
          </div>
          <div>
            <dt>3-year NCD penalty (PV)</dt>
            <dd>+S$2,045</dd>
            <small>Discounted extra premiums while recovering 20% → 30% → 40%</small>
          </div>
          <div>
            <dt>Break-even repair quote</dt>
            <dd>S$2,645</dd>
            <small>S$600 excess + S$2,045 discounted renewal penalty</small>
          </div>
          <div>
            <dt>Net savings from self-pay</dt>
            <dd className="is-highlight">S$1,445</dd>
            <small>S$2,645 break-even minus S$1,200 repair bill</small>
          </div>
        </dl>
      </div>

      {/* GIA Framework Guidelines */}
      <div className="source-panel">
        <div className="source-panel-copy">
          <div className="section-kicker is-inverse">Regulatory compliance</div>
          <h2>GIA Motor Claims Framework (MCF)</h2>
          <p>
            In Singapore, motorists are required to report all accidents to their insurer within 24
            hours or by the next working day with the vehicle inspected at an approved reporting
            centre.
          </p>
          <p>
            <strong>Reporting is not claiming:</strong> Lodging the mandatory 24-hour incident
            report preserves your policy rights while leaving you free to settle repairs privately.
          </p>
        </div>
        <div className="source-panel-aside">
          <Link className="button button-primary button-large" href="/calculator">
            Run your own numbers <span aria-hidden="true">→</span>
          </Link>
          <Link className="button button-inverse-ghost" href="/rules">
            View insurer NCD tables
          </Link>
        </div>
      </div>
    </section>
  );
}
