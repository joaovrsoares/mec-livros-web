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

export function getClientId(request: Request): string {
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

export function checkRateLimit(clientId: string, nowMs: number): {
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

export function toSafeFileName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  return normalized || "livro";
}
