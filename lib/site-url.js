/**
 * Canonical public origin used for metadata, the sitemap, and robots.txt.
 * NEXT_PUBLIC_SITE_URL is inlined at build time, so the fallback must always be a
 * live address that serves this application.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://claimwise.zc6600.wiki"
).replace(/\/$/, "");
