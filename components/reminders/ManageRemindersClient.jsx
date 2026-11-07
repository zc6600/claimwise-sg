"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { REMINDER_TYPES } from "../../src/reminders/schedule.mjs";

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

export default function ManageRemindersClient() {
  const params = useSearchParams();
  const token = params.get("token");
  const wantsUnsubscribe = params.get("unsubscribe") === "1";
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [dates, setDates] = useState({});

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This link is incomplete.");
      return;
    }
    postJson("/api/reminders/manage", { token, action: "get" })
      .then((result) => {
        if (!result.ok) {
          setState("error");
          setMessage(result.error);
          return;
        }
        setEmail(result.email);
        setDates(result.dates);
        setState("ready");
      })
      .catch(() => {
        setState("error");
        setMessage("Your reminders could not be loaded.");
      });
  }, [token]);

  async function save(event) {
    event.preventDefault();
    setMessage("");
    try {
      const result = await postJson("/api/reminders/manage", { token, action: "update", dates });
      setMessage(result.ok ? "Reminder dates saved." : result.error);
    } catch {
      setMessage("Your changes could not be saved.");
    }
  }

  async function unsubscribe() {
    setMessage("");
    try {
      const result = await postJson("/api/reminders/unsubscribe", { token });
      if (result.ok) setState("removed");
      else setMessage(result.error);
    } catch {
      setMessage("You could not be unsubscribed. Try again.");
    }
  }

  if (state === "loading") return <div className="tool-card reminder-panel"><p>Loading…</p></div>;
  if (state === "error") return <div className="tool-card reminder-panel"><p className="reminder-error">{message}</p></div>;
  if (state === "removed") {
    return (
      <div className="tool-card reminder-panel">
        <h2>You are unsubscribed</h2>
        <p>Your email and reminder dates have been deleted.</p>
      </div>
    );
  }

  return (
    <form className="tool-card reminder-panel" onSubmit={save}>
      <h2>Reminders for {email}</h2>
      {wantsUnsubscribe ? (
        <div className="reminder-stop">
          <p>Stop all reminders and delete your data?</p>
          <button type="button" className="button button-primary" onClick={unsubscribe}>
            Unsubscribe and delete
          </button>
        </div>
      ) : null}
      <div className="field-grid">
        {Object.entries(REMINDER_TYPES).map(([type, config]) => (
          <div className="field" key={type}>
            <label htmlFor={`manage-${type}`}>{config.label}</label>
            <input
              id={`manage-${type}`}
              type="date"
              value={dates[type] ?? ""}
              onChange={(event) =>
                setDates((current) => ({ ...current, [type]: event.target.value }))
              }
            />
          </div>
        ))}
      </div>
      <div className="reminder-actions">
        <button type="submit" className="button button-primary">Save dates</button>
        {!wantsUnsubscribe ? (
          <button type="button" className="button button-ghost" onClick={unsubscribe}>
            Unsubscribe and delete
          </button>
        ) : null}
      </div>
      {message ? <p className="reminder-success" role="status">{message}</p> : null}
    </form>
  );
}
