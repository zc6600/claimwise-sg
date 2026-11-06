"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Unhandled client exception:", error);
  }, [error]);

  return (
    <section
      className="section-pad"
      style={{
        padding: "80px 24px",
        textAlign: "center",
        maxWidth: "680px",
        margin: "0 auto",
      }}
    >
      <div className="section-kicker">Application Error</div>
      <h1 style={{ fontSize: "2.25rem", margin: "16px 0", fontWeight: 700 }}>
        Something went wrong
      </h1>
      <p
        style={{
          color: "var(--text-muted, #94a3b8)",
          fontSize: "1.1rem",
          lineHeight: 1.6,
          marginBottom: "32px",
        }}
      >
        An unexpected error occurred while processing your request. You can attempt
        to reload the component state or return to the calculator.
      </p>
      <div
        className="hero-actions"
        style={{
          justifyContent: "center",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => reset()}
          className="button button-primary button-large"
        >
          Try again
        </button>
        <Link href="/calculator" className="button button-secondary">
          Open calculator
        </Link>
      </div>
    </section>
  );
}
