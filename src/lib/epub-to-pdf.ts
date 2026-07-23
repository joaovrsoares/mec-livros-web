import JSZip from "jszip";
import puppeteer from "puppeteer";

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function normalizeZipPath(baseDir: string, relativePath: string): string {
  const cleanRelative = relativePath.split("#")[0].split("?")[0];
  const combined = baseDir ? `${baseDir}/${cleanRelative}` : cleanRelative;
  const parts = combined.split("/");
  const stack: string[] = [];

  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join("/");
}

async function findOpfPath(zip: JSZip): Promise<string | null> {
  const containerFile = zip.file("META-INF/container.xml");
  if (containerFile) {
    const xml = await containerFile.async("string");
    const match = xml.match(/full-path=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1];
    }
  }

  for (const name of Object.keys(zip.files)) {
    if (name.endsWith(".opf")) {
      return name;
    }
  }

  return null;
}

async function extractSpineHrefs(
  zip: JSZip,
  opfPath: string
): Promise<{ hrefs: string[]; baseDir: string }> {
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`OPF não encontrado em: ${opfPath}`);
  }

  const xml = await opfFile.async("string");
  const baseDir = opfPath.includes("/")
    ? opfPath.substring(0, opfPath.lastIndexOf("/"))
    : "";

  const manifestMap = new Map<string, string>();
  const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*\/?>|<item\s+[^>]*href=["']([^"']+)["'][^>]*id=["']([^"']+)["'][^>]*\/>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const id = itemMatch[1] || itemMatch[4];
    const href = itemMatch[2] || itemMatch[3];
    if (id && href) {
      manifestMap.set(id, href);
    }
  }

  const hrefs: string[] = [];
  const itemrefRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*\/?>/gi;
  let spineMatch: RegExpExecArray | null;

  while ((spineMatch = itemrefRegex.exec(xml)) !== null) {
    const idref = spineMatch[1];
    const href = manifestMap.get(idref);
    if (href) {
      hrefs.push(href);
    }
  }

  if (hrefs.length === 0) {
    for (const name of Object.keys(zip.files)) {
      if (/\.(xhtml|html)$/i.test(name) && !zip.files[name].dir) {
        hrefs.push(name);
      }
    }
  }

  return { hrefs, baseDir };
}

async function inlineChapterAssets(
  zip: JSZip,
  htmlContent: string,
  chapterBaseDir: string
): Promise<string> {
  let processed = htmlContent;

  // Extract <body> content if present
  const bodyMatch = processed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    processed = bodyMatch[1];
  }

  // Convert SVG <image> / <svg:image> tags to <img> tags for consistent A4 PDF sizing
  processed = processed.replace(
    /<svg[^>]*>[\s\S]*?<(?:svg:)?image\s+[^>]*(?:xlink:href|href)=["']([^"']+)["'][^>]*\/?>[\s\S]*?<\/svg>/gi,
    '<img src="$1" class="epub-cover-img" />'
  );

  // Inline standard <img> src
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi;
  let match: RegExpExecArray | null;
  const replacements: Array<{ original: string; replaced: string }> = [];

  while ((match = imgRegex.exec(processed)) !== null) {
    const fullTag = match[0];
    const src = match[1];

    if (src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://")) {
      continue;
    }

    const zipPath = normalizeZipPath(chapterBaseDir, src);
    const imgFile = zip.file(zipPath) || zip.file(src);

    if (imgFile) {
      const imgBuffer = await imgFile.async("nodebuffer");
      const mime = getMimeType(zipPath);
      const dataUri = `data:${mime};base64,${imgBuffer.toString("base64")}`;
      const newTag = fullTag.replace(src, dataUri);
      replacements.push({ original: fullTag, replaced: newTag });
    }
  }

  for (const { original, replaced } of replacements) {
    processed = processed.replace(original, replaced);
  }

  // Remove problematic fixed-heights / absolute positioning styles in inline attributes
  processed = processed.replace(/style=["'][^"']*(?:height\s*:\s*100%|position\s*:\s*absolute|transform\s*:)[^"']*["']/gi, "");

  return processed;
}

function isContentVisuallyEmpty(htmlSnippet: string): boolean {
  // Strip tags and check text length
  const strippedText = htmlSnippet.replace(/<[^>]+>/g, "").trim();
  const hasImages = /<img\b/i.test(htmlSnippet) || /<svg\b/i.test(htmlSnippet);
  return strippedText.length === 0 && !hasImages;
}

export async function convertEpubToPdf(epubBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(epubBuffer);
  const opfPath = await findOpfPath(zip);

  if (!opfPath) {
    throw new Error("Arquivo OPF do EPUB não encontrado.");
  }

  const { hrefs, baseDir } = await extractSpineHrefs(zip, opfPath);

  const chapterHtmls: string[] = [];
  for (const href of hrefs) {
    const zipPath = normalizeZipPath(baseDir, href);
    const file = zip.file(zipPath) || zip.file(href);
    if (!file) continue;

    const rawHtml = await file.async("string");
    const chapterBaseDir = zipPath.includes("/")
      ? zipPath.substring(0, zipPath.lastIndexOf("/"))
      : "";

    const inlined = await inlineChapterAssets(zip, rawHtml, chapterBaseDir);

    // Skip empty chapters to prevent blank starting pages
    if (isContentVisuallyEmpty(inlined)) {
      continue;
    }

    const isSingleImage = /^\s*<img\b[^>]*\/?>\s*$/i.test(inlined.trim());
    const containerClass = isSingleImage ? "epub-chapter epub-chapter-image" : "epub-chapter";

    chapterHtmls.push(`<div class="${containerClass}">${inlined}</div>`);
  }

  const unifiedHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 18mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111111 !important;
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 11pt;
      line-height: 1.6;
      width: 100% !important;
    }
    body {
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    .epub-chapter {
      page-break-before: always;
      break-before: page;
      clear: both;
      width: 100%;
    }
    .epub-chapter:first-of-type {
      page-break-before: avoid !important;
      break-before: avoid !important;
    }
    .epub-chapter-image {
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: "Helvetica Neue", Arial, sans-serif;
      page-break-after: avoid;
      break-after: avoid;
      color: #1a1a1a;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 1.8em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.3em; }
    p {
      margin-top: 0;
      margin-bottom: 0.8em;
      text-align: justify;
      text-justify: inter-word;
      orphans: 2;
      widows: 2;
    }
    img, svg, figure {
      max-width: 100% !important;
      max-height: 230mm !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      display: block !important;
      margin: 10px auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .epub-cover-img {
      max-height: 240mm !important;
      max-width: 175mm !important;
      object-fit: contain !important;
    }
    blockquote {
      margin: 1em 2em;
      font-style: italic;
      color: #444444;
      border-left: 3px solid #ccc;
      padding-left: 1rem;
    }
  </style>
</head>
<body>
  ${chapterHtmls.join("\n")}
</body>
</html>`;

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

  const browser = await puppeteer.launch({
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(unifiedHtml, { waitUntil: "domcontentloaded" });

    const pdfUint8Array = await page.pdf({
      format: "A4",
      margin: {
        top: "18mm",
        bottom: "18mm",
        left: "15mm",
        right: "15mm",
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="font-size: 9px; font-family: sans-serif; text-align: center; width: 100%; color: #888888;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}
