"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ConfirmReminderClient() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [manageToken, setManageToken] = useState("");

  async function confirm() {
    setStatus({ state: "sending", message: "" });
    try {
      const response = await fetch("/api/reminders/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (result.ok) {
        setManageToken(result.manageToken);
        setStatus({ state: "done", message: "Your reminders are on." });
      } else {
        setStatus({ state: "error", message: result.error });
      }
    } catch {
      setStatus({ state: "error", message: "Reminders could not be confirmed. Try again." });
    }
  }

  return (
    <div className="tool-card reminder-panel">
      {status.state === "done" ? (
        <>
          <h2>{status.message}</h2>
          <p>
            <Link href={`/reminders/manage?token=${encodeURIComponent(manageToken)}`}>Manage your reminders</Link>
          </p>
        </>
      ) : (
        <>
          <h2>Confirm your reminders</h2>
          <p>Confirm that you want ClaimWise SG to email you before your saved car dates.</p>
          <button
            type="button"
            className="button button-primary"
            onClick={confirm}
            disabled={!token || status.state === "sending"}
          >
            {status.state === "sending" ? "Confirming…" : "Confirm reminders"}
          </button>
          {!token ? <p className="reminder-error">This confirmation link is incomplete.</p> : null}
          {status.state === "error" ? <p className="reminder-error">{status.message}</p> : null}
        </>
      )}
    </div>
  );
}
