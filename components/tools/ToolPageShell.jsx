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
        <article>
          <h2>How this is calculated</h2>
          <ul>
            {method.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
        <article>
          <h2>Before you decide</h2>
          <p>
            This tool gives general information from the figures you enter. It is not financial
            advice, and your policy, loan agreement, or the latest official rules take priority.
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
        </article>
      </div>
    </section>
  );
}
