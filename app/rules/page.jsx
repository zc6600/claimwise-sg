import Link from "next/link";
import { INSURER_PROFILES } from "../../src/decision-data.mjs";
import { formatCurrency } from "../../src/formatters.mjs";
import {
  INSURERS_WITHOUT_WORDING,
  POLICY_WORDINGS,
  WORDINGS_REVIEWED_ON,
  WORDING_TOPICS,
  topicComparisonPath,
  wordingTopicPath,
} from "../../src/policy-wordings.mjs";
import { WordingCell } from "../../components/rules/Wording";
import JsonLd from "../../components/JsonLd";
import { SITE_URL } from "../../lib/site-url";
import { wordingPageGraph } from "../../src/structured-data.mjs";

export const metadata = {
  title: "Insurer Rules: Policy Wording As Written",
  description:
    "Verbatim excerpts from Singapore motor policy wordings on excess, workshops, young drivers, windscreen claims, NCD and NCD Protector, each linked to the source page.",
  alternates: { canonical: "/rules" },
};

const NCD_RECOVERY_ROWS = [
  ["1 year", "10%", "0%", "0% → 10% → 20%", "5 renewals"],
  ["2 years", "20%", "0%", "0% → 10% → 20%", "5 renewals"],
  ["3 years", "30%", "0%", "0% → 10% → 20%", "5 renewals"],
  ["4 years", "40%", "10%", "10% → 20% → 30%", "4 renewals"],
  ["5+ years", "50%", "20%", "20% → 30% → 40%", "3 renewals"],
];

export default function RulesPage() {
  return (
    <section className="rules-page section-pad">
      <JsonLd
        data={wordingPageGraph(SITE_URL, {
          path: "/rules",
          headline: "Singapore car insurance policy wording, as written",
          description: metadata.description,
          dateModified: WORDINGS_REVIEWED_ON,
          citations: POLICY_WORDINGS.map((wording) => ({
            name: `${wording.insurer} ${wording.document} (${wording.version})`,
            path: wording.pdfFile,
            publisher: wording.insurer,
          })),
          crumbs: [{ name: "Insurer rules", path: "/rules" }],
        })}
      />
      <div className="page-header">
        <div>
          <div className="section-kicker">Insurer rules</div>
          <h1>Policy wording, as written</h1>
        </div>
        <p>
          Word-for-word excerpts from each insurer’s published policy wording, linked to the page
          they come from. Amounts that vary by policy are printed on your own Schedule or
          Certificate of Insurance, which always takes priority.
        </p>
      </div>

      <div className="wording-coverage">
        <strong>Wordings on file:</strong>{" "}
        {POLICY_WORDINGS.map((wording, index) => (
          <span key={wording.id}>
            {index > 0 ? " · " : ""}
            <Link href={`/rules/${wording.id}`}>{wording.insurer}</Link>{" "}
            <a href={wording.pdfFile} target="_blank" rel="noreferrer">
              {wording.document} ({wording.version})
            </a>
          </span>
        ))}
        . Not yet on file: {INSURERS_WITHOUT_WORDING.join(", ")} and other Singapore motor insurers.
      </div>

      <nav className="wording-topic-nav" aria-label="Topics">
        {WORDING_TOPICS.map((topic) => (
          <a key={topic.id} href={`#${topic.id}`}>
            {topic.shortTitle}
          </a>
        ))}
      </nav>

      {WORDING_TOPICS.map((topic) => (
        <div className="table-card wording-topic" key={topic.id} id={topic.id}>
          <div className="card-heading">
            <h2>
              <Link href={topicComparisonPath(topic)}>{topic.title}</Link>
            </h2>
            <p>{topic.question}</p>
          </div>
          <div className="wording-grid">
            {POLICY_WORDINGS.map((wording) => (
              <WordingCell
                key={wording.id}
                wording={wording}
                entry={wording.entries[topic.id]}
                href={wordingTopicPath(wording, topic)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="table-card">
        <div className="card-heading">
          <h2>How NCD recovers after one claim</h2>
          <p>
            Worked from the scales quoted above, which match across every wording on file: one
            claim takes 50% to 20%, 40% to 10%, and 30% or less to 0%, and each claim-free year
            adds 10 points up to 50%. DirectAsia adds a 60% tier after five years at 50%.
          </p>
        </div>
        <div className="table-wrap">
          <table className="tabular-nums">
            <thead>
              <tr>
                <th>Claim-free tenure</th>
                <th>NCD</th>
                <th>After 1 claim</th>
                <th>Next three renewals</th>
                <th>Claim-free renewals to restore 50%</th>
              </tr>
            </thead>
            <tbody>
              {NCD_RECOVERY_ROWS.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card is-assumptions">
        <div className="card-heading">
          <h2>Calculator default assumptions</h2>
          <p>
            Starting values the calculators use when you have not entered your own. These are
            model inputs, not policy wording. Where they differ from the wording above, the wording
            and your Schedule apply.
          </p>
        </div>
        <div className="table-wrap">
          <table className="tabular-nums">
            <thead>
              <tr>
                <th>Insurer</th>
                <th>NCD drop</th>
                <th>Non-authorised workshop</th>
                <th>Young / inexperienced driver</th>
                <th>Windscreen excess</th>
                <th>NCD Protector from</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(INSURER_PROFILES).map(([key, profile]) => (
                <tr key={key}>
                  <td>
                    <strong className="table-primary-cell">{profile.name}</strong>
                    <span className="table-sub-cell">{profile.planName}</span>
                  </td>
                  <td>−{profile.ncdDropPoints} points</td>
                  <td>
                    {profile.workshopRule
                      ? "No surcharge; plan rule applies"
                      : `+${formatCurrency(profile.unauthorizedWorkshopExcess)} (assumed)`}
                  </td>
                  <td>
                    +{formatCurrency(profile.youngDriverExcess)} (under {profile.youngDriverAgeThreshold})
                  </td>
                  <td>{formatCurrency(profile.windscreenExcess)}</td>
                  <td>{profile.minNcdForProtector}% NCD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="source-panel">
        <div className="source-panel-copy">
          <div className="section-kicker is-inverse">Sources</div>
          <h2>Read the full documents</h2>
          <p>
            Check your own Policy Schedule and Certificate of Insurance before deciding whether to
            claim.
          </p>
          <div className="source-panel-cta">
            <Link className="button button-primary" href="/calculator">
              Open the claim calculator <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="source-links">
          {POLICY_WORDINGS.map((wording) => (
            <a key={wording.id} href={wording.pdfFile} target="_blank" rel="noreferrer">
              <span>
                {wording.insurer} · {wording.document}
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
          <a
            href="https://gia.org.sg/motor-insurance/22-premium-renewal-of-policy/348-motor-claims-framework.html"
            target="_blank"
            rel="noreferrer"
          >
            <span>GIA · Motor Claims Framework (MCF)</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
