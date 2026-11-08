import Link from "next/link";

export const metadata = {
  title: "How It Works",
  description:
    "Learn how ClaimWise SG models motor insurance claim decisions, NCD step-downs, and break-even repair costs in Singapore.",
};

export default function HowItWorksPage() {
  return (
    <section className="how-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Claim or self-pay</div>
          <h1>How the claim calculator works</h1>
        </div>
        <p>
          It compares what you pay now with the extra premiums you would pay over the next few
          years after losing your No Claims Discount.
        </p>
      </div>

      <div className="how-grid">
        <article className="how-step">
          <span className="step-badge tabular-nums">01</span>
          <h2>What you pay now</h2>
          <p>
            Pay the workshop bill yourself, or claim and pay your excess plus any non-authorised
            workshop or young-driver surcharge.
          </p>
        </article>

        <article className="how-step">
          <span className="step-badge tabular-nums">02</span>
          <h2>What you pay at renewal</h2>
          <p>
            An at-fault claim cuts your NCD by <strong>30 points</strong> (50% to 20%), and it
            recovers 10 points each claim-free year. Paying yourself keeps your NCD, unless the
            other driver claims against you.
          </p>
        </article>

        <article className="how-step">
          <span className="step-badge tabular-nums">03</span>
          <h2>The break-even repair cost</h2>
          <div className="formula-box tabular-nums">
            Break-even = Excess + PV(extra renewal premiums)
          </div>
          <p>
            Below this repair cost, paying yourself is cheaper. Above it, claiming is.
          </p>
        </article>
      </div>

      <div className="worked-example-card">
        <div className="worked-example-header">
          <div>
            <h2>Worked example: S$1,200 repair at 50% NCD</h2>
            <p>
              S$1,650 premium, S$600 excess, 5% yearly premium growth, 3% discount rate, 3 years.
            </p>
          </div>
        </div>

        <dl className="worked-example-grid tabular-nums">
          <div>
            <dt>Excess if you claim</dt>
            <dd>S$600</dd>
          </div>
          <div>
            <dt>Extra premiums (present value)</dt>
            <dd>+S$2,045</dd>
            <small>While NCD recovers 20% → 30% → 40%</small>
          </div>
          <div>
            <dt>Break-even repair cost</dt>
            <dd>S$2,645</dd>
            <small>S$600 + S$2,045</small>
          </div>
          <div>
            <dt>Saved by paying yourself</dt>
            <dd className="is-highlight">S$1,445</dd>
            <small>S$2,645 − S$1,200</small>
          </div>
        </dl>
      </div>

      <div className="source-panel is-compact">
        <div className="source-panel-copy">
          <div className="section-kicker is-inverse">Reporting rules</div>
          <p>
            Report every accident to your insurer within 24 hours, or by the next working day,
            even if you will not claim. <strong>Reporting is not claiming.</strong>
          </p>
        </div>
        <div className="source-panel-aside">
          <Link className="button button-primary" href="/calculator">
            Run your own numbers <span aria-hidden="true">→</span>
          </Link>
          <Link className="button button-inverse-ghost" href="/rules">
            Insurer NCD tables
          </Link>
        </div>
      </div>
    </section>
  );
}
