export default function manifest() {
  return {
    name: "ClaimWise SG · Singapore Car Decision Tools",
    short_name: "ClaimWise SG",
    description:
      "Independent calculators for Singapore car owners: claim or self-pay, NCD Protector, renewal quotes, COE renewal, and car loan settlement.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1320",
    theme_color: "#0b1320",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
