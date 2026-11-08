import Link from "next/link";

export const metadata = {
  title: "Car Decision Tools",
  description:
    "Everything ClaimWise SG offers Singapore car owners: five calculators, plus My Car reminders, an accident emergency kit, a private settlement agreement, and insurer rules.",
  alternates: { canonical: "/tools" },
};

// Stroke icons drawn on a 24 x 24 grid.
const ICONS = {
  claim: "M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z M9.5 12.5l1.8 1.8 3.7-3.8",
  protector: "M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z M12 8v4 M12 15h.01",
  quotes: "M12 4v16 M7 20h10 M5 8h14 M5 8l-2.5 6a2.5 2.5 0 005 0L5 8z M19 8l-2.5 6a2.5 2.5 0 005 0L19 8z",
  loan: "M4 7h16v12H4z M4 11h16 M8 15h3 M7 4h10",
  coe: "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M9 15l2 2 4-4",
  car: "M5 16V12l2-5h10l2 5v4 M3 16h18 M5 12h14 M7 16v2 M17 16v2",
  emergency: "M12 4l9 16H3L12 4z M12 10v4 M12 17h.01",
  settlement: "M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h4",
  rules: "M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z M5 17a3 3 0 013-3h11 M9 8h6",
};

const CALCULATORS = [
  {
    href: "/calculator",
    icon: "claim",
    name: "Claim or self-pay",
    text: "After an accident, see whether claiming on insurance or paying the workshop costs less, including the NCD you would lose over the next few years.",
    featured: true,
  },
  {
    href: "/tools/ncd-protector",
    icon: "protector",
    name: "NCD Protector",
    text: "Find out whether the rider on your renewal is worth its price.",
  },
  {
    href: "/tools/quote-compare",
    icon: "quotes",
    name: "Quote comparison",
    text: "Compare renewal quotes once excess and NCD loss are counted.",
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
];

const MORE = [
  { href: "/my-car", icon: "car", name: "My Car", text: "Save your figures and get reminders." },
  { href: "/emergency", icon: "emergency", name: "Emergency kit", text: "Offline checklist for the accident scene." },
  { href: "/settlement", icon: "settlement", name: "Private settlement", text: "A printable agreement to settle privately." },
  { href: "/rules", icon: "rules", name: "Insurer rules", text: "Excesses, NCD terms, and policy wordings." },
];

function Icon({ name }) {
  return (
    <svg
      className="feature-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

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
                <span className="feature-icon-tile">
                  <Icon name={item.icon} />
                </span>
                <strong>{item.name}</strong>
                <span className="feature-text">{item.text}</span>
                <span className="feature-open">
                  Open <span aria-hidden="true">→</span>
                </span>
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
                  <Icon name={item.icon} />
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
