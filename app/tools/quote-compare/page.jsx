import ToolPageShell from "../../../components/tools/ToolPageShell";
import QuoteComparisonTool from "../../../components/tools/QuoteComparisonTool";

export const metadata = {
  title: "Car Insurance Quote Comparison",
  description: "Compare renewal quotes on premium plus what an accident would really cost you, including excess, workshop surcharges, and NCD loss.",
  alternates: { canonical: "/tools/quote-compare" },
};

export default function Page() {
  return (
    <ToolPageShell
      kicker="Renewal decision"
      title="Is the cheaper quote really cheaper?"
      lead="Compare renewal quotes on premium plus what an accident would really cost you, including excess, workshop surcharges, and NCD loss."
      method={[
        "Expected cost equals the premium plus your chance of an at-fault accident multiplied by what one accident would cost you.",
        "After an accident you either pay the workshop yourself or claim. Claiming costs your effective excess, including any workshop surcharge you enter, plus the NCD loss on future renewals.",
        "We assume you take the cheaper route, so a low excess only helps when the repair bill is large enough to be worth claiming.",
        "The comparison covers at most one accident in the policy year. The NCD loss is the full future cost of that one claim, not a forecast of repeated accidents.",
        "NCD loss uses the same model as the claim calculator: five renewals at this quote's premium, 5% yearly premium growth, and a 3% discount rate.",
        "This compares cost only. Coverage limits and exclusions can differ between policies.",
      ]}
      sources={[]}
    >
      <QuoteComparisonTool />
    </ToolPageShell>
  );
}
