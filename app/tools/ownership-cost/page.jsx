import ToolPageShell from "../../../components/tools/ToolPageShell";
import OwnershipCostTool from "../../../components/tools/OwnershipCostTool";

export const metadata = {
  title: "True Cost of Owning a Car in Singapore",
  description:
    "Work out what a car really costs each month in Singapore: depreciation after COE and PARF, loan interest, road tax, insurance, fuel or charging, and parking.",
  alternates: { canonical: "/tools/ownership-cost" },
};

export default function Page() {
  return (
    <ToolPageShell
      kicker="Before you buy"
      title="What will this car really cost each month?"
      lead="Depreciation, loan interest, road tax, insurance, fuel, and parking in one monthly figure."
      method={[
        "Depreciation is the price less the car's value when you stop owning it, spread over the months you keep it.",
        "Without your own resale estimate, the end value is what deregistering would return: the PARF rebate for the car's age plus the COE rebate for unused months. A dealer may pay more.",
        "The loan is capped at the MAS limit: 70% of the price when OMV is S$20,000 or less, otherwise 60%, over at most 7 years. Selling early settles the loan with a Rule of 78 interest rebate; lender fees are left out.",
        "Road tax uses LTA's formulas: engine capacity for petrol cars, motor power plus a S$700 yearly flat component for electric cars, and the higher of the two for hybrids. Cars over 10 years old pay a 10% to 50% surcharge.",
        "Loan principal is not counted twice: it is part of the price, which depreciation already covers. Interest you could have earned on the down payment is left out.",
        "The defaults are examples, not market prices. Use your dealer quote and current pump or charging prices.",
      ]}
      sources={[
        { label: "LTA: Tax structure for cars (road tax, ARF, PARF)", href: "https://onemotoring.lta.gov.sg/content/onemotoring/home/buying/upfront-vehicle-costs/tax-structure.html" },
        { label: "MAS: Motor vehicle loans", href: "https://www.mas.gov.sg/regulation/explainers/motor-vehicle-loans" },
        { label: "LTA: Road tax", href: "https://onemotoring.lta.gov.sg/content/onemotoring/home/owning/ongoing-car-costs/road-tax.html" },
      ]}
    >
      <OwnershipCostTool />
    </ToolPageShell>
  );
}
