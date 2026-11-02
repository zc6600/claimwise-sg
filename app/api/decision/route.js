import { calculateDecision } from "../../../src/decision-engine.mjs";
import { compareWithMarketBenchmarks } from "../../../lib/market-benchmarks.js";

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ ok: false, error: "Request body must be a JSON object." }, { status: 400 });
    }
    const decision = calculateDecision(payload);
    const benchmarks = compareWithMarketBenchmarks(decision.inputs);

    return Response.json({
      ok: true,
      decision,
      benchmarks,
      meta: {
        service: "claimwise-decision-engine",
        version: "0.2.0",
        runtime: "nextjs-route-handler",
        persisted: false,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "Unable to calculate this decision.",
      },
      { status: 400 }
    );
  }
}
