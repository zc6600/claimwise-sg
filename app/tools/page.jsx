import Link from "next/link";
import FeatureIcon from "../../components/tools/FeatureIcon";

export const metadata = {
  title: "Car Decision Tools",
  description:
    "Everything ClaimWise SG offers Singapore car owners: calculators for insurance renewals, car loans, COE expiry, and accidents, plus My Car reminders.",
  alternates: { canonical: "/tools" },
};

const CALCULATORS = [
  {
    href: "/tools/quote-compare",
    icon: "quotes",
    name: "Quote comparison",
    text: "At every renewal, find the quote that really costs least once excess, workshop terms, and the NCD you could lose are counted.",
    featured: true,
  },
  {
    href: "/tools/ncd-protector",
    icon: "protector",
    name: "NCD Protector",
    text: "Find out whether the rider on your renewal is worth its price.",
  },
  {
    href: "/tools/loan-prepayment",
    icon: "loan",
    name: "Car loan settlement",
    text: "Check whether settling your car loan early saves money.",
  },
  {
    href: "/tools/coe-renewal",
    icon: "coe",
    name: "COE renewal",
    text: "Weigh a 5-year or 10-year renewal against replacing the car.",
  },
  {
    href: "/calculator",
    icon: "claim",
    name: "Claim or self-pay",
    text: "After an accident, see whether claiming or paying the workshop costs less.",
  },
];

const MORE = [
  { href: "/my-car", icon: "car", name: "My Car", text: "Save your figures and get reminders." },
  { href: "/accident", icon: "emergency", name: "After an accident", text: "What to do, claim or not, and settling." },
  { href: "/rules", icon: "rules", name: "Insurer rules", text: "Excesses, NCD terms, and policy wordings." },
  { href: "/how-it-works", icon: "settlement", name: "How it works", text: "How the claim calculator reaches its answer." },
];

export default function ToolsPage() {
  return (
    <div className="features-page section-pad">
      <header className="features-header">
        <div className="section-kicker">Car tools</div>
        <h1>Everything ClaimWise can do</h1>
        <p>Free, independent tools for the money decisions of owning a car in Singapore.</p>
      </header>

      <section aria-labelledby="calculators-title">
        <h2 className="features-heading" id="calculators-title">Calculators</h2>
        <ul className="feature-grid is-calculators">
          {CALCULATORS.map((item) => (
            <li key={item.href} className={item.featured ? "is-featured" : undefined}>
              <Link className={`feature-card${item.featured ? " is-featured" : ""}`} href={item.href}>
                <span className="feature-title">
                  <span className="feature-icon-tile">
                    <FeatureIcon name={item.icon} />
                  </span>
                  <strong>{item.name}</strong>
                </span>
                <span className="feature-text">{item.text}</span>
                {item.featured ? (
                  <span className="feature-open">
                    Open the calculator <span aria-hidden="true">→</span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="more-title">
        <h2 className="features-heading" id="more-title">More for car owners</h2>
        <ul className="feature-grid is-compact">
          {MORE.map((item) => (
            <li key={item.href}>
              <Link className="feature-card is-compact" href={item.href}>
                <span className="feature-icon-tile">
                  <FeatureIcon name={item.icon} />
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <span className="feature-text">{item.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
