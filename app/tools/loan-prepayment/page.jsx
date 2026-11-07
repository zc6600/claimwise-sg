import ToolPageShell from "../../../components/tools/ToolPageShell";
import LoanPrepaymentTool from "../../../components/tools/LoanPrepaymentTool";

export const metadata = {
  title: "Car Loan Early Settlement Calculator",
  description: "Estimate your early settlement under the Rule of 78, then compare it with what your cash could earn elsewhere.",
  alternates: { canonical: "/tools/loan-prepayment" },
};

export default function Page() {
  return (
    <ToolPageShell
      kicker="Loan decision"
      title="Should you settle your car loan early?"
      lead="Estimate your early settlement under the Rule of 78, then compare it with what your cash could earn elsewhere."
      method={[
        "Flat interest is spread across the tenure, and the rebate on early settlement follows the Rule of 78.",
        "The Rule of 78 refunds less interest than a straight-line share, especially late in the loan.",
        "Fees differ by lender, so enter the rebate fee and any penalty from your agreement.",
        "Ask your lender for a settlement quotation, which replaces this estimate.",
      ]}
      sources={[
        { label: "DBS: Redeeming your car loan", href: "https://www.dbs.com.sg/personal/articles/nav/budget-spend/redeeming-your-car-loan" },
      ]}
    >
      <LoanPrepaymentTool />
    </ToolPageShell>
  );
}
