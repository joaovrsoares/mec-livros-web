export function scaleCssFontSizes(css: string, multiplier: number): string {
  if (multiplier <= 1.0) return css;
  return css.replace(/\bfont-size\s*:\s*([0-9]*\.?[0-9]+)\s*(pt|px|em|rem|%)/gi, (_match, numStr, unit) => {
    const num = parseFloat(numStr);
    const scaled = Math.round(num * multiplier * 100) / 100;
    return `font-size: ${scaled}${unit}`;
  });
}

const INLINE_TAGS = new Set([
  "span", "a", "em", "strong", "b", "i", "small", "sub", "sup",
  "code", "abbr", "cite", "mark", "time", "s", "strike", "u"
]);
const HEADING_SELECTOR_REGEX = /\b(h[1-6]|titul|title|heading|capitulo|chapter|enter|tit)\b/i;
const SECONDARY_SELECTOR_REGEX = /(footnote|caption|small|sub|sup|nota|fn|recuado|cred|credit|credito|copyright|legenda|ficha|isbn|sumario|indice|toc|header|footer|pag|page|num|ref|sidebar|aside|charoverride|apresentador|autor|epigrafe|dedicatoria|colofon|sinopse)/i;

const SAFE_BODY_PROP_PREFIXES = [
  "font-family", "font-style", "font-weight", "line-height",
  "letter-spacing", "word-spacing", "text-transform", "hyphens",
  "-epub-hyphens", "-webkit-hyphens", "widows", "orphans", "color"
];

export function extractSafeBodyDeclarations(block: string): string {
  const declarations = block.split(";");
  const kept: string[] = [];
  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim();
    if (
      SAFE_BODY_PROP_PREFIXES.some(p => prop === p || prop.startsWith(p + "-"))
    ) {
      kept.push(`${prop}: ${val}`);
    }
  }
  return kept.join("; ");
}

export interface ParsedCssResult {
  fontFaces: string;
  scopedCss: string;
}

export interface SanitizeEpubCssOptions {
  bookId?: number | string;
  chapterAnchorId?: string;
}

/**
 * Parses and sanitizes EPUB CSS:
 * - Separates global `@font-face` blocks from chapter-scoped rules
 * - Preserves typography from `body` selectors as `:scope` rules while stripping layout properties
 * - Sanitizes bare `p` rules
 * - Proportionally scales font sizes if small base fonts (<= 11.5pt) are declared and no normal body text exists
 */
