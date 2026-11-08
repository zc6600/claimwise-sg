import Link from "next/link";
import ToolJourney, { buildToolExamples } from "../components/tools/ToolJourney";

export const metadata = {
  title: { absolute: "ClaimWise SG · Singapore Car Decision Tools" },
  description:
    "Independent calculators for Singapore car owners: claim or self-pay after an accident, NCD Protector, renewal quotes, COE renewal, and early car loan settlement.",
  alternates: { canonical: "/" },
};

const PRINCIPLES = [
  {
    title: "Independent",
    body: "We do not sell insurance or loans, so no answer is steered towards a product.",
  },
  {
    title: "Your own numbers",
    body: "Every tool runs on the premium, excess, and dates you enter, not on a typical driver.",
  },
  {
    title: "Methods in the open",
    body: "Each tool explains its formula and links to the official LTA, GIA, or lender rules.",
  },
];

export default function HomePage() {
  const examples = buildToolExamples();

  return (
    <div className="landing-page section-pad">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="section-kicker">Independent car money decisions · Singapore</div>
          <h1>Is this car cost worth paying?</h1>
          <p className="landing-lead">
            Free calculators for the money decisions of owning a car in Singapore: insurance
            renewals, car loans, COE expiry, and the occasional accident. No sign-up, no sales pitch.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary button-large" href="/tools">
              Browse car tools <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button-ghost button-large" href="/my-car">
              Set up My Car
            </Link>
          </div>
          <p className="landing-accident-link">
            Just had an accident? <Link href="/accident">See what to do now</Link>
          </p>
        </div>

        <aside className="landing-answers" aria-label="Example answers">
          <span className="landing-answers-kicker">Answers like these, in under a minute</span>
          <ul>
            {[
              ["NCD Protector?", examples.protector],
              ["Settle the car loan early?", examples.loan],
              ["Renew the COE?", examples.coe],
            ].map(([question, example]) => (
              <li key={question}>
                <span className="landing-answer-q">{question}</span>
                <strong>{example.answer}</strong>
                <span className="landing-answer-setup">{example.setup}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="landing-journey" aria-labelledby="journey-title">
        <div className="landing-section-head">
          <h2 id="journey-title">Pick the moment you are in</h2>
          <p>Each tool shows a worked example. Open it to run the same sums on your own car.</p>
        </div>
        <ToolJourney />
      </section>

      <section className="landing-mycar">
        <div>
          <span className="section-kicker">My Car</span>
          <h2>Never miss the next decision</h2>
          <p>
            Save your premium, NCD, and key dates once. The insurance tools prefill your
            figures, and we email you before each renewal, COE, or loan date comes round.
          </p>
        </div>
        <Link className="button button-primary button-large" href="/my-car">
          Set up My Car
        </Link>
      </section>

      <section className="principles-grid landing-principles" aria-label="Our approach">
        {PRINCIPLES.map((principle) => (
          <article className="principle-item" key={principle.title}>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
