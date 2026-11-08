import ToolJourney from "../../components/tools/ToolJourney";

export const metadata = {
  title: "Car Decision Tools",
  description:
    "Five independent calculators for Singapore car owners, grouped by the moment you need them: after an accident, at renewal, during a car loan, and before COE expiry.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  return (
    <div className="landing-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Car tools</div>
          <h1>Pick the moment you are in</h1>
        </div>
        <p>Each tool shows a worked example. Open it to run the same sums on your own car.</p>
      </div>
      <ToolJourney />
    </div>
  );
}
