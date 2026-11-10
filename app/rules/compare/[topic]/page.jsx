import Link from "next/link";
import { notFound } from "next/navigation";
import {
  POLICY_WORDINGS,
  WORDINGS_REVIEWED_ON,
  WORDING_TOPICS,
  findTopicBySlug,
  topicComparisonPath,
  topicToolPath,
  wordingPageUrl,
  wordingTopicPath,
} from "../../../../src/policy-wordings.mjs";
import { Breadcrumbs, WordingCell } from "../../../../components/rules/Wording";
import JsonLd from "../../../../components/JsonLd";
import { SITE_URL } from "../../../../lib/site-url";
import { wordingPageGraph } from "../../../../src/structured-data.mjs";

export const dynamicParams = false;

export function generateStaticParams() {
  return WORDING_TOPICS.map((topic) => ({ topic: topic.slug }));
}

async function resolve(params) {
  const { topic: slug } = await params;
  const topic = findTopicBySlug(slug);
  if (!topic) notFound();
  return topic;
}

const insurerNames = POLICY_WORDINGS.map((wording) => wording.insurer).join(", ");

const describe = (topic) =>
  `${topic.question} Singapore car insurance policy wordings from ${insurerNames} compared side by side, quoted with page numbers.`;

export async function generateMetadata({ params }) {
  const topic = await resolve(params);
  return {
    title: `${topic.title} Compared Across Singapore Insurers`,
    description: describe(topic),
    alternates: { canonical: topicComparisonPath(topic) },
  };
}

export default async function TopicComparisonPage({ params }) {
  const topic = await resolve(params);
  const path = topicComparisonPath(topic);
  const crumbs = [
    { name: "Insurer rules", path: "/rules" },
    { name: topic.title, path },
  ];

  return (
    <section className="rules-page section-pad">
      <JsonLd
        data={wordingPageGraph(SITE_URL, {
          path,
          headline: `${topic.title} compared across Singapore insurers`,
          description: describe(topic),
          dateModified: WORDINGS_REVIEWED_ON,
          citations: POLICY_WORDINGS.map((wording) => ({
            name: `${wording.insurer} ${wording.document} (${wording.version})`,
            path: wordingPageUrl(wording, wording.entries[topic.id].page),
            publisher: wording.insurer,
          })),
          crumbs,
        })}
      />
      <Breadcrumbs crumbs={crumbs} />
      <div className="page-header">
        <div>
          <div className="section-kicker">Compare insurers</div>
          <h1>{topic.title}: what each policy says</h1>
        </div>
        <p>
          {topic.question} Each card quotes the insurer’s own wording and links to the page it
          comes from.
        </p>
      </div>

      <div className="table-card wording-topic">
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

      <div className="table-card">
        <div className="card-heading">
          <h2>Price it with your own figures</h2>
          <p>The wording sets the rule; the calculator shows what it costs you.</p>
        </div>
        <Link className="button button-primary" href={topicToolPath(topic)}>
          {topic.id === "ncdProtector" ? "Open the NCD Protector calculator" : "Open the claim calculator"}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="table-card">
        <div className="card-heading">
          <h2>Other topics</h2>
        </div>
        <ul className="rules-link-list">
          {WORDING_TOPICS.filter((other) => other.id !== topic.id).map((other) => (
            <li key={other.id}>
              <Link href={topicComparisonPath(other)}>{other.title}</Link>
              <span>{other.question}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
