import JSZip from "jszip";
import { findOpfPath, extractOpfMetadata, extractSpineHrefs, extractTocMap, normalizeZipPath, escapeHtml } from "./epub-parser";
import { inlineChapterAssets, isContentVisuallyEmpty, isOnlyImageContent, getChapterAnchorId, bridgeDemotedHeadingStyles } from "./html-generator";
import { generatePdfFromHtml, injectPdfMetadata, mergePdfBuffers } from "./pdf-renderer";

export interface PdfMetadata {
  title?: string;
  author?: string;
  bookId?: number | string;
}

export function buildUnifiedHtml(
  title: string,
  author: string,
  chapterHtml: string
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  ${author ? `<meta name="author" content="${escapeHtml(author)}" />` : ""}
  <style>
    @page {
      size: A4 portrait;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111111 !important;
      font-family: "FreeSerif", "Georgia", "Times New Roman", serif, "Noto Serif CJK KR", "Noto Sans CJK KR";
      font-size: 14pt;
      line-height: 1.6;
      width: 100% !important;
    }
    .south-korean, [lang*="ko"], [lang*="zh"], [lang*="ja"], [lang*="cjk"] {
      font-family: "Noto Serif CJK KR", "Noto Sans CJK KR", "FreeSerif", serif !important;
    }
    div[class*="epub-non-toc-h"] {
      display: block;
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid;
    }
    div.epub-non-toc-h1 { font-size: 2em; margin: 0.67em 0; }
    div.epub-non-toc-h2 { font-size: 1.5em; margin: 0.83em 0; }
    div.epub-non-toc-h3 { font-size: 1.17em; margin: 1em 0; }
    body {
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    .epub-outline-heading {
      display: block !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 500px !important;
      height: 1px !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 1pt !important;
      line-height: 1px !important;
      color: transparent !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      border: none !important;
      pointer-events: none !important;
    }
    .epub-outline-cover-heading {
      display: block !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 500px !important;
      height: 1px !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 1pt !important;
      line-height: 1px !important;
      color: transparent !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      border: none !important;
      pointer-events: none !important;
    }
    .epub-chapter {
      page-break-before: always;
      break-before: page;
      clear: both;
      width: 100%;
    }
    .epub-chapter:first-of-type,
    .epub-chapter:first-child,
    .epub-cover-page {
      page-break-before: avoid !important;
      break-before: avoid !important;
    }
    /* Cover chapter: centered vertically and horizontally on the first sheet with margins */
    .epub-cover-page {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
      width: 100% !important;
      height: 247mm !important;
      min-height: 247mm !important;
      max-height: 247mm !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      page-break-before: avoid !important;
      break-before: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      position: relative !important;
    }
    .epub-cover-page div,
    .epub-cover-page p,
    .epub-cover-page figure {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      margin: 0 auto !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      text-align: center !important;
    }
    .epub-cover-page img,
    .epub-cover-page #cover-image img,
    img.epub-cover-img {
      display: block !important;
      margin: auto !important;
      max-width: 100% !important;
      max-height: 100% !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    /* Prevent duplicated list numbers in Table of Contents & apply generous section spacing */
    nav ol,
    nav ul,
    nav li,
    [epub\\:type="toc"] ol,
    [epub\\:type="toc"] li,
    [role="doc-toc"] ol,
    [role="doc-toc"] li,
    .toc ol,
    .toc ul,
    .toc li {
      list-style: none !important;
      list-style-type: none !important;
      padding-left: 0 !important;
      margin-left: 0 !important;
    }
    nav[epub\\:type="toc"] ol,
    nav[role="doc-toc"] ol,
    nav#toc ol,
    .toc ol {
      text-align: center !important;
      padding: 0 !important;
      margin: 0 auto !important;
    }
    /* Section headers (Parte 1: Pássaro, Parte 2: Noite, Parte 3: Chama, Palavras da autora) */
    nav[epub\\:type="toc"] > ol > li,
    nav[role="doc-toc"] > ol > li,
    nav#toc > ol > li,
    .toc > ol > li,
    li.destaque {
      margin-top: 1.8em !important;
      margin-bottom: 1.4em !important;
      list-style: none !important;
      list-style-type: none !important;
    }
    /* Section link itself rendered as a bold title block */
    li.destaque > a,
    nav[epub\\:type="toc"] > ol > li > a,
    nav[role="doc-toc"] > ol > li > a,
    nav#toc > ol > li > a {
      display: inline-block !important;
      font-weight: bold !important;
      margin-bottom: 0.5em !important;
    }
    /* Subchapter items (1. Cristal, 2. Linha, etc.) */
    nav[epub\\:type="toc"] ol ol li,
    nav[role="doc-toc"] ol ol li,
    nav#toc ol ol li,
    .toc ol ol li {
      margin-top: 0.35em !important;
      margin-bottom: 0.35em !important;
      font-weight: normal !important;
    }
    [hidden], li[hidden] {
      display: none !important;
    }
    nav[epub\\:type="landmarks"],
    nav#landmarks {
      display: none !important;
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
    /* Heading baseline — font-family intentionally omitted so EPUB book fonts win */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      break-after: avoid;
    }
    /*
     * Paragraph defaults — these use plain element selectors (specificity 0-0-1)
     * so any EPUB class rule like .macaca{text-align:center} (specificity 0-1-0) still wins.
     * text-align:justify gives the normal body text the correct book layout.
     */
    p {
      margin-top: 0;
      margin-bottom: 0.8em;
      text-align: justify;
      text-justify: inter-word;
      orphans: 2;
      widows: 2;
    }
    img {
      max-width: 100% !important;
      max-height: 230mm !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    /* Block-level images (wrapped in p or figure — centre them) */
    figure, p > img:only-child, .epub-chapter-image img {
      display: block !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    .epub-cover-img {
      display: block !important;
      max-height: 240mm !important;
      max-width: 175mm !important;
      margin: 0 auto !important;
      object-fit: contain !important;
    }
    svg, figure {
      max-width: 100% !important;
      max-height: 230mm !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    blockquote {
      margin: 1em 2em;
      font-style: italic;
      border-left: 3px solid #ccc;
      padding-left: 1rem;
    }
  </style>
</head>
<body>
  ${chapterHtml}
</body>
</html>`;
}

export async function convertEpubToPdf(
  epubBuffer: Buffer,
  metadata?: PdfMetadata
): Promise<Buffer> {
  console.log("[convertEpubToPdf] Starting conversion, buffer size:", epubBuffer.length);
  const zip = await JSZip.loadAsync(epubBuffer);
  console.log("[convertEpubToPdf] Zip loaded, files:", Object.keys(zip.files).length);
  const opfPath = await findOpfPath(zip);

  if (!opfPath) {
    throw new Error("Arquivo OPF do EPUB não encontrado.");
  }

  const opfFile = zip.file(opfPath);
  const opfXml = opfFile ? await opfFile.async("string") : "";
  const opfMeta = opfXml ? extractOpfMetadata(opfXml) : {};

  const resolvedTitle = metadata?.title?.trim() || opfMeta.title || "Livro";
  const resolvedAuthor = metadata?.author?.trim() || opfMeta.author || "";

  console.log("[convertEpubToPdf] Title:", resolvedTitle, "Author:", resolvedAuthor);
  const { hrefs, baseDir } = await extractSpineHrefs(zip, opfPath);
  console.log("[convertEpubToPdf] Spine hrefs:", hrefs.length, "baseDir:", baseDir);
  const tocMap = await extractTocMap(zip, opfXml, opfPath);
  console.log("[convertEpubToPdf] TOC entries:", tocMap.size);

  const chapterHtmls: string[] = [];
  // Shared font byte budget: embed up to 4 MB of EPUB fonts total across all chapters
  const fontBudget = { used: 0, max: 4 * 1024 * 1024 };
  // CSS cache: resolved <style> blocks keyed by zip path (avoids re-embedding fonts per chapter)
  const cssCache = new Map<string, string>();
  let hasCoverBookmarkEmitted = false;

  for (const href of hrefs) {
    const zipPath = normalizeZipPath(baseDir, href);
    const file = zip.file(zipPath) || zip.file(href);
    if (!file) continue;

    const rawHtml = await file.async("string");
    const chapterBaseDir = zipPath.includes("/")
      ? zipPath.substring(0, zipPath.lastIndexOf("/"))
      : "";

    let inlined = await inlineChapterAssets(zip, rawHtml, chapterBaseDir, fontBudget, cssCache, { bookId: metadata?.bookId, chapterAnchorId: getChapterAnchorId(zipPath) });

    // Skip empty chapters to prevent blank starting pages
    if (isContentVisuallyEmpty(inlined)) {
      continue;
    }

    const isSingleImage = isOnlyImageContent(inlined);
    const tocInfo = tocMap.get(zipPath);
    if (tocInfo?.title && /Parte\s+\d+:/i.test(tocInfo.title)) {
      inlined = inlined.replace(/(Parte\s+\d+)(?!:)/gi, "$1:");
    }

    const hasExistingHeading = /<h[1-6]\b/i.test(inlined);

    const isFirstChapter = chapterHtmls.length === 0;
    const isCover =
      /^(?:capa|cover|titlepage)$/i.test(tocInfo?.title?.trim() || "") ||
      /^(?:capa|cover|titlepage)\.x?html?$/i.test(zipPath.split("/").pop() || "") ||
      (isFirstChapter && isSingleImage);

    const containerClass = isCover
      ? "epub-chapter epub-cover-page"
      : isSingleImage
      ? "epub-chapter epub-chapter-image"
      : "epub-chapter";
    const chapterAnchorId = getChapterAnchorId(zipPath);

    // Demote any <h1..h6> in non-TOC chapters so they don't produce rogue outline bookmarks.
    // Classes are merged into a single attribute (duplicate class attributes would drop
    // the EPUB classes in HTML parsers) and element-qualified CSS rules (e.g.
    // h1.numero-titulo) are bridged to div.epub-non-toc-hN equivalents so book fonts win.
    if (!tocInfo && !isCover) {
      inlined = inlined.replace(/<(\/)?h([1-6])\b([^>]*)>/gi, (_, slash, level, rest) => {
        if (slash) {
          return "</div>";
        }
        const classMatch = rest.match(/\bclass\s*=\s*["']([^"']*)["']/i);
        const existing = classMatch ? classMatch[1].trim() : "";
        const merged = `epub-non-toc-h${level}${existing ? ` ${existing}` : ""}`;
        let newRest: string = rest;
        if (classMatch) {
          newRest = newRest.replace(/\bclass\s*=\s*["'][^"']*["']/i, `class="${merged}"`);
        } else {
          newRest = ` class="${merged}"${newRest}`;
        }
        return `<div role="heading" aria-level="${level}"${newRest}>`;
      });
      inlined = bridgeDemotedHeadingStyles(inlined);
    }

    // If chapter is in tocMap and specifies a nested level (e.g. level 2 for subchapters), align heading tags
    if (tocInfo && tocInfo.level > 1 && hasExistingHeading) {
      inlined = inlined.replace(/<h[1-6]\b/gi, `<h${tocInfo.level}`);
      inlined = inlined.replace(/<\/h[1-6]>/gi, `</h${tocInfo.level}>`);
    }

    let outlineHeadingHtml = "";
    // Only inject outline heading if this chapter is legitimately in tocMap, has no existing heading, and is not cover
    if (tocInfo && !hasExistingHeading && !isCover) {
      outlineHeadingHtml = `<h${tocInfo.level} class="epub-outline-heading">${escapeHtml(tocInfo.title)}</h${tocInfo.level}>`;
    }

    let coverOutlineHtml = "";
    if (isCover && !hasCoverBookmarkEmitted) {
      coverOutlineHtml = `<h1 class="epub-outline-cover-heading" id="pdf-outline-cover">Capa</h1>`;
      hasCoverBookmarkEmitted = true;
    }

    chapterHtmls.push(`<div id="${chapterAnchorId}" class="${containerClass}">${coverOutlineHtml}${outlineHeadingHtml}${inlined}</div>`);
  }

  if (!hasCoverBookmarkEmitted && chapterHtmls.length > 0) {
    chapterHtmls[0] = chapterHtmls[0].replace(/^(<div\b[^>]*>)/i, `$1<h1 class="epub-outline-cover-heading" id="pdf-outline-cover">Capa</h1>`);
  }

  const unifiedHtml = buildUnifiedHtml(resolvedTitle, resolvedAuthor, chapterHtmls.join("\n"));
  const estimatedHtmlBytes = Buffer.byteLength(unifiedHtml, "utf8");
  console.log(`[convertEpubToPdf] HTML size ${estimatedHtmlBytes} bytes`);

  // Over 100MB of HTML -> batch process into chunks to prevent Puppeteer OOM
  const BATCH_THRESHOLD_BYTES = 100 * 1024 * 1024;
  if (estimatedHtmlBytes > BATCH_THRESHOLD_BYTES) {
    console.log("[convertEpubToPdf] Large HTML detected. Proceeding with batch rendering.");
    const batchPdfs: Buffer[] = [];
    const MAX_CHAPTERS_PER_BATCH = 15;
    
    for (let i = 0; i < chapterHtmls.length; i += MAX_CHAPTERS_PER_BATCH) {
      const chunk = chapterHtmls.slice(i, i + MAX_CHAPTERS_PER_BATCH);
      const chunkHtml = buildUnifiedHtml(resolvedTitle, resolvedAuthor, chunk.join("\n"));
      console.log(`[convertEpubToPdf] Rendering batch ${Math.floor(i/MAX_CHAPTERS_PER_BATCH) + 1}...`);
      const chunkPdf = await generatePdfFromHtml(chunkHtml, resolvedTitle);
      batchPdfs.push(chunkPdf);
    }
    
    console.log("[convertEpubToPdf] Merging batch PDFs...");
    const mergedRaw = await mergePdfBuffers(batchPdfs);
    return injectPdfMetadata(mergedRaw, { title: resolvedTitle, author: resolvedAuthor });
  }

  console.log("[convertEpubToPdf] HTML size OK, single-pass rendering");
  const pdfBuffer = await generatePdfFromHtml(unifiedHtml, resolvedTitle);
  return injectPdfMetadata(pdfBuffer, { title: resolvedTitle, author: resolvedAuthor });
}
