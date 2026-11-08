import { SITE_URL } from "../lib/site-url";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/reminders/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
