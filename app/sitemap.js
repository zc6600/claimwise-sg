import { SITE_URL } from "../lib/site-url.js";
import { allPublicPages } from "../src/site-pages.mjs";

export default function sitemap() {
  return allPublicPages().map((page) => ({
    url: `${SITE_URL}${page.path}`,
    ...(page.lastModified ? { lastModified: page.lastModified } : {}),
  }));
}
