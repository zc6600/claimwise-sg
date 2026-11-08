import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "What ClaimWise SG collects, why it is used, who processes it, how long it is kept, and how to delete it.",
  alternates: { canonical: "/privacy" },
};

const CONTACT_EMAIL = "privacy@zc6600.wiki";

const DATA_ROWS = [
  {
    feature: "Calculators without an account",
    data: "The figures you enter. Results and recent calculations stay in your browser.",
    kept: "Until you clear them or your browser data.",
  },
  {
    feature: "Google sign-in",
    data: "Your Google account ID, name, email address, and profile photo.",
    kept: "Until you ask us to delete your account.",
  },
  {
    feature: "Saved calculations",
    data: "Your inputs and results, such as repair cost, premium, NCD, and excess.",
    kept: "Until you delete them from your history or ask us to delete your account.",
  },
  {
    feature: "My Car",
    data: "Your nickname, renewal, COE, and loan dates, premium, NCD, and excess. Signed-out details stay in your browser.",
    kept: "Until you select Delete saved details.",
  },
  {
    feature: "Email reminders",
    data: "Your email address, reminder dates, consent time, and which reminders were sent.",
    kept: "Unconfirmed sign-ups are removed after about 7 days. Other records are deleted when you unsubscribe or when no reminders remain.",
  },
];

export default function PrivacyPage() {
  return (
    <section className="tool-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">Privacy</div>
          <h1>Privacy policy</h1>
        </div>
        <p>Last updated 7 November 2026.</p>
      </div>

      <div className="privacy-copy">
        <h2>Summary</h2>
        <p>
          ClaimWise SG helps drivers compare car costs. You can use the calculators without an
          account. We do not ask for your vehicle registration number for My Car or reminders,
          and we do not sell your personal data.
        </p>

        <h2>What we collect</h2>
        <div className="privacy-table-wrap">
          <table className="privacy-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Data</th>
                <th scope="col">How long we keep it</th>
              </tr>
            </thead>
            <tbody>
              {DATA_ROWS.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td>{row.data}</td>
                  <td>{row.kept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The private settlement form runs in your browser, and we do not store what you type into
          it. Our servers also keep routine technical logs, such as request details, to operate and
          secure the service.
        </p>

        <h2>How we use it</h2>
        <ul>
          <li>To run the tools and show your saved information.</li>
          <li>To send the reminders you confirmed.</li>
          <li>To keep the service working, prevent abuse, and meet legal duties.</li>
        </ul>
        <p>
          We send reminder emails only after you confirm your address. You can withdraw consent at
          any time with the unsubscribe link in any reminder.
        </p>

        <h2>Who processes it</h2>
        <ul>
          <li>
            <strong>Google Cloud and Firebase</strong> host the app, sign-in, and our database. Our
            database is located in Singapore.
          </li>
          <li>
            <strong>Resend</strong> delivers our emails and processes your email address and message
            content for that purpose. Your data may be handled outside Singapore.
          </li>
        </ul>

        <h2>Your choices</h2>
        <ul>
          <li>Unsubscribe from reminders, which deletes your reminder record.</li>
          <li>Delete saved calculations and My Car details in the app.</li>
          <li>Ask to access, correct, or delete your personal data.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with any privacy question or
          request. If we make a material change to this policy, we will update this page and its date.
        </p>
        <p>
          <Link href="/">Back to car tools</Link>
        </p>
      </div>
    </section>
  );
}
