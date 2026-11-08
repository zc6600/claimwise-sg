import Link from "next/link";

export const metadata = {
  title: "Singapore Car Decision Tools",
  description:
    "Independent calculators for Singapore car owners: claim or self-pay, NCD Protector, renewal quotes, COE renewal, and early car loan settlement.",
  alternates: { canonical: "/tools" },
};

const TOOLS = [
  {
    href: "/calculator",
    stage: "After an accident",
    title: "Claim or self-pay?",
    summary: "Compare the repair bill with the multi-year cost of losing NCD.",
  },
  {
    href: "/tools/ncd-protector",
    stage: "At renewal",
    title: "Is the NCD Protector worth it?",
    summary: "Find the claim risk at which the rider pays for itself.",
  },
  {
    href: "/tools/quote-compare",
    stage: "At renewal",
    title: "Is the cheaper quote really cheaper?",
    summary: "Compare premiums with the excess you would actually pay.",
  },
  {
    href: "/tools/coe-renewal",
    stage: "Before COE expiry",
    title: "Renew the COE or replace the car?",
    summary: "Compare yearly costs across renewal and replacement.",
  },
  {
    href: "/tools/loan-prepayment",
    stage: "During your loan",
    title: "Should you settle your car loan early?",
    summary: "Estimate settlement after the rebate, fees, and investment returns.",
  },
];

export default function ToolsPage() {
  return (
    <section className="tool-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Independent car money decisions</div>
          <h1>Is this car cost worth paying?</h1>
        </div>
        <p>
          Clear answers for the expensive decisions in Singapore car ownership. We do not sell
          insurance or loans.
        </p>
      </div>

      <div className="tool-hub">
        {TOOLS.map((tool) => (
          <Link className="tool-hub-card" href={tool.href} key={tool.href}>
            <span className="section-kicker">{tool.stage}</span>
            <h2>{tool.title}</h2>
            <p>{tool.summary}</p>
          </Link>
        ))}
      </div>

      <div className="tool-hub-cta">
        <div>
          <h2>Never miss the next decision</h2>
          <p>Save your car’s key dates and get an email before each one.</p>
        </div>
        <Link className="button button-primary" href="/my-car">Set up My Car</Link>
      </div>
    </section>
  );
}
