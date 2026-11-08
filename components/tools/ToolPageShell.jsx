import Link from "next/link";

export default function ToolPageShell({ kicker, title, lead, children, method, sources }) {
  return (
    <section className="tool-page section-pad">
      <div className="page-header">
        <div>
          <div className="section-kicker">{kicker}</div>
          <h1>{title}</h1>
        </div>
        <p>{lead}</p>
      </div>

      {children}

      <div className="tool-notes">
        <details>
          <summary>How this is calculated</summary>
          <ul>
            {method.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
        <details>
          <summary>Sources and limits</summary>
          <p>
            Your policy, loan agreement, or the latest official rules take priority over this
            estimate.
          </p>
          {sources?.length ? (
            <ul>
              {sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <p>
            <Link href="/my-car">Save your car’s dates</Link> to get reminders before these decisions.
          </p>
        </details>
      </div>
    </section>
  );
}
