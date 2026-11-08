import Link from "next/link";

export const metadata = {
  title: "Car Decision Tools",
  description:
    "Everything ClaimWise SG offers Singapore car owners: five calculators, plus My Car reminders, an accident emergency kit, a private settlement agreement, and insurer rules.",
  alternates: { canonical: "/tools" },
};

const GROUPS = [
  {
    title: "Calculators",
    items: [
      { href: "/calculator", name: "Claim or self-pay", text: "Whether to claim on insurance or pay the workshop yourself after an accident." },
      { href: "/tools/ncd-protector", name: "NCD Protector", text: "Whether the NCD Protector rider is worth its price." },
      { href: "/tools/quote-compare", name: "Quote comparison", text: "Which renewal quote is cheapest once excess and NCD loss count." },
      { href: "/tools/loan-prepayment", name: "Car loan settlement", text: "Whether settling your car loan early saves money." },
      { href: "/tools/coe-renewal", name: "COE renewal", text: "Whether to renew the COE for 5 or 10 years, or replace the car." },
    ],
  },
  {
    title: "Other features",
    items: [
      { href: "/my-car", name: "My Car", text: "Save your policy figures and key dates, and get email reminders." },
      { href: "/emergency", name: "Emergency kit", text: "An offline checklist for the scene of an accident." },
      { href: "/settlement", name: "Private settlement", text: "A printable agreement for settling a minor accident without insurance." },
      { href: "/rules", name: "Insurer rules", text: "Excesses, NCD terms, and policy wordings by insurer." },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="landing-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Car tools</div>
          <h1>All features</h1>
        </div>
      </div>

      {GROUPS.map((group, index) => (
        <section className="tool-list-group" key={group.title} aria-labelledby={`group-${index}`}>
          <h2 id={`group-${index}`}>{group.title}</h2>
          <ul className="tool-list">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link className="tool-list-row" href={item.href}>
                  <strong>{item.name}</strong>
                  <span>{item.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
