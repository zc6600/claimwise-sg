import ToolPageShell from "../../../components/tools/ToolPageShell";
import CoeRenewalTool from "../../../components/tools/CoeRenewalTool";

export const metadata = {
  title: "COE Renewal Calculator",
  description: "Compare the yearly cost of a 5-year renewal, a 10-year renewal, and replacing the car, including rebates and road tax surcharges.",
  alternates: { canonical: "/tools/coe-renewal" },
};

export default function Page() {
  return (
    <ToolPageShell
      kicker="COE decision"
      title="Renew your COE, or replace the car?"
      lead="Compare the yearly cost of a 5-year renewal, a 10-year renewal, and replacing the car, including rebates and road tax surcharges."
      method={[
        "A 5-year renewal costs 50% of the PQP, rounded up to the dollar. A 10-year renewal costs the full PQP.",
        "Cars can take a 5-year renewal only once, and must then be deregistered.",
        "PARF rebates end once a car is more than 10 years old. COE rebates are pro-rated over the unused months.",
        "Road tax surcharges rise from 10% to 50% as the car passes 10 to 14 years old.",
        "Options last different lengths, so each cost is converted to a level yearly figure at a 3% discount rate.",
      ]}
      sources={[
        { label: "LTA: COE renewal", href: "https://onemotoring.lta.gov.sg/content/onemotoring/home/owning/coe-renewal.html" },
        { label: "LTA: PARF and COE rebates", href: "https://onemotoring.lta.gov.sg/content/onemotoring/home/buying/rebates/parf-coe-rebate.html" },
        { label: "LTA: Road tax", href: "https://onemotoring.lta.gov.sg/content/onemotoring/home/owning/ongoing-car-costs/road-tax.html" },
      ]}
    >
      <CoeRenewalTool />
    </ToolPageShell>
  );
}
