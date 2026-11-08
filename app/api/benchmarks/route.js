import { NextResponse } from "next/server";
import { getMarketStats, compareWithMarketBenchmarks } from "../../../src/market-benchmarks.mjs";

export async function GET() {
  const stats = getMarketStats();
  return NextResponse.json({
    ok: true,
    market: "Singapore",
    stats,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const comparison = compareWithMarketBenchmarks(body);
    return NextResponse.json({
      ok: true,
      comparison,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to compare benchmarks" },
      { status: 400 }
    );
  }
}
