export default function manifest() {
  return {
    name: "ClaimWise SG · Motor Insurance Decision Support",
    short_name: "ClaimWise SG",
    description:
      "Actuarial motor insurance claim decision support & GIA private settlement generator for Singapore motorists.",
    start_url: "/calculator",
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
