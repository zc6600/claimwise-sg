"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReminderSignup({ dates, heading = "Email me before these dates", className = "" }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });

  useEffect(() => {
    setStatus((current) => (current.state === "sent" ? { state: "idle", message: "" } : current));
  }, [dates]);

  const hasDates = Object.values(dates).some(Boolean);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ state: "sending", message: "" });
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, dates, consent, website }),
      });
      const result = await response.json();
      setStatus(
        result.ok
          ? { state: "sent", message: "Check your inbox and confirm to start your reminders." }
          : { state: "error", message: result.error || "Reminders could not be set up." }
      );
    } catch {
      setStatus({ state: "error", message: "Reminders could not be set up. Check your connection." });
    }
  }

  return (
    <form className={`tool-card reminder-signup ${className}`.trim()} onSubmit={handleSubmit}>
      <div className="reminder-intro">
        <h2>{heading}</h2>
        <p className="field-hint">
          We email a prompt before each saved date, with a link to the right check. We store your
          email and dates only, never your registration number or policy figures.
        </p>
      </div>
      <div className="field">
        <label htmlFor="reminder-email">Email</label>
        <input
          id="reminder-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="reminder-trap" aria-hidden="true">
        <label htmlFor="reminder-website">Website</label>
        <input
          id="reminder-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <label className="reminder-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          I agree to receive reminder emails from ClaimWise SG. I can unsubscribe at any time, which
          deletes my reminder data. Read the <Link href="/privacy">privacy policy</Link>.
        </span>
      </label>
      <button
        type="submit"
        className="button button-primary"
        disabled={!hasDates || !consent || status.state === "sending"}
      >
        {status.state === "sending" ? "Sending…" : "Set up reminders"}
      </button>
      {!hasDates ? <p className="field-hint">Save at least one date first.</p> : null}
      {status.message ? (
        <p className={status.state === "error" ? "reminder-error" : "reminder-success"} role="status">
          {status.message}
        </p>
      ) : null}
      {status.state === "sent" ? (
        <p className="field-hint">
          While you wait, try the <Link href="/tools">other car decision tools</Link>.
        </p>
      ) : null}
    </form>
  );
}
