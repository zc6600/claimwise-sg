import { calculateDecision } from "../../../src/decision-engine.mjs";
import { validateDecisionInputs } from "../../../src/decision-validation.mjs";
import { compareWithMarketBenchmarks } from "../../../src/market-benchmarks.mjs";
import { persistCalculationDecision } from "../../../lib/server-calculation-storage.js";

const MAX_BODY_BYTES = 16384;

export { validateDecisionInputs };

export async function POST(request) {
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return Response.json(
        { ok: false, error: "Request body exceeds maximum allowed size." },
        { status: 413 }
      );
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return Response.json(
        { ok: false, error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json(
        { ok: false, error: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    const persistRequested = payload.persist === true;
    const rawInputs = Object.hasOwn(payload, "inputs") ? payload.inputs : payload;
    const validationError = validateDecisionInputs(rawInputs, {
      persist: persistRequested,
    });
    if (validationError) {
      return Response.json(
        {
          ok: false,
          error: validationError.message,
          field: validationError.field,
        },
        { status: 400 }
      );
    }

    const decision = calculateDecision(rawInputs);
    const benchmarks = compareWithMarketBenchmarks(decision.inputs);
    const idToken = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1];
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
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Unable to calculate this decision.",
      },
      { status: 400 }
    );
  }
}
