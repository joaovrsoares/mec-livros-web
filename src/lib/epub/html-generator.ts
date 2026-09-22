import JSZip from "jszip";
import { normalizeZipPath } from "./epub-parser";
import { parseAndSanitizeCss, formatChapterStyleBlock } from "./css-sanitizer";

export function getMimeType(filename: string): string {
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

export function getChapterAnchorId(zipPath: string): string {
  return "ch-" + zipPath.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

export async function inlineCssWithFonts(
  zip: JSZip,
  cssContent: string,
  cssBaseDir: string,
  /** Cumulative byte budget shared across all @font-face embeds in one PDF */
  fontBudget: { used: number; max: number }
): Promise<string> {
  // Normalize malformed "font-face {" (missing @) that some EPUB CSS files contain
  let result = cssContent.replace(/(^|[\s;}])font-face\s*\{/gi, "$1@font-face {");

  const fontFaces = [...result.matchAll(/@font-face\s*\{[^}]*\}/gi)];
  for (const ff of fontFaces) {
    let replaced = ff[0];
    const urls = [...ff[0].matchAll(/url\((?:["']?)([^"')\s]+)(?:["']?)\)/gi)];
    for (const u of urls) {
      const src = u[1].trim();
      if (src.startsWith("data:") || src.startsWith("http")) continue;
      const zipPath = normalizeZipPath(cssBaseDir, src);
      const fontFile = zip.file(zipPath) || zip.file(src);
      if (!fontFile) continue;

      const buf = await fontFile.async("nodebuffer");
      // Skip individual fonts larger than 512 KB or if total budget is exceeded (4 MB)
      if (buf.length > 512 * 1024 || fontBudget.used + buf.length > fontBudget.max) {
        continue;
      }
      fontBudget.used += buf.length;

      const ext = src.split(".").pop()?.toLowerCase() || "";
      const mime =
        ext === "woff2" ? "font/woff2" :
        ext === "woff"  ? "font/woff"  :
        ext === "ttf"   ? "font/ttf"   :
        ext === "otf"   ? "font/otf"   :
        "font/ttf";
      const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
      replaced = replaced.replace(u[0], `url("${dataUri}")`);
    }
    result = result.replace(ff[0], replaced);
  }

  // Strip remote http URLs from non-font rules
  result = result.replace(/url\((?:["']?)https?:[^"')\s]+(?:["']?)\)/gi, "url()");

  return result;
}

export async function inlineChapterAssets(
  zip: JSZip,
  htmlContent: string,
  chapterBaseDir: string,
  fontBudget: { used: number; max: number },
  cssCache: Map<string, string>,
  options?: { bookId?: number | string; chapterAnchorId?: string }
): Promise<string> {
  let processed = htmlContent;

  const linkStylesheets: string[] = [];
  const hrefExtract = /href=["']([^"']+)["']/i;
  const linkMatches = [...htmlContent.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)];
  for (const lm of linkMatches) {
    const hrefM = hrefExtract.exec(lm[0]);
    if (!hrefM) continue;
    const href = hrefM[1].trim();
    if (href.startsWith("http")) continue;
    const cssZipPath = normalizeZipPath(chapterBaseDir, href);
    
    // We cache based on zipPath + chapterAnchorId combo since scoping is per-chapter
    const cacheKey = cssZipPath + "|" + (options?.chapterAnchorId || "");
    if (cssCache.has(cacheKey)) {
      linkStylesheets.push(cssCache.get(cacheKey)!);
      continue;
    }
    const cssBaseDir = cssZipPath.includes("/") ? cssZipPath.substring(0, cssZipPath.lastIndexOf("/")) : "";
    const cssFile = zip.file(cssZipPath) || zip.file(href);
    if (cssFile) {
      const rawCss = await cssFile.async("string");
      const resolvedCss = await inlineCssWithFonts(zip, rawCss, cssBaseDir, fontBudget);
      const parsed = parseAndSanitizeCss(resolvedCss, options);
      const styleBlock = formatChapterStyleBlock(parsed, options?.chapterAnchorId);
      cssCache.set(cacheKey, styleBlock);
      linkStylesheets.push(styleBlock);
    }
  }

  processed = processed.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>\s*/gi, "");

  processed = processed.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (fullMatch, cssBody) => {
    const parsed = parseAndSanitizeCss(cssBody, options);
    return formatChapterStyleBlock(parsed, options?.chapterAnchorId);
  });

  if (linkStylesheets.length > 0) {
    if (processed.includes("</head>")) {
      processed = processed.replace("</head>", `${linkStylesheets.join("\n")}\n</head>`);
    } else {
      processed = linkStylesheets.join("\n") + "\n" + processed;
    }
  }

  const srcRegex = /(<img|<image|<svg\b[^>]*>[\s\S]*?<image)\s+([^>]*)\bsrc=["']([^"']+)["']/gi;
  const hrefSvgRegex = /(<image\s+[^>]*)\bhref=["']([^"']+)["']/gi;
  const xlinkHrefSvgRegex = /(<image\s+[^>]*)\bxlink:href=["']([^"']+)["']/gi;

  const replaceUrl = async (full: string, prefix: string, attrs: string, src: string, isHref = false) => {
    if (src.startsWith("data:") || src.startsWith("http")) return full;
    const cleanSrc = src.split("#")[0].split("?")[0];
    const imagePath = normalizeZipPath(chapterBaseDir, cleanSrc);
    const file = zip.file(imagePath);
    if (file) {
      const imgBuffer = await file.async("nodebuffer");
      const mimeType = getMimeType(imagePath);
      const dataUri = `data:${mimeType};base64,${imgBuffer.toString("base64")}`;
      if (isHref) {
        return `${prefix} href="${dataUri}"`;
      } else {
        return `${prefix} ${attrs} src="${dataUri}"`;
      }
    }
    return full;
  };

  const srcMatches = [...processed.matchAll(srcRegex)];
  for (const m of srcMatches) {
    const replacement = await replaceUrl(m[0], m[1], m[2] || "", m[3]);
    processed = processed.replace(m[0], replacement);
  }

  const hrefMatches = [...processed.matchAll(hrefSvgRegex)];
  for (const m of hrefMatches) {
    const replacement = await replaceUrl(m[0], m[1], "", m[2], true);
    processed = processed.replace(m[0], replacement);
  }

  const xlinkMatches = [...processed.matchAll(xlinkHrefSvgRegex)];
  for (const m of xlinkMatches) {
    const replacement = await replaceUrl(m[0], m[1], "", m[2], true);
    processed = processed.replace(m[0], replacement.replace("href=", "xlink:href="));
  }

  const bodyMatch = processed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : processed;
}

