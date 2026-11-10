/**
 * schema.org JSON-LD builders. Search engines and AI crawlers read these to identify the
 * site, its calculators, and the source documents each rules page quotes.
 */

const ORGANIZATION_ID = (siteUrl) => `${siteUrl}/#organization`;
const WEBSITE_ID = (siteUrl) => `${siteUrl}/#website`;

export function siteGraph(siteUrl) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID(siteUrl),
        name: "ClaimWise SG",
        url: siteUrl,
        description:
          "Independent calculators for the expensive decisions of owning a car in Singapore. ClaimWise does not sell insurance or loans.",
        areaServed: { "@type": "Country", name: "Singapore" },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID(siteUrl),
        name: "ClaimWise SG",
        url: siteUrl,
        inLanguage: "en-SG",
        publisher: { "@id": ORGANIZATION_ID(siteUrl) },
      },
    ],
  };
}

export function breadcrumbList(siteUrl, crumbs) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}

/** A free browser calculator, described as a web application. */
export function calculatorGraph(siteUrl, { path, name, description, crumbs }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}${path}#app`,
        name,
        description,
        url: `${siteUrl}${path}`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "SGD" },
        areaServed: { "@type": "Country", name: "Singapore" },
        publisher: { "@id": ORGANIZATION_ID(siteUrl) },
      },
      breadcrumbList(siteUrl, crumbs),
    ],
  };
}

/**
 * A page that quotes policy wording. `citations` are the insurer documents quoted, so a
 * reader can tell the page restates a primary source rather than offering opinion.
 */
export function wordingPageGraph(siteUrl, { path, headline, description, citations, crumbs, dateModified }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${siteUrl}${path}#article`,
        headline,
        description,
        url: `${siteUrl}${path}`,
        inLanguage: "en-SG",
        ...(dateModified ? { dateModified } : {}),
        isPartOf: { "@id": WEBSITE_ID(siteUrl) },
        publisher: { "@id": ORGANIZATION_ID(siteUrl) },
        about: { "@type": "Thing", name: "Singapore private car insurance" },
        citation: citations.map((citation) => ({
          "@type": "CreativeWork",
          name: citation.name,
          url: `${siteUrl}${citation.path}`,
          ...(citation.publisher
            ? { publisher: { "@type": "Organization", name: citation.publisher } }
            : {}),
        })),
      },
      breadcrumbList(siteUrl, crumbs),
    ],
  };
}

/** Serialises JSON-LD for a `<script>` tag; escaping `<` keeps the payload from closing it. */
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
