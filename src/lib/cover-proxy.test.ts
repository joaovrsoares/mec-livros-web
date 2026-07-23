import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { getProxyCoverUrl } from "./mec-api";
import { normalizeCoverUrl } from "./cover-cache";

test("getProxyCoverUrl wraps static-meclivros cover URLs", () => {
  const input = "https://static-meclivros.mec.gov.br/covers/9786587140315.jpg";
  const expected = "/api/cover-proxy?url=https%3A%2F%2Fstatic-meclivros.mec.gov.br%2Fcovers%2F9786587140315.jpg";
  assert.equal(getProxyCoverUrl(input), expected);
});

test("normalizeCoverUrl converts /covers/ to /covers-webp/", () => {
  const input = "https://static-meclivros.mec.gov.br/covers/9786587140315.jpg";
  const expected = "https://static-meclivros.mec.gov.br/covers-webp/9786587140315.jpg";
  assert.equal(normalizeCoverUrl(input), expected);
});

test("covers-webp endpoint returns native webp format", async () => {
  const sampleUrl = normalizeCoverUrl("https://static-meclivros.mec.gov.br/covers/9786587140315.jpg");
  const response = await fetch(sampleUrl);
  assert.equal(response.status, 200);

  const contentType = response.headers.get("content-type");
  assert.equal(contentType, "image/webp");

  const arrayBuf = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const metadata = await sharp(buffer).metadata();
  assert.equal(metadata.format, "webp");
});
