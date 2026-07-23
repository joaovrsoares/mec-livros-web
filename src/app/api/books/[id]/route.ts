import { NextResponse } from "next/server";

import { getBookById } from "@/lib/mec-api";

export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const book = await getBookById(id);
    return NextResponse.json(book);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

