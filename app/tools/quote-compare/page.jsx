import ToolPageShell from "../../../components/tools/ToolPageShell";
import QuoteComparisonTool from "../../../components/tools/QuoteComparisonTool";

export const metadata = {
  title: "Car Insurance Quote Comparison",
  description: "Compare renewal quotes on premium plus the excess you would actually pay, including workshop surcharges.",
  alternates: { canonical: "/tools/quote-compare" },
};

export default function Page() {
  return (
    <ToolPageShell
      kicker="Renewal decision"
      title="Is the cheaper car insurance quote really cheaper?"
      lead="Compare renewal quotes on premium plus the excess you would actually pay, including workshop surcharges."
      method={[
        "Expected cost equals the premium plus your chance of claiming multiplied by what you would pay per claim.",
        "You pay the lower of the repair bill and your effective excess, including any workshop surcharge you enter.",
        "NCD loss is left out because a claim affects it similarly under each quote. Check for differences in your policy.",
        "This compares cost only. Coverage limits and exclusions can differ between policies.",
      ]}
      sources={[]}
    >
      <QuoteComparisonTool />
    </ToolPageShell>
  );
}
