import { INSURER_PROFILES, NCD_STEPS } from "../../../src/decision-engine.mjs";

export async function GET() {
  return Response.json(
    {
      ok: true,
      version: "0.1.0-demo",
      effectiveDate: "2026-09-22",
      ncdSteps: NCD_STEPS,
      profiles: Object.entries(INSURER_PROFILES).map(([id, profile]) => ({
        id,
        name: profile.name,
        ruleLabel: profile.ruleLabel,
        sourceLabel: profile.sourceLabel,
      })),
      note: "Demo rules are configurable and must be verified against the policy wording before production use.",
    },
    {
      headers: {
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff",
      },
    }
  );
}
