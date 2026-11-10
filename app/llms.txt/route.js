import { buildLlmsTxt } from "../../src/llms-text.mjs";
import { SITE_URL } from "../../lib/site-url.js";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(SITE_URL), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
