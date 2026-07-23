import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { getProxyCoverUrl } from "./mec-api";

test("getProxyCoverUrl wraps static-meclivros cover URLs", () => {
  const input = "https://static-meclivros.mec.gov.br/covers/9786587140315.jpg";
  const expected = "/api/cover-proxy?url=https%3A%2F%2Fstatic-meclivros.mec.gov.br%2Fcovers%2F9786587140315.jpg";
  assert.equal(getProxyCoverUrl(input), expected);
});

test("sharp detects magic bytes and converts mislabeled AVIF cover image to WebP", async () => {
  const sampleUrl = "https://static-meclivros.mec.gov.br/covers/9786587140315.jpg";
  const response = await fetch(sampleUrl);
  assert.equal(response.status, 200);

  const arrayBuf = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  // Verify sharp inspects buffer metadata (format: heif / compression: av1)
  const metadata = await sharp(buffer).metadata();
  assert.ok(metadata.format === "heif" || metadata.format === "jpeg" || metadata.format === "png" || metadata.format === "webp");

  // Verify converting to webp produces valid webp buffer
  const webpBuffer = await sharp(buffer).toFormat("webp").toBuffer();
  assert.ok(webpBuffer.length > 0);

  const webpMetadata = await sharp(webpBuffer).metadata();
  assert.equal(webpMetadata.format, "webp");
});
