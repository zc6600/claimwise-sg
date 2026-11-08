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
        "Keeping the car gives up the value you could release today, so that value counts as a cost of both renewal options.",
        "Cash needed now for a replacement is its price less today's rebates and scrap value. The new car's resale value is credited when you sell it.",
        "Options last different lengths, so each cost is spread evenly over its own life at a 3% discount rate. This assumes you could make a similar choice again afterwards.",
        "The comparison covers private cars close to COE expiry and models no further renewal after the period shown.",
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
