import JSZip from "jszip";

export function normalizeZipPath(baseDir: string, relativePath: string): string {
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

export async function findOpfPath(zip: JSZip): Promise<string | null> {
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

export async function extractSpineHrefs(
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

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function extractOpfMetadata(opfXml: string): { title?: string; author?: string } {
  const titleMatch = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;

  const creatorMatches: string[] = [];
  const creatorRegex = /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = creatorRegex.exec(opfXml)) !== null) {
    const creator = cm[1].replace(/<[^>]+>/g, "").trim();
    if (creator) {
      creatorMatches.push(decodeXmlEntities(creator));
    }
  }

  return {
    title: rawTitle ? decodeXmlEntities(rawTitle) : undefined,
    author: creatorMatches.length > 0 ? creatorMatches.join(", ") : undefined,
  };
}

export interface TocItem {
  title: string;
  level: number;
}

export function parseNcx(ncxXml: string, baseDir: string, map: Map<string, TocItem>) {
  // Same flat-list inference as parseNavDoc: a fully flat NCX (no nested
  // navPoints) nests purely numeric titles under the preceding header.
  const ncxHasNesting = /<navPoint\b[^>]*>(?:(?!<\/?navPoint\b)[\s\S])*<navPoint\b/i.test(ncxXml);
  const tagRegex =
    /<(\/)?navPoint\b[^>]*>|<navLabel>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<\/navLabel>|<content\s+[^>]*src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  let depth = 0;
  let pendingTitle: string | null = null;
  let sectionOpen = false;

  while ((match = tagRegex.exec(ncxXml)) !== null) {
    const fullMatch = match[0];
    if (fullMatch.startsWith("</navPoint")) {
      depth = Math.max(0, depth - 1);
    } else if (fullMatch.startsWith("<navPoint")) {
      depth++;
    } else if (match[2] !== undefined) {
      pendingTitle = decodeXmlEntities(match[2].replace(/<[^>]+>/g, "").trim());
    } else if (match[3] !== undefined) {
      const cleanSrc = match[3].split("#")[0].trim();
      const zipPath = normalizeZipPath(baseDir, cleanSrc);
      if (pendingTitle && !map.has(zipPath)) {
        let level = Math.min(Math.max(depth, 1), 6);
        if (!ncxHasNesting) {
          const numeric = /^\d+$/.test(pendingTitle);
          if (numeric && sectionOpen) {
            level = 2;
          } else {
            level = 1;
            if (!numeric) sectionOpen = true;
          }
        }
        map.set(zipPath, {
          title: pendingTitle,
          level,
        });
      }
      pendingTitle = null;
    }
  }
}

export function parseNavDoc(navHtml: string, baseDir: string, map: Map<string, TocItem>) {
  const tocNavMatch =
    navHtml.match(
      /<nav\b[^>]*(?:epub:type=["'][^"']*?\btoc\b[^"']*?["']|id=["']toc["'])[^>]*>([\s\S]*?)<\/nav>/i
    ) || navHtml.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i);

  let content = tocNavMatch ? tocNavMatch[1] : navHtml;

  // Remove hidden list items (EPUB 3 hidden attribute) so frontmatter like Folha de Rosto / Capa don't create extra chapters
  content = content.replace(/<(?:li|ol|div)\b[^>]*\bhidden\b[^>]*>[\s\S]*?<\/(?:li|ol|div)>/gi, "");

  // Flat single-level <ol> (no nested sublists)? Some publishers mark part
  // headers with <li class="..."> instead of nested <ol> (e.g. Torto Arado:
  // "Fio de corte" followed by flat "1".."15"). In that case infer nesting:
  // a classed <li> opens a level-1 section, and purely numeric titles that
  // follow nest under it at level 2. Structured TOCs keep depth-based levels.
  const hasNestedLists = /<ol\b[^>]*>(?:(?!<\/?ol\b)[\s\S])*<ol\b/i.test(content);

  const tagRegex =
    /<(\/)?ol\b[^>]*>|<li\b([^>]*)>|<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  let depth = 0;
  let liHasClass = false;
  let sectionOpen = false;

  while ((match = tagRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const head = fullMatch.slice(0, 3).toLowerCase();
    if (head === "</o") {
      depth = Math.max(0, depth - 1);
    } else if (head === "<ol") {
      depth++;
    } else if (head === "<li") {
      liHasClass = /\bclass\s*=\s*["'][^"']*["']/i.test(match[2] || "");
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const rawHref = match[3];
      const rawTitle = match[4];
      const cleanSrc = rawHref.split("#")[0].trim();
      if (
        !cleanSrc.startsWith("http://") &&
        !cleanSrc.startsWith("https://") &&
        !cleanSrc.startsWith("#")
      ) {
        const zipPath = normalizeZipPath(baseDir, cleanSrc);
        const title = decodeXmlEntities(rawTitle.replace(/<[^>]+>/g, "").trim());
        const isCover =
          /^(?:capa|cover)$/i.test(title) ||
          /^(?:capa|cover)\.x?html?$/i.test(cleanSrc.split("/").pop() || "");

        if (title && !isCover && !map.has(zipPath)) {
          let level = Math.min(Math.max(depth, 1), 6);
          if (!hasNestedLists) {
            const numeric = /^\d+$/.test(title);
            if (liHasClass) {
              level = 1;
              sectionOpen = true;
            } else if (numeric && sectionOpen) {
              level = 2;
            } else {
              level = 1;
              if (!numeric) sectionOpen = true;
            }
          }
          map.set(zipPath, {
            title,
            level,
          });
        }
      }
      liHasClass = false;
    }
  }
}

export async function extractTocMap(
  zip: JSZip,
  opfXml: string,
  opfPath: string
): Promise<Map<string, TocItem>> {
  const tocMap = new Map<string, TocItem>();
  const baseDir = opfPath.includes("/")
    ? opfPath.substring(0, opfPath.lastIndexOf("/"))
    : "";

  // 1. Check Nav document (EPUB 3) first as it is the canonical, curated TOC
  let navHref: string | null = null;
  const navItemMatch =
    opfXml.match(
      /<item\s+[^>]*properties=["'][^"']*?\bnav\b[^"']*?["'][^>]*href=["']([^"']+)["']/i
    ) ||
    opfXml.match(
      /<item\s+[^>]*href=["']([^"']+)["'][^>]*properties=["'][^"']*?\bnav\b[^"']*?["']/i
    );

  if (navItemMatch && navItemMatch[1]) {
    navHref = navItemMatch[1];
  }

  if (navHref) {
    const navZipPath = normalizeZipPath(baseDir, navHref);
    const navFile = zip.file(navZipPath);
    if (navFile) {
      const navHtml = await navFile.async("string");
      // Nav hrefs resolve relative to the nav file itself, not the OPF
      // (e.g. OEBPS/Text/toc.xhtml linking "fio_de_corte_1.xhtml").
      const navBaseDir = navZipPath.includes("/")
        ? navZipPath.substring(0, navZipPath.lastIndexOf("/"))
        : "";
      parseNavDoc(navHtml, navBaseDir, tocMap);
    }
  }

  // 2. Check NCX (EPUB 2) only if Nav document did not provide any entries
  if (tocMap.size === 0) {
    let ncxHref: string | null = null;
    const ncxItemMatch =
      opfXml.match(
        /<item\s+[^>]*id=["'](?:ncx|toc-ncx)["'][^>]*href=["']([^"']+)["']/i
      ) ||
      opfXml.match(/<item\s+[^>]*href=["']([^"']+\.ncx)["']/i) ||
      opfXml.match(
        /<item\s+[^>]*media-type=["']application\/x-dtbncx\+xml["'][^>]*href=["']([^"']+)["']/i
      );

    if (ncxItemMatch && ncxItemMatch[1]) {
      ncxHref = ncxItemMatch[1];
    }

    if (ncxHref) {
      const ncxZipPath = normalizeZipPath(baseDir, ncxHref);
      const ncxFile = zip.file(ncxZipPath);
      if (ncxFile) {
        const ncxXml = await ncxFile.async("string");
        // NCX content srcs resolve relative to the NCX file itself.
        const ncxBaseDir = ncxZipPath.includes("/")
          ? ncxZipPath.substring(0, ncxZipPath.lastIndexOf("/"))
          : "";
        parseNcx(ncxXml, ncxBaseDir, tocMap);
      }
    }
  }

  // 3. Fallback to <guide> references ONLY if tocMap is still completely empty
  if (tocMap.size === 0) {
    const guideRegex =
      /<reference\s+[^>]*href=["']([^"']+)["'][^>]*title=["']([^"']+)["']/gi;
    let gm: RegExpExecArray | null;
    while ((gm = guideRegex.exec(opfXml)) !== null) {
      const href = gm[1].split("#")[0];
      const title = decodeXmlEntities(gm[2]).trim();
      const isCover = /^(?:capa|cover)$/i.test(title);
      const zipPath = normalizeZipPath(baseDir, href);
      if (!tocMap.has(zipPath) && title && !isCover) {
        tocMap.set(zipPath, { title, level: 1 });
      }
    }

    const guideRegex2 =
      /<reference\s+[^>]*title=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi;
    while ((gm = guideRegex2.exec(opfXml)) !== null) {
      const title = decodeXmlEntities(gm[1]).trim();
      const href = gm[2].split("#")[0];
      const isCover = /^(?:capa|cover)$/i.test(title);
      const zipPath = normalizeZipPath(baseDir, href);
      if (!tocMap.has(zipPath) && title && !isCover) {
        tocMap.set(zipPath, { title, level: 1 });
      }
    }
  }

  return tocMap;
}
