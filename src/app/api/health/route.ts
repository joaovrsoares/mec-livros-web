import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasBearerToken = Boolean(process.env.MEC_LIVROS_BEARER_TOKEN);
  const hasAesKey = Boolean(process.env.MEC_LIVROS_AES_KEY);
  const hasAesIv = Boolean(process.env.MEC_LIVROS_AES_IV);

  let upstreamStatus = "unknown";
  try {
    const res = await fetch("https://meclivros.mec.gov.br/api/backend/books/search?query=test&page=1&limit=1", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    upstreamStatus = res.ok ? "ok" : `error_${res.status}`;
  } catch (error) {
    upstreamStatus = error instanceof Error ? `unreachable: ${error.message}` : "unreachable";
  }

  const isHealthy = hasBearerToken && upstreamStatus === "ok";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      environment: {
        hasBearerToken,
        hasAesKey,
        hasAesIv,
      },
      upstreamApi: upstreamStatus,
    },
    { status: isHealthy ? 200 : 503 },
  );
}
