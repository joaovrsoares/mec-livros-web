import { NextRequest, NextResponse } from "next/server";

import { searchBooks } from "@/lib/mec-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "12");

  if (!query) {
    return NextResponse.json(
      { error: "Parâmetro query é obrigatório." },
      { status: 400 },
    );
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 && limit <= 24 ? Math.floor(limit) : 12;

  try {
    const result = await searchBooks({
      query,
      page: safePage,
      limit: safeLimit,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

