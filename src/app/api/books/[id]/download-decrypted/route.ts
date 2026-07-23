import { NextResponse } from "next/server";

import { decryptEpubBuffer } from "@/lib/decrypt-epub";
import { checkRateLimit, getClientId, toSafeFileName } from "@/lib/download-rate-limit";
import { getBookById, getDownloadInfo } from "@/lib/mec-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const token = process.env.MEC_LIVROS_BEARER_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Defina MEC_LIVROS_BEARER_TOKEN no .env.local para habilitar downloads.",
      },
      { status: 500 },
    );
  }

  const rateLimit = checkRateLimit(getClientId(request), Date.now());
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Limite de downloads atingido temporariamente. Aguarde e tente novamente.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "X-RateLimit-Remaining-Daily": String(rateLimit.remainingDaily),
        },
      },
    );
  }

  try {
    const [book, downloadInfo] = await Promise.all([
      getBookById(id),
      getDownloadInfo(id, token),
    ]);

    const encryptedResponse = await fetch(downloadInfo.downloadUrl, {
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });
    if (!encryptedResponse.ok) {
      throw new Error(
        `Falha ao baixar EPUB criptografado (${encryptedResponse.status} ${encryptedResponse.statusText}).`,
      );
    }

    const encryptedBuffer = Buffer.from(await encryptedResponse.arrayBuffer());
    const { output, totalHtmlFiles, decryptedHtmlFiles } =
      await decryptEpubBuffer(encryptedBuffer);

    const filenameBase = toSafeFileName(book.title);
    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${filenameBase}.decrypted.epub"`,
        "X-MEC-Book-Id": String(book.id),
        "X-MEC-HTML-Total": String(totalHtmlFiles),
        "X-MEC-HTML-Decrypted": String(decryptedHtmlFiles),
        "X-MEC-XHTML-Total": String(totalHtmlFiles),
        "X-MEC-XHTML-Decrypted": String(decryptedHtmlFiles),
        "X-RateLimit-Remaining-Daily": String(rateLimit.remainingDaily),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
