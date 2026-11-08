const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://claimwise-sg.web.app";

const PUBLIC_PATHS = [
  "/",
  "/calculator",
  "/tools",
  "/tools/ncd-protector",
  "/tools/quote-compare",
  "/tools/coe-renewal",
  "/tools/loan-prepayment",
  "/my-car",
  "/settlement",
  "/emergency",
  "/how-it-works",
  "/rules",
  "/privacy",
];

export default function sitemap() {
  return PUBLIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` }));
}
