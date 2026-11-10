import Link from "next/link";
import { notFound } from "next/navigation";
import {
  POLICY_WORDINGS,
  WORDINGS_REVIEWED_ON,
  WORDING_TOPICS,
  findTopicBySlug,
  findWording,
  topicComparisonPath,
  topicToolPath,
  wordingPageUrl,
  wordingTopicPath,
} from "../../../../src/policy-wordings.mjs";
import { Breadcrumbs, SourceLink, WordingBody } from "../../../../components/rules/Wording";
import JsonLd from "../../../../components/JsonLd";
import { SITE_URL } from "../../../../lib/site-url";
import { wordingPageGraph } from "../../../../src/structured-data.mjs";

export const dynamicParams = false;

export function generateStaticParams() {
  return POLICY_WORDINGS.flatMap((wording) =>
    WORDING_TOPICS.map((topic) => ({ insurer: wording.id, topic: topic.slug }))
  );
}

async function resolve(params) {
  const { insurer, topic: slug } = await params;
  const wording = findWording(insurer);
  const topic = findTopicBySlug(slug);
  if (!wording || !topic) notFound();
  return { wording, topic, entry: wording.entries[topic.id] };
}

function describe(wording, topic, entry) {
  const where = entry.page ? `, PDF page ${entry.page}` : "";
  return `${topic.question} ${entry.summary}. Quoted from the ${wording.insurer} ${wording.document} (${wording.version})${where}.`;
}

export async function generateMetadata({ params }) {
  const { wording, topic, entry } = await resolve(params);
  return {
    title: `${wording.insurer} ${topic.shortTitle}: Policy Wording`,
    description: describe(wording, topic, entry),
    alternates: { canonical: wordingTopicPath(wording, topic) },
  };
}

function toolLink(wording, topic) {
  const path = topicToolPath(topic);
  return wording.calculatorInsurer ? `${path}?insurer=${wording.calculatorInsurer}` : path;
}

export default async function WordingTopicPage({ params }) {
  const { wording, topic, entry } = await resolve(params);
  const path = wordingTopicPath(wording, topic);
  const crumbs = [
    { name: "Insurer rules", path: "/rules" },
    { name: wording.insurer, path: `/rules/${wording.id}` },
    { name: topic.shortTitle, path },
  ];
  const others = POLICY_WORDINGS.filter((other) => other.id !== wording.id);

  return (
    <section className="rules-page section-pad">
      <JsonLd
        data={wordingPageGraph(SITE_URL, {
          path,
          headline: `${wording.insurer}: ${topic.title}`,
          description: describe(wording, topic, entry),
          dateModified: WORDINGS_REVIEWED_ON,
          citations: [
            {
              name: `${wording.insurer} ${wording.document} (${wording.version})`,
              path: wordingPageUrl(wording, entry.page),
              publisher: wording.insurer,
            },
          ],
          crumbs,
        })}
      />
      <Breadcrumbs crumbs={crumbs} />
      <div className="page-header">
        <div>
          <div className="section-kicker">{wording.insurer} · {topic.shortTitle}</div>
          <h1>
            {wording.insurer}: {topic.title}
          </h1>
        </div>
        <p>
          {topic.question} <strong>{entry.summary}.</strong>
        </p>
      </div>

      <div className={`table-card wording-single${entry.excerpt ? "" : " is-missing"}`}>
        <div className="wording-cell-head">
          <strong>
            {wording.document} · {wording.version}
          </strong>
          <SourceLink wording={wording} entry={entry} />
        </div>
        <div className="wording-details-body">
          <WordingBody wording={wording} entry={entry} />
        </div>
        <p className="wording-note">
          Copied word for word from the insurer’s published wording. Amounts that vary by policy
          are printed on your own Schedule or Certificate of Insurance, which takes priority.
        </p>
      </div>

      <div className="table-card">
        <div className="card-heading">
          <h2>Price this rule with your own figures</h2>
          <p>
            {topic.id === "ncdProtector"
              ? "Work out the claim risk at which the rider pays for itself, using your renewal premium."
              : "Compare claiming with paying the workshop yourself, counting excess and NCD loss over future renewals."}
          </p>
        </div>
        <Link className="button button-primary" href={toolLink(wording, topic)}>
          {topic.id === "ncdProtector" ? "Open the NCD Protector calculator" : "Open the claim calculator"}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="table-card">
        <div className="card-heading">
          <h2>Other insurers: {topic.shortTitle}</h2>
          <p>
            <Link href={topicComparisonPath(topic)}>Compare every wording side by side</Link>
          </p>
        </div>
        <ul className="rules-link-list">
          {others.map((other) => (
            <li key={other.id}>
              <Link href={wordingTopicPath(other, topic)}>{other.insurer}</Link>
              <span>{other.entries[topic.id].summary}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="table-card">
        <div className="card-heading">
          <h2>More {wording.insurer} rules</h2>
        </div>
        <ul className="rules-link-list">
          {WORDING_TOPICS.filter((other) => other.id !== topic.id).map((other) => (
            <li key={other.id}>
              <Link href={wordingTopicPath(wording, other)}>{other.title}</Link>
              <span>{wording.entries[other.id].summary}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
