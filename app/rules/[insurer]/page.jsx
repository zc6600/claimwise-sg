import Link from "next/link";
import { notFound } from "next/navigation";
import {
  POLICY_WORDINGS,
  WORDINGS_REVIEWED_ON,
  WORDING_TOPICS,
  findWording,
  topicComparisonPath,
  wordingTopicPath,
} from "../../../src/policy-wordings.mjs";
import { Breadcrumbs, WordingCell } from "../../../components/rules/Wording";
import JsonLd from "../../../components/JsonLd";
import { SITE_URL } from "../../../lib/site-url";
import { wordingPageGraph } from "../../../src/structured-data.mjs";

export const dynamicParams = false;

export function generateStaticParams() {
  return POLICY_WORDINGS.map((wording) => ({ insurer: wording.id }));
}

async function resolve(params) {
  const { insurer } = await params;
  const wording = findWording(insurer);
  if (!wording) notFound();
  return wording;
}

const describe = (wording) =>
  `What the ${wording.insurer} ${wording.document} (${wording.version}) says on excess, workshops, young drivers, windscreen claims, NCD after a claim and the NCD Protector, quoted with page numbers.`;

export async function generateMetadata({ params }) {
  const wording = await resolve(params);
  return {
    title: `${wording.insurer} Car Insurance Rules`,
    description: describe(wording),
    alternates: { canonical: `/rules/${wording.id}` },
  };
}

export default async function InsurerRulesPage({ params }) {
  const wording = await resolve(params);
  const crumbs = [
    { name: "Insurer rules", path: "/rules" },
    { name: wording.insurer, path: `/rules/${wording.id}` },
  ];

  return (
    <section className="rules-page section-pad">
      <JsonLd
        data={wordingPageGraph(SITE_URL, {
          path: `/rules/${wording.id}`,
          headline: `${wording.insurer} car insurance rules`,
          description: describe(wording),
          dateModified: WORDINGS_REVIEWED_ON,
          citations: [
            {
              name: `${wording.insurer} ${wording.document} (${wording.version})`,
              path: wording.pdfFile,
              publisher: wording.insurer,
            },
          ],
          crumbs,
        })}
      />
      <Breadcrumbs crumbs={crumbs} />
      <div className="page-header">
        <div>
          <div className="section-kicker">Insurer rules</div>
          <h1>{wording.insurer} car insurance rules</h1>
        </div>
        <p>
          Word-for-word excerpts from the{" "}
          <a href={wording.pdfFile} target="_blank" rel="noreferrer">
            {wording.document} ({wording.version})
          </a>
          , linked to the page each comes from. Your own Schedule or Certificate of Insurance takes
          priority.
        </p>
      </div>

      <div className="wording-grid">
        {WORDING_TOPICS.map((topic) => (
          <WordingCell
            key={topic.id}
            wording={wording}
            entry={wording.entries[topic.id]}
            title={topic.title}
            href={wordingTopicPath(wording, topic)}
          />
        ))}
      </div>

      <div className="table-card rules-other-insurers">
        <div className="card-heading">
          <h2>Compare with other insurers</h2>
        </div>
        <ul className="rules-link-list">
          {WORDING_TOPICS.map((topic) => (
            <li key={topic.id}>
              <Link href={topicComparisonPath(topic)}>{topic.title}</Link>
              <span>{topic.question}</span>
            </li>
          ))}
          {POLICY_WORDINGS.filter((other) => other.id !== wording.id).map((other) => (
            <li key={other.id}>
              <Link href={`/rules/${other.id}`}>{other.insurer}</Link>
              <span>{other.document}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
