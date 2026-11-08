import Link from "next/link";
import { TOOL_STAGES } from "../../components/tools/ToolJourney";

export const metadata = {
  title: "Car Decision Tools",
  description:
    "Five independent calculators for Singapore car owners: claim or self-pay, NCD Protector, renewal quotes, car loan settlement, and COE renewal.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  const tools = TOOL_STAGES.flatMap((stage) =>
    stage.tools.map((tool) => ({ ...tool, stage: stage.title }))
  );

  return (
    <div className="landing-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Car tools</div>
          <h1>All tools</h1>
        </div>
        <p>Free calculators for the expensive decisions in Singapore car ownership.</p>
      </div>

      <ul className="tool-list">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link className="tool-list-row" href={tool.href}>
              <span className="tool-list-stage">{tool.stage}</span>
              <span className="tool-list-text">
                <strong>{tool.title}</strong>
                <span>{tool.summary}</span>
              </span>
              <span className="tool-list-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