export function parseAndSanitizeCss(css: string, options?: SanitizeEpubCssOptions): ParsedCssResult {
  // Strip CSS comments first so they don't break selector parsing or cause rules to be dropped
  const cleanCommentsCss = css.replace(/\/\*[\s\S]*?\*\//g, "");

  // Normalize malformed font-face missing leading @
  const normalizedCss = cleanCommentsCss.replace(/(^|[\s;}])font-face\s*\{/gi, "$1@font-face {");

  // Check if book is explicitly excluded from scaling (e.g. ID 300007576 - Memórias Póstumas de Brás Cubas)
  const isExcludedBook = options?.bookId !== undefined && String(options.bookId).trim() === "300007576";

  let scaleMultiplier = 1.0;

  if (!isExcludedBook) {
    // Detect if this CSS specifies unusually small body/paragraph fonts (<= 11.5pt equivalent)
    // Base body font in PDF is 14pt (so 1em = 14pt, 100% = 14pt, 1px = 0.75pt)
    const bodyParagraphSizes: number[] = [];

    let scanI = 0;
    while (scanI < normalizedCss.length) {
      const openBrace = normalizedCss.indexOf("{", scanI);
      if (openBrace === -1) break;
      const selector = normalizedCss.slice(scanI, openBrace).trim().toLowerCase();
      let depth = 1;
      let j = openBrace + 1;
      while (j < normalizedCss.length && depth > 0) {
        if (normalizedCss[j] === "{") depth++;
        else if (normalizedCss[j] === "}") depth--;
        j++;
      }
      const block = normalizedCss.slice(openBrace + 1, j - 1);
      // Skip CSS comments (/* ... */)
      if (selector.startsWith("/*") || block.trim().startsWith("/*")) {
        scanI = j;
        continue;
      }

      const fsMatch = /\bfont-size\s*:\s*([0-9]*\.?[0-9]+)\s*(pt|px|em|rem|%)/i.exec(block);
      if (fsMatch) {
        // Skip rules with vertical-align: super or sub (superscripts/subscripts like footnotes/powers)
        const hasVerticalAlignSuperSub = /vertical-align\s*:\s*(super|sub)/i.test(block);
        if (!hasVerticalAlignSuperSub) {
          const parts = selector.split(",").map(p => p.trim());
          let isBodyCandidate = false;
          for (const part of parts) {
            const baseTag = (part.split(/[.#\[:>+~]/)[0] || "").trim();
            // Skip inline tags
            if (INLINE_TAGS.has(baseTag)) continue;
            // Skip headings/titles
            if (HEADING_SELECTOR_REGEX.test(part)) continue;
            // Skip secondary elements (footnotes, captions, etc.)
            if (SECONDARY_SELECTOR_REGEX.test(part)) continue;

            isBodyCandidate = true;
            break;
          }

          if (isBodyCandidate) {
            const val = parseFloat(fsMatch[1]);
            const unit = fsMatch[2].toLowerCase();
            let ptVal = val;
            if (unit === "pt") ptVal = val;
            else if (unit === "px") ptVal = val * 0.75;
            else if (unit === "em" || unit === "rem") ptVal = val * 14.0;
            else if (unit === "%") ptVal = (val / 100.0) * 14.0;
            bodyParagraphSizes.push(ptVal);
          }
        }
      }

      scanI = j;
    }

    // Only apply font scaling if:
    // 1. There are body paragraphs defined with font sizes
    // 2. NONE of the body paragraphs has normal reading size (>= 12.5pt)
    // 3. The main body font is small (<= 11.5pt)
    const hasNormalBodyFont = bodyParagraphSizes.some(pt => pt >= 12.5);
    if (!hasNormalBodyFont && bodyParagraphSizes.length > 0) {
      const maxBodySize = Math.max(...bodyParagraphSizes);
      if (maxBodySize <= 11.5 && maxBodySize >= 6.0) {
        // Bring small body font up to ~14pt, capped between 1.15x and 1.35x
        scaleMultiplier = Math.min(1.35, Math.max(1.15, 14.0 / maxBodySize));
      }
    }
  }

  // Tokenise into blocks by scanning for { } pairs
  const fontFaceBlocks: string[] = [];
  const scopedBlocks: string[] = [];

  let i = 0;
  while (i < normalizedCss.length) {
    const openBrace = normalizedCss.indexOf("{", i);
    if (openBrace === -1) {
      break;
    }

    const selector = normalizedCss.slice(i, openBrace).trim();

    // Find matching closing '}'
    let depth = 1;
    let j = openBrace + 1;
    while (j < normalizedCss.length && depth > 0) {
      if (normalizedCss[j] === "{") depth++;
      else if (normalizedCss[j] === "}") depth--;
      j++;
    }
    const block = normalizedCss.slice(openBrace + 1, j - 1);
    const cleanedBlock = block.replace(/page-break-before\s*:\s*always\s*;?/gi, "");

    // Skip CSS comments
    if (selector.startsWith("/*") || cleanedBlock.trim().startsWith("/*")) {
      i = j;
      continue;
    }
    const fullRule = `${selector} {${cleanedBlock}}`;

    // Always strip @page — we control page size/margins globally
    if (/^@page\b/i.test(selector)) {
      i = j;
      continue;
    }

    // For @font-face — keep in global fontFaceBlocks
    if (/^@font-face\b/i.test(selector)) {
      fontFaceBlocks.push(fullRule);
      i = j;
      continue;
    }

    // For other @media / @supports at-rules — recurse to sanitize the inner content
    if (/^@/i.test(selector)) {
      const inner = parseAndSanitizeCss(block, options);
      if (inner.fontFaces.trim()) {
        fontFaceBlocks.push(inner.fontFaces.trim());
      }
      if (inner.scopedCss.trim()) {
        scopedBlocks.push(`${selector} {\n${inner.scopedCss}\n}`);
      }
      i = j;
      continue;
    }

    // Split compound selectors and check each part
    const selectorParts = selector.split(",").map(s => s.trim());
    const safeSelectors: string[] = [];
    let hasBodySelector = false;

    for (const part of selectorParts) {
      const base = part.split(/[\s>+~]/).shift()?.toLowerCase().trim() || "";

      // Global layout selectors: body or html
      if (base === "body" || base === "html") {
        if (part === "body" || part === "html" || /^html\s*body$/i.test(part)) {
          hasBodySelector = true;
        }
        continue;
      }

      if (base === "*") {
        continue;
      }

      // Bare element selectors that carry layout-breaking properties (e.g. bare p)
      const isBareParagraph = /^p$/.test(base) && !/[.#\[:>+~]/.test(part);
      if (isBareParagraph) {
        // Strip text-align from bare p rules; keep everything else
        const cleaned = block.replace(/\btext-align\s*:[^;]+;?/gi, "").trim();
        if (cleaned) {
          safeSelectors.push(part + ` {${cleaned}}`);
        }
        continue;
      }

      safeSelectors.push(part);
    }

    // If body had safe typographic declarations, map them to :scope
    if (hasBodySelector) {
      const safeBodyDecls = extractSafeBodyDeclarations(cleanedBlock);
      if (safeBodyDecls) {
        scopedBlocks.push(`:scope {${safeBodyDecls}}`);
      }
    }

    if (safeSelectors.length > 0) {
      const hasInlineRules = safeSelectors.some(r => r.includes("{"));
      if (hasInlineRules) {
        for (const r of safeSelectors) {
          if (r.includes("{")) {
            scopedBlocks.push(r);
          } else {
            scopedBlocks.push(`${r} {${block}}`);
          }
        }
      } else {
        scopedBlocks.push(`${safeSelectors.join(", ")} {${block}}`);
      }
    }

    i = j;
  }

  let finalScopedCss = scopedBlocks.join("\n");
  if (scaleMultiplier > 1.0) {
    finalScopedCss = scaleCssFontSizes(finalScopedCss, scaleMultiplier);
  }

  return {
    fontFaces: fontFaceBlocks.join("\n"),
    scopedCss: finalScopedCss,
  };
}

export function formatChapterStyleBlock(
  parsed: ParsedCssResult,
  chapterAnchorId?: string
): string {
  const parts: string[] = [];
  if (parsed.fontFaces.trim()) {
    parts.push(parsed.fontFaces.trim());
  }
  if (parsed.scopedCss.trim()) {
    if (chapterAnchorId) {
      parts.push(`@scope (#${chapterAnchorId}) {\n${parsed.scopedCss.trim()}\n}`);
    } else {
      parts.push(parsed.scopedCss.trim());
    }
  }
  if (parts.length === 0) return "";
  return `<style>\n${parts.join("\n")}\n</style>`;
}

/**
 * Strip EPUB CSS rules that affect global layout and would conflict with PDF rendering:
 * - body, html, * selectors (margin, padding, background, text-align, font-size overrides)
 * - bare p { text-align } rules (EPUB often centres paragraphs for e-reader layout)
 * - @page rules (we manage page size/margins ourselves)
 * We keep ALL class-specific, id-specific and element+class selectors so .macaca etc. work.
 * Also proportionally scales font sizes if small base fonts (<= 11.5pt / 15px / 0.82em) are declared
 * and no normal-sized reading paragraphs exist.
 */
export function sanitizeEpubCss(css: string, options?: SanitizeEpubCssOptions): string {
  const parsed = parseAndSanitizeCss(css, options);
  const parts: string[] = [];
  if (parsed.fontFaces.trim()) {
    parts.push(parsed.fontFaces.trim());
  }
  if (parsed.scopedCss.trim()) {
    if (options?.chapterAnchorId) {
      parts.push(`@scope (#${options.chapterAnchorId}) {\n${parsed.scopedCss.trim()}\n}`);
    } else {
      parts.push(parsed.scopedCss.trim());
    }
  }
  return parts.join("\n");
}
