import ToolPageShell from "../../../components/tools/ToolPageShell";
import NcdProtectorTool from "../../../components/tools/NcdProtectorTool";

export const metadata = {
  title: "NCD Protector Calculator",
  description: "Work out the claim risk at which Singapore’s NCD Protector rider pays for itself, using your own renewal premium.",
  alternates: { canonical: "/tools/ncd-protector" },
};

export default function Page() {
  return (
    <ToolPageShell
      path="/tools/ncd-protector"
      name="NCD Protector calculator"
      kicker="Renewal decision"
      title="Is the NCD Protector worth it?"
      lead="Work out the claim risk at which Singapore’s NCD Protector rider pays for itself, using your own renewal premium."
      method={[
        "We compare five renewals after an at-fault claim, with and without the rider, using the same NCD model as the claim calculator.",
        "Break-even chance equals the rider price divided by the discounted premium loss it prevents.",
        "The result covers premium loss only. It does not value the peace of mind of a smoother renewal.",
        "Insurers set their own eligibility and limits, so confirm the rider terms in your policy schedule.",
      ]}
      sources={[]}
    >
      <NcdProtectorTool />
    </ToolPageShell>
  );
}
