import MyCarClient from "../../components/my-car/MyCarClient";

export const metadata = {
  title: "My Car",
  description:
    "Save your car’s insurance, COE, and loan dates, then get an email before each decision.",
  alternates: { canonical: "/my-car" },
};

export default function MyCarPage() {
  return (
    <section className="tool-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">My Car</div>
          <h1>Your next car decisions</h1>
        </div>
        <p>Save the dates that matter and we’ll point you to the right check at the right time.</p>
      </div>
      <MyCarClient />
    </section>
  );
}