export function bridgeDemotedHeadingCss(cssText: string): string {
  const bridged: string[] = [];
  const ruleRegex = /([^{}@]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRegex.exec(cssText)) !== null) {
    const selector = m[1].trim();
    const declarations = m[2];
    if (!selector || /@font-face|@page/i.test(selector)) continue;
    if (!/\bh[1-6]\b/i.test(selector)) continue;
    const bridgedSelector = selector.replace(/\bh([1-6])\b/gi, "div.epub-non-toc-h$1");
    if (bridgedSelector !== selector) {
      bridged.push(`${bridgedSelector} {${declarations}}`);
    }
  }
  if (bridged.length === 0) return cssText;
  return `${cssText}\n${bridged.join("\n")}`;
}

export function bridgeDemotedHeadingStyles(chapterHtml: string): string {
  return chapterHtml.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (full, css) => {
    const bridged = bridgeDemotedHeadingCss(css);
    if (bridged === css) return full;
    return full.replace(css, bridged);
  });
}

export function isContentVisuallyEmpty(htmlSnippet: string): boolean {
  const strippedText = htmlSnippet.replace(/<[^>]+>/g, "").trim();
  const hasImages = /<img\b/i.test(htmlSnippet) || /<svg\b/i.test(htmlSnippet);
  return strippedText.length === 0 && !hasImages;
}

export function isOnlyImageContent(htmlSnippet: string): boolean {
  const noStyles = htmlSnippet.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const strippedText = noStyles.replace(/<[^>]+>/g, "").trim();
  const hasImages = /<img\b/i.test(htmlSnippet);
  return strippedText.length === 0 && hasImages;
}
