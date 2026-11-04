import { calculateDecision } from "../../../src/decision-engine.mjs";
import { compareWithMarketBenchmarks } from "../../../lib/market-benchmarks.js";
import { persistCalculationDecision } from "../../../lib/server-calculation-storage.js";

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ ok: false, error: "Request body must be a JSON object." }, { status: 400 });
    }
    const rawInputs = Object.hasOwn(payload, "inputs") ? payload.inputs : payload;
    if (!rawInputs || typeof rawInputs !== "object" || Array.isArray(rawInputs)) {
      return Response.json({ ok: false, error: "Inputs must be a JSON object." }, { status: 400 });
    }

    const decision = calculateDecision(rawInputs);
    const benchmarks = compareWithMarketBenchmarks(decision.inputs);
    const persistRequested = payload.persist === true;
    const idToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    let persistence = {
      persisted: false,
      status: persistRequested ? "not_authenticated" : "not_requested",
    };

    if (persistRequested && idToken) {
      try {
        persistence = {
          ...(await persistCalculationDecision(idToken, decision)),
          status: "saved",
        };
      } catch (error) {
        console.warn("Calculation persistence failed:", error?.message || error);
        persistence = { persisted: false, status: "unavailable" };
      }
    }

    return Response.json({
      ok: true,
      decision,
      benchmarks,
      meta: {
        service: "claimwise-decision-engine",
        version: "0.2.0",
        runtime: "nextjs-route-handler",
        persisted: persistence.persisted,
        persistenceStatus: persistence.status,
        recordId: persistence.recordId,
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
