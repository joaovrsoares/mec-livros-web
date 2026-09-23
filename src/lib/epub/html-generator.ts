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

  // Extract <style> tags from HTML so chapter-specific inline styles are preserved
  const inlineStyles: string[] = [];
  processed = processed.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_fullMatch, cssBody) => {
    const parsed = parseAndSanitizeCss(cssBody, options);
    const formatted = formatChapterStyleBlock(parsed, options?.chapterAnchorId);
    if (formatted) inlineStyles.push(formatted);
    return "";
  });

  // Extract <body> content if present
  const bodyMatch = processed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : processed;

  // Prepend linked stylesheets first, then inline styles (inline wins over linked)
  const allStyles = [...linkStylesheets, ...inlineStyles];
  if (allStyles.length > 0) {
    bodyContent = allStyles.join("\n") + "\n" + bodyContent;
  }

  // Strip any rogue @page rules
  bodyContent = bodyContent.replace(/@page\b[^{]*\{[^}]*\}/gi, "");

  // 1. Convert SVG tags wrapping <image> / <svg:image> to <img> tags
  bodyContent = bodyContent.replace(
    /<svg\b[^>]*>(?:[\s\S]*?)<(?:svg:)?image\b([^>]*?)(?:\/?>|>(?:[\s\S]*?)<\/(?:svg:)?image>)(?:[\s\S]*?)<\/svg>/gi,
    (_match, attrs) => {
      const cleanAttrs = attrs.replace(/\b(?:width|height)=["'][^"']*["']/gi, "");
      return `<img ${cleanAttrs} class="epub-cover-img" />`;
    }
  );

  // 2. Convert standalone <image> / <svg:image> tags to <img> tags
  bodyContent = bodyContent.replace(
    /<(?:svg:)?image\b([^>]*?)(?:\/?>|>(?:[\s\S]*?)<\/(?:svg:)?image>)/gi,
    (_match, attrs) => `<img ${attrs} />`
  );

  // 3. In <img> tags, if xlink:href or href is used instead of src, convert to src
  bodyContent = bodyContent.replace(
    /<img\b([^>]*?)(?:xlink:href|href)=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, hrefVal, after) => {
      if (/\bsrc=/i.test(match)) return match;
      return `<img ${before} src="${hrefVal}" ${after}>`;
    }
  );

  // 4. Pre-read and convert all referenced local images to Base64 Data URIs
  const imgTagRegex = /<img\b([^>]*?)>/gi;
  const imageSrcs = new Set<string>();
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = imgTagRegex.exec(bodyContent)) !== null) {
    const attrs = tagMatch[1];
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      const src = srcMatch[1].trim();
      if (!src.startsWith("data:") && !src.startsWith("http://") && !src.startsWith("https://")) {
        imageSrcs.add(src);
      }
    }
  }

  const dataUriMap = new Map<string, string>();
  for (const src of imageSrcs) {
    const cleanSrc = src.split("#")[0].split("?")[0];
    const imagePath = normalizeZipPath(chapterBaseDir, cleanSrc);
    const file = zip.file(imagePath);
    if (file) {
      const imgBuffer = await file.async("nodebuffer");
      const mimeType = getMimeType(imagePath);
      dataUriMap.set(src, `data:${mimeType};base64,${imgBuffer.toString("base64")}`);
    }
  }

  // 5. Replace src and sanitize alt in <img> tags
  bodyContent = bodyContent.replace(/<img\b([^>]*?)>/gi, (_match, attrs) => {
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) return `<img ${attrs}>`;

    const origSrc = srcMatch[1].trim();
    const resolvedDataUri = dataUriMap.get(origSrc) || origSrc;
    let newAttrs = attrs.replace(/\bsrc=["'][^"']+["']/i, `src="${resolvedDataUri}"`);

    // Sanitize alt attribute: if alt contains image file paths, data URIs, or is identical to src, clean it
    newAttrs = newAttrs.replace(/\balt=["']([^"']*)["']/i, (_altMatch: string, altVal: string) => {
      const trimmed = altVal.trim();
      if (
        trimmed.startsWith("data:") ||
        trimmed === origSrc ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(trimmed)
      ) {
        return 'alt=""';
      }
      return `alt="${altVal}"`;
    });

    return `<img ${newAttrs}>`;
  });

  // 6. Remove any trailing XHTML </img> tags
  bodyContent = bodyContent.replace(/<\/img>/gi, "");

  // 7. Remove problematic fixed-heights / absolute positioning styles in inline attributes
  bodyContent = bodyContent.replace(
    /style=["'][^"']*(?:height\s*:\s*(?:100%|98%|95%)|position\s*:\s*absolute|transform\s*:)[^"']*["']/gi,
    ""
  );

  // 8. Remove EPUB navigation landmarks / page-lists to prevent outline pollution
  bodyContent = bodyContent.replace(
    /<nav\b[^>]*epub:type=["'](?:landmarks|page-list)["'][^>]*>[\s\S]*?<\/nav>/gi,
    ""
  );

  // 9. Ensure anchor tags with name="..." also have id="..." for modern PDF anchor targeting
  bodyContent = bodyContent.replace(
    /<a\b([^>]*?)name=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, nameVal, after) => {
      if (/\bid=/i.test(match)) return match;
      return `<a ${before}id="${nameVal}" name="${nameVal}"${after}>`;
    }
  );

  // 10. Rewrite relative links to internal PDF anchor jumps
  bodyContent = bodyContent.replace(
    /<a\b([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, hrefVal, after) => {
      const trimmed = hrefVal.trim();
      if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("mailto:") ||
        trimmed.startsWith("tel:") ||
        trimmed.startsWith("javascript:") ||
        trimmed.startsWith("data:") ||
        trimmed.startsWith("#")
      ) {
        return match;
      }

      const [pathPart, hashPart] = trimmed.split("#");
      if (!pathPart) {
        return hashPart ? `<a ${before}href="#${hashPart}"${after}>` : match;
      }

      const ext = pathPart.split(".").pop()?.toLowerCase() || "";
      if (!["xhtml", "html", "htm", "xml"].includes(ext)) {
        return match;
      }

      const targetZipPath = normalizeZipPath(chapterBaseDir, pathPart);
      if (hashPart) {
        return `<a ${before}href="#${hashPart}"${after}>`;
      }
      const targetAnchorId = getChapterAnchorId(targetZipPath);
      return `<a ${before}href="#${targetAnchorId}"${after}>`;
    }
  );

  // 11. Ensure headings have non-breaking spaces around <br> and child tags
  bodyContent = bodyContent.replace(
    /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, content) => {
      let fixedContent = content
        .replace(/(Parte\s+\d+)(?!:)/gi, "$1:")
        .replace(/<br\s*\/?>/gi, "&#160;<br/>")
        .replace(/<\/(small|span|em|strong|b|i)>/gi, "</$1>&#160;");
      fixedContent = fixedContent
        .replace(/(?:&#160;)+/g, "&#160;")
        .replace(/^&#160;/, "");
      return `<${tag}${attrs}>${fixedContent}</${tag}>`;
    }
  );

  // 12. Wrap paragraph-initial dialogue dashes so the gap after the dash stays constant
  bodyContent = bodyContent.replace(
    /<p\b([^>]*)>((?:\s|<(?!\/?p[\s>/])[^>]+>)*?)(—|–|―|&mdash;|&ndash;|&#8212;|&#8211;|&#x2014;|&#x2013;)((?:\s|&nbsp;|&#160;|&#32;)*)/gi,
    (_m, attrs, prefix, dash) => `<p${attrs}>${prefix}<span class="epub-dialog-dash">${dash}</span>`
  );

  return bodyContent;
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
