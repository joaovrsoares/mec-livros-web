import sharp from "sharp";

type CachedCover = {
  buffer: Buffer;
  contentType: string;
};

const coverCache = new Map<string, CachedCover>();
const MAX_CACHE_SIZE = 500;

export function normalizeCoverUrl(url: string): string {
  if (url && url.includes("static-meclivros.mec.gov.br/covers/")) {
    return url.replace(
      "static-meclivros.mec.gov.br/covers/",
      "static-meclivros.mec.gov.br/covers-webp/"
    );
  }
  return url;
}

export async function processAndCacheCover(targetUrl: string): Promise<CachedCover | null> {
  const fetchUrl = normalizeCoverUrl(targetUrl);

  if (coverCache.has(targetUrl)) {
    return coverCache.get(targetUrl)!;
  }

  try {
    let upstreamRes = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "MecLivrosWeb/1.0",
      },
      next: { revalidate: 86400 },
    });

    if (!upstreamRes.ok && fetchUrl !== targetUrl) {
      // Fallback to original URL if covers-webp fails
      upstreamRes = await fetch(targetUrl, {
        headers: {
          "User-Agent": "MecLivrosWeb/1.0",
        },
        next: { revalidate: 86400 },
      });
    }

    if (!upstreamRes.ok) {
      return null;
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let outputBuffer: Buffer;
    let contentType = "image/webp";

    try {
      const instance = sharp(inputBuffer, { failOnError: false });
      const metadata = await instance.metadata();

      if (metadata.format === "gif") {
        outputBuffer = inputBuffer;
        contentType = "image/gif";
      } else {
        outputBuffer = await instance
          .rotate()
          .toFormat("webp", { quality: 80 })
          .toBuffer();
        contentType = "image/webp";
      }
    } catch {
      outputBuffer = inputBuffer;
      contentType = upstreamRes.headers.get("content-type") || "image/jpeg";
    }

    const cached: CachedCover = { buffer: outputBuffer, contentType };

    if (coverCache.size >= MAX_CACHE_SIZE) {
      const firstKey = coverCache.keys().next().value;
      if (firstKey) {
        coverCache.delete(firstKey);
      }
    }
    coverCache.set(targetUrl, cached);

    return cached;
  } catch (error) {
    console.error("Failed to process cover:", error);
    return null;
  }
}

export async function preloadBookCovers(urls: string[]): Promise<void> {
  const validUrls = urls.filter(
    (url) => url && url.startsWith("https://static-meclivros.mec.gov.br/")
  );
  await Promise.allSettled(validUrls.map((url) => processAndCacheCover(url)));
}
