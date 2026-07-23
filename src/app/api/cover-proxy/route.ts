import { NextRequest, NextResponse } from "next/server";
import { processAndCacheCover } from "@/lib/cover-cache";

const ALLOWED_HOSTS = new Set([
  "static-meclivros.mec.gov.br",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing 'url' query parameter" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const result = await processAndCacheCover(parsedUrl.toString());

    if (!result) {
      return NextResponse.json({ error: "Failed to process cover image" }, { status: 502 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Cover proxy error:", error);
    return NextResponse.json({ error: "Failed to proxy cover image" }, { status: 500 });
  }
}
