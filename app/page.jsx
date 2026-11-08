import Link from "next/link";
import { calculateDecision } from "../src/decision-engine.mjs";
import { formatCurrency } from "../src/formatters.mjs";
import { evaluateNcdProtector } from "../src/car-decisions/ncd-protector.mjs";
import { compareQuotes } from "../src/car-decisions/quote-comparison.mjs";
import { compareCoeOptions, COE_RENEWAL_DEFAULTS } from "../src/car-decisions/coe-renewal.mjs";
import {
  evaluateLoanPrepayment,
  LOAN_PREPAYMENT_DEFAULTS,
} from "../src/car-decisions/loan-prepayment.mjs";

export const metadata = {
  title: { absolute: "ClaimWise SG · Singapore Car Decision Tools" },
  description:
    "Independent calculators for Singapore car owners: claim or self-pay after an accident, NCD Protector, renewal quotes, COE renewal, and early car loan settlement.",
  alternates: { canonical: "/" },
};

/**
 * Worked examples are produced by the same engines the tools use, so the figures on
 * this page always match what a visitor would get with the stated inputs.
 */
function buildExamples() {
  const claim = calculateDecision({
    insurer: "other",
    currentPremium: 1650,
    currentNcd: 50,
    excess: 600,
    repairCost: 1500,
    horizonYears: 3,
  });

  const protector = evaluateNcdProtector({
    currentPremium: 1200,
    currentNcd: 50,
    protectorCost: 80,
    claimProbabilityPct: 5,
  });

  const quotes = compareQuotes({
    currentNcd: 50,
    incidentProbabilityPct: 10,
    typicalRepairCost: 2500,
    quotes: [
      { label: "S$1,150 quote", premium: 1150, excess: 1500 },
      { label: "S$1,240 quote", premium: 1240, excess: 500 },
    ],
  });

  const coe = compareCoeOptions(COE_RENEWAL_DEFAULTS);
  const coeBest = coe.options.find((option) => option.id === coe.bestOptionId);

  const loan = evaluateLoanPrepayment(LOAN_PREPAYMENT_DEFAULTS);

  return {
    claim: {
      setup: "S$1,650 premium · 50% NCD · S$600 excess",
      answer: `Self-pay any repair below ${formatCurrency(claim.baseScenario.breakEvenRepairCost)}`,
    },
    protector: {
      setup: "S$1,200 premium · 50% NCD · S$80 rider",
      answer:
        protector.claimEveryYears === null
          ? "The rider does not pay for itself"
          : `Worth it if you claim at least once every ${Math.max(1, Math.floor(protector.claimEveryYears))} years`,
    },
    quotes: {
      setup: "S$1,150 with S$1,500 excess vs. S$1,240 with S$500 · 10% accident chance",
      answer: quotes.lowestPremiumIsBest
        ? "The cheaper premium wins once NCD loss is counted"
        : `The ${quotes.bestLabel} saves ${formatCurrency(quotes.expectedSavingVsLowestPremium)} a year`,
    },
    coe: {
      setup: "10-year-old car · S$100,000 PQP",
      answer: `${coeBest.label}: ${formatCurrency(coeBest.annualCost)} a year`,
    },
    loan: {
      setup: "S$80,000 at 2.78% flat · 3 of 7 years paid",
      answer:
        loan.breakEvenReturnPct === null
          ? "Settling costs more than continuing"
          : `Settle unless your cash earns over ${loan.breakEvenReturnPct}%`,
    },
  };
}

const STAGES = [
  {
    id: "accident",
    step: "01",
    title: "After an accident",
    tools: [
      {
        href: "/calculator",
        example: "claim",
        title: "Claim or self-pay?",
        summary: "Compare the repair bill with the multi-year cost of losing your NCD.",
        featured: true,
      },
    ],
  },
  {
    id: "renewal",
    step: "02",
    title: "Every renewal",
    tools: [
      {
        href: "/tools/ncd-protector",
        example: "protector",
        title: "Is the NCD Protector worth it?",
        summary: "Find the claim risk at which the rider pays for itself.",
      },
      {
        href: "/tools/quote-compare",
        example: "quotes",
        title: "Is the cheaper quote really cheaper?",
        summary: "Weigh each premium against what an accident would really cost you.",
      },
    ],
  },
  {
    id: "loan",
    step: "03",
    title: "During your loan",
    tools: [
      {
        href: "/tools/loan-prepayment",
        example: "loan",
        title: "Settle your car loan early?",
        summary: "Estimate settlement after the Rule of 78 rebate, fees, and lost returns.",
      },
    ],
  },
  {
    id: "coe",
    step: "04",
    title: "Before COE expiry",
    tools: [
      {
        href: "/tools/coe-renewal",
        example: "coe",
        title: "Renew the COE or replace the car?",
        summary: "Compare yearly costs across 5-year, 10-year renewal and replacement.",
      },
    ],
  },
];

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

function ToolCard({ tool, example }) {
  return (
    <Link className={`landing-tool${tool.featured ? " is-featured" : ""}`} href={tool.href}>
      <h3>{tool.title}</h3>
      <p>{tool.summary}</p>
      <div className="landing-example">
        <span className="landing-example-setup">Example · {example.setup}</span>
        <strong>{example.answer}</strong>
      </div>
      <span className="landing-tool-cta">
        Use your numbers <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  const examples = buildExamples();

  return (
    <div className="landing-page section-pad">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="section-kicker">Independent car money decisions · Singapore</div>
          <h1>Is this car cost worth paying?</h1>
          <p className="landing-lead">
            Five free calculators for the expensive moments of owning a car in Singapore, from a
            scraped bumper to COE expiry. No sign-up, no sales pitch.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary button-large" href="/calculator">
              Just had an accident? <span aria-hidden="true">→</span>
            </Link>
            <a className="button button-ghost button-large" href="#tools">
              Browse all tools
            </a>
          </div>
        </div>

        <aside className="landing-answers" aria-label="Example answers">
          <span className="landing-answers-kicker">Answers like these, in under a minute</span>
          <ul>
            {[
              ["Claim or self-pay?", examples.claim],
              ["NCD Protector?", examples.protector],
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

      <section id="tools" className="landing-journey" aria-labelledby="journey-title">
        <div className="landing-section-head">
          <h2 id="journey-title">Pick the moment you are in</h2>
          <p>Each tool shows a worked example. Open it to run the same sums on your own car.</p>
        </div>

        <ol className="landing-stages">
          {STAGES.map((stage) => (
            <li className={`landing-stage stage-${stage.id}`} key={stage.id}>
              <div className="landing-stage-head">
                <span className="landing-stage-step tabular-nums">{stage.step}</span>
                <h2>{stage.title}</h2>
              </div>
              <div className="landing-stage-tools">
                {stage.tools.map((tool) => (
                  <ToolCard key={tool.href} tool={tool} example={examples[tool.example]} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-mycar">
        <div>
          <span className="section-kicker">My Car</span>
          <h2>Never miss the next decision</h2>
          <p>
            Save your renewal, COE, and loan dates once. The tools prefill your figures, and we
            email you before each date comes round.
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
