import Link from "next/link";
import { wordingPageUrl } from "../../src/policy-wordings.mjs";

export function WordingTable({ table }) {
  return (
    <div className="table-wrap">
      <table className="wording-table tabular-nums">
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The quoted clause, its table, and the explanatory note for one wording entry. */
export function WordingBody({ wording, entry }) {
  return (
    <>
      {entry.section ? <div className="wording-section">{entry.section}</div> : null}
      {entry.excerpt ? (
        <blockquote className="wording-quote" cite={wordingPageUrl(wording, entry.page)}>
          {entry.excerpt.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </blockquote>
      ) : null}
      {entry.table ? <WordingTable table={entry.table} /> : null}
      {entry.note ? <p className="wording-note">{entry.note}</p> : null}
    </>
  );
}

export function SourceLink({ wording, entry }) {
  return entry.page ? (
    <a href={wordingPageUrl(wording, entry.page)} target="_blank" rel="noreferrer">
      PDF p.{entry.page} <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <span className="wording-cell-tag">No clause</span>
  );
}

/**
 * Compact card for one insurer on one topic. `title` overrides the insurer name, and
 * `href` links the card to the full page for that clause.
 */
export function WordingCell({ wording, entry, title, href }) {
  const missing = !entry.excerpt;
  return (
    <article className={`wording-cell${missing ? " is-missing" : ""}`}>
      <header className="wording-cell-head">
        <strong>{href ? <Link href={href}>{title ?? wording.insurer}</Link> : title ?? wording.insurer}</strong>
        <SourceLink wording={wording} entry={entry} />
      </header>
      <p className="wording-summary">{entry.summary}</p>
      <details className="wording-details">
        <summary>{missing ? "Why it is missing" : "Read the wording"}</summary>
        <div className="wording-details-body">
          <WordingBody wording={wording} entry={entry} />
        </div>
      </details>
    </article>
  );
}

export function Breadcrumbs({ crumbs }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {crumbs.map((crumb, index) => (
          <li key={crumb.path}>
            {index < crumbs.length - 1 ? <Link href={crumb.path}>{crumb.name}</Link> : <span aria-current="page">{crumb.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
