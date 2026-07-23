import { NextResponse } from "next/server";

import { decryptEpubBuffer } from "@/lib/decrypt-epub";
import { getBookById, getDownloadInfo } from "@/lib/mec-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

type RateLimitState = {
  shortWindowStartedAt: number;
  shortWindowCount: number;
  dayWindowStartedAt: number;
  dayWindowCount: number;
  lastRequestAt: number;
};

const rateLimitByClient = new Map<string, RateLimitState>();

function parseNumberEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`A variável ${name} deve ser um número positivo.`);
  }

  return Math.floor(parsed);
}

const DOWNLOAD_SHORT_WINDOW_SECONDS = parseNumberEnv(
  "MEC_DOWNLOAD_SHORT_WINDOW_SECONDS",
  45,
);
const DOWNLOAD_SHORT_WINDOW_MAX = parseNumberEnv("MEC_DOWNLOAD_SHORT_WINDOW_MAX", 1);
const DOWNLOAD_DAY_WINDOW_MAX = parseNumberEnv("MEC_DOWNLOAD_DAILY_MAX", 50);

function getClientId(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "127.0.0.1";
}

function checkRateLimit(clientId: string, nowMs: number): {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingDaily: number;
} {
  const shortWindowMs = DOWNLOAD_SHORT_WINDOW_SECONDS * 1000;
  const dayWindowMs = 24 * 60 * 60 * 1000;

  const state = rateLimitByClient.get(clientId) ?? {
    shortWindowStartedAt: nowMs,
    shortWindowCount: 0,
    dayWindowStartedAt: nowMs,
    dayWindowCount: 0,
    lastRequestAt: 0,
  };

  if (nowMs - state.dayWindowStartedAt >= dayWindowMs) {
    state.dayWindowStartedAt = nowMs;
    state.dayWindowCount = 0;
  }

  if (nowMs - state.shortWindowStartedAt >= shortWindowMs) {
    state.shortWindowStartedAt = nowMs;
    state.shortWindowCount = 0;
  }

  const retryAfterCooldownSeconds = Math.max(
    0,
    Math.ceil((state.lastRequestAt + shortWindowMs - nowMs) / 1000),
  );

  if (state.shortWindowCount >= DOWNLOAD_SHORT_WINDOW_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterCooldownSeconds,
      remainingDaily: Math.max(0, DOWNLOAD_DAY_WINDOW_MAX - state.dayWindowCount),
    };
  }

  if (state.dayWindowCount >= DOWNLOAD_DAY_WINDOW_MAX) {
    const retryAfterDaySeconds = Math.max(
      0,
      Math.ceil((state.dayWindowStartedAt + dayWindowMs - nowMs) / 1000),
    );
    return {
      allowed: false,
      retryAfterSeconds: retryAfterDaySeconds,
      remainingDaily: 0,
    };
  }

  state.shortWindowCount += 1;
  state.dayWindowCount += 1;
  state.lastRequestAt = nowMs;
  rateLimitByClient.set(clientId, state);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingDaily: Math.max(0, DOWNLOAD_DAY_WINDOW_MAX - state.dayWindowCount),
  };
}

function toSafeFileName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  return normalized || "livro";
}

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
