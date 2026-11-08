import Link from "next/link";

export const metadata = {
  title: "Page Not Found",
  description: "The requested page could not be found on ClaimWise SG.",
};

export default function NotFound() {
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
      <div className="section-kicker">404 · Not Found</div>
      <h1 style={{ fontSize: "2.25rem", margin: "16px 0", fontWeight: 700 }}>
        Page not found
      </h1>
      <p
        style={{
          color: "var(--text-muted, #94a3b8)",
          fontSize: "1.1rem",
          lineHeight: 1.6,
          marginBottom: "32px",
        }}
      >
        The page you requested could not be found. Pick a tool from the home page, or go
        straight to the claim or self-pay calculator.
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
        <Link href="/" className="button button-primary button-large">
          Browse car tools <span aria-hidden="true">→</span>
        </Link>
        <Link href="/calculator" className="button button-secondary">
          Claim or self-pay calculator
        </Link>
      </div>
    </section>
  );
}
