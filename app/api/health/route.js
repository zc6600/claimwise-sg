export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "claimwise-sg-api",
      status: "ready",
      framework: "nextjs",
      rulesStore: "versioned-code-config",
      persistence: "authenticated-firestore",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    }
  );
}
