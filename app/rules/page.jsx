import Link from "next/link";
import { INSURER_PROFILES } from "../../src/decision-data.mjs";
import { formatCurrency } from "../../src/formatters.mjs";

export const metadata = {
  title: "Insurer Rules & NCD Schedule",
  description:
    "Singapore motor insurer profiles, No Claims Discount (NCD) step-down schedule, and workshop/driver excess surcharges.",
};

export default function RulesPage() {
  return (
    <section className="rules-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Insurer rules</div>
          <h1>Singapore insurer rules & NCD schedule</h1>
        </div>
        <p>
          The excesses, surcharges, and NCD rules our calculators use for each insurer. Your own
          policy schedule takes priority.
        </p>
      </div>

      {/* 1. Insurer Comparison Matrix (shows actual differences across insurers!) */}
      <div className="table-card">
        <div className="card-heading">
          <div>
            <h2>Insurer profiles</h2>
            <p>
              While the −30% NCD step-down is standardised across Singapore, non-authorised
              workshop penalties, young-driver surcharges, and NCD Protector eligibility differ by
              insurer.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tabular-nums">
            <thead>
              <tr>
                <th>Insurer & plan</th>
                <th>NCD step-down</th>
                <th>Non-authorised workshop</th>
                <th>Young / inexperienced driver</th>
                <th>Windscreen excess</th>
                <th>NCD Protector tier</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(INSURER_PROFILES).map(([key, profile]) => (
                <tr key={key}>
                  <td>
                    <strong className="table-primary-cell">{profile.name}</strong>
                    <span className="table-sub-cell">{profile.planName}</span>
                  </td>
                  <td>−{profile.ncdDropPoints}%</td>
                  <td>+{formatCurrency(profile.unauthorizedWorkshopExcess)}</td>
                  <td>+{formatCurrency(profile.youngDriverExcess)}</td>
                  <td>{formatCurrency(profile.windscreenExcess)} (0% NCD loss)</td>
                  <td>From {profile.minNcdForProtector}% NCD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Standard GIA NCD Step-Down Schedule */}
      <div className="table-card">
        <div className="card-heading">
          <div>
            <h2>Standard GIA No Claims Discount (NCD) schedule</h2>
            <p>
              Applicable to private passenger cars registered with the Singapore Land Transport
              Authority (LTA). Each claim-free policy year restores 10 percentage points up to the
              50% cap.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tabular-nums">
            <thead>
              <tr>
                <th>Claim-free tenure</th>
                <th>Standard NCD</th>
                <th>After 1 at-fault claim (−30%)</th>
                <th>Renewal progression (Years 1 → 3)</th>
                <th>Claim-free renewals to restore 50%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 year</td>
                <td>10%</td>
                <td>0%</td>
                <td>0% → 10% → 20%</td>
                <td>5 renewals</td>
              </tr>
              <tr>
                <td>2 years</td>
                <td>20%</td>
                <td>0%</td>
                <td>0% → 10% → 20%</td>
                <td>5 renewals</td>
              </tr>
              <tr>
                <td>3 years</td>
                <td>30%</td>
                <td>0%</td>
                <td>0% → 10% → 20%</td>
                <td>5 renewals</td>
              </tr>
              <tr>
                <td>4 years</td>
                <td>40%</td>
                <td>10%</td>
                <td>10% → 20% → 30%</td>
                <td>4 renewals</td>
              </tr>
              <tr>
                <td>5+ years</td>
                <td>50%</td>
                <td>20%</td>
                <td>20% → 30% → 40%</td>
                <td>3 renewals</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Official Reference Links */}
      <div className="source-panel">
        <div className="source-panel-copy">
          <div className="section-kicker is-inverse">Official citations</div>
          <h2>Reference documentation & verification</h2>
          <p>
            Always cross-check your individual Policy Schedule and Certificate of Insurance before
            making a final settlement decision.
          </p>
          <div className="source-panel-cta">
            <Link className="button button-primary" href="/calculator">
              Open the claim calculator <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="source-links">
          <a
            href="https://gia.org.sg/motor-insurance/22-premium-renewal-of-policy/348-motor-claims-framework.html"
            target="_blank"
            rel="noreferrer"
          >
            <span>GIA · Motor Claims Framework (MCF)</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href="https://gia.org.sg/motor-insurance/21-buying-a-motor.html"
            target="_blank"
            rel="noreferrer"
          >
            <span>GIA · No Claims Discount (NCD) consumer guide</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href="https://www.msig.com.sg/personal/motormax"
            target="_blank"
            rel="noreferrer"
          >
            <span>Sample wording · MSIG MotorMax policy terms</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
