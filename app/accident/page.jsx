import Link from "next/link";
import FeatureIcon from "../../components/tools/FeatureIcon";

export const metadata = {
  title: "After an Accident",
  description:
    "What to do after a minor car accident in Singapore: check whether to call the police, decide whether to claim, and settle privately with the other driver.",
  alternates: { canonical: "/accident" },
};

const STEPS = [
  {
    href: "/emergency",
    icon: "emergency",
    step: "1",
    when: "At the scene",
    name: "Emergency kit",
    text: "Check whether you must call the police, and what to photograph and write down. Works without reception once opened.",
    action: "Open the checklist",
  },
  {
    href: "/calculator",
    icon: "claim",
    step: "2",
    when: "Once you have a repair quote",
    name: "Claim or pay yourself?",
    text: "See whether claiming costs more than the repair once you count the NCD you would lose over the next few years.",
    action: "Compare the costs",
  },
  {
    href: "/settlement",
    icon: "settlement",
    step: "3",
    when: "If you settle with the other driver",
    name: "Private settlement",
    text: "If nobody was hurt and you both agree to settle without insurance, put what you agree in writing and both sign.",
    action: "Create the agreement",
  },
];

export default function AccidentPage() {
  return (
    <div className="features-page section-pad">
      <header className="features-header">
        <div className="section-kicker">After an accident</div>
        <h1>Had a minor accident?</h1>
        <p>
          Three steps for a minor accident in Singapore. If nobody is hurt, most can be sorted out
          without the police.
        </p>
      </header>

      <ol className="feature-grid accident-steps">
        {STEPS.map((item) => (
          <li key={item.href}>
            <Link className="feature-card" href={item.href}>
              <span className="feature-title">
                <span className="feature-icon-tile">
                  <FeatureIcon name={item.icon} />
                </span>
                <span>
                  <span className="accident-step-when">
                    Step {item.step} · {item.when}
                  </span>
                  <strong>{item.name}</strong>
                </span>
              </span>
              <span className="feature-text">{item.text}</span>
              <span className="feature-open">
                {item.action} <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="source-panel is-compact accident-reporting">
        <div className="source-panel-copy">
          <div className="section-kicker is-inverse">Within 24 hours</div>
          <p>
            Report every accident to your insurer within 24 hours, or by the next working day,
            even if you will not claim. <strong>Reporting is not claiming.</strong>
          </p>
        </div>
        <div className="source-panel-aside">
          <Link className="button button-inverse-ghost" href="/rules">
            Insurer rules
          </Link>
          <Link className="button button-inverse-ghost" href="/how-it-works">
            How the calculator works
          </Link>
        </div>
      </div>
    </div>
  );
}
