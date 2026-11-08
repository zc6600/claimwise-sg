/**
 * Edge proxy for the public ClaimWise SG hostname.
 *
 * Cloud Run routes requests by the Host header, so a plain CNAME to *.run.app
 * returns 404. The proxy rewrites the request onto the Cloud Run origin while
 * preserving method, headers, body, and query string. Redirects are passed
 * through unchanged so the browser, not the edge, follows them.
 */
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, env.ORIGIN_URL);

    // Copying the incoming request keeps method, headers, and a streamed body intact.
    const upstream = new Request(target, request);
    upstream.headers.set("x-forwarded-host", incoming.host);
    upstream.headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

    const response = await fetch(upstream, { redirect: "manual" });

    // Absolute redirects that point back at the origin are rewritten to the public host.
    const location = response.headers.get("location");
    if (location) {
      const redirect = new URL(location, target);
      if (redirect.origin === target.origin) {
        const rewritten = new Response(response.body, response);
        rewritten.headers.set("location", incoming.origin + redirect.pathname + redirect.search + redirect.hash);
        return rewritten;
      }
    }
    return response;
  },
};
