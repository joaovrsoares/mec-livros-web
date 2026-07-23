import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const start = Date.now();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  const method = request.method;
  const url = request.nextUrl.pathname + request.nextUrl.search;

  const response = NextResponse.next();
  const duration = Date.now() - start;

  console.log(`[HTTP] ${method} ${url} - IP: ${ip} (${duration}ms)`);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.webp|.*\\.svg).*)",
  ],
};
