import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeEpubCss } from "./css-sanitizer";

test("sanitizeEpubCss - does NOT scale fonts for book ID 300007576", () => {
  const css = `
    p.CORRIDO { font-size: 1.042em; }
    span.CharOverride-8 { font-size: 0.458em; }
  `;
  const result = sanitizeEpubCss(css, { bookId: 300007576 });
  assert.ok(result.includes("font-size: 1.042em"));
  assert.ok(result.includes("font-size: 0.458em"));
});

test("sanitizeEpubCss - heuristic does NOT scale fonts when normal body paragraphs exist (even without bookId)", () => {
  // Typical Memórias Póstumas de Brás Cubas styles:
  // p.CORRIDO is ~14.6pt (1.042em * 14pt), and CharOverride-8 is small (6.4pt)
  const css = `
    p.CORRIDO { font-size: 1.042em; }
    p.TEXTO-CORRIDO { font-size: 1em; }
    p.nota1 { font-size: 0.833em; }
    span.CharOverride-8 { font-size: 0.458em; }
    span.CharOverride-21 { font-size: 58%; vertical-align: super; }
  `;
  const result = sanitizeEpubCss(css);
  // Fonts must NOT be scaled
  assert.ok(result.includes("font-size: 1.042em"));
  assert.ok(result.includes("font-size: 1em"));
  assert.ok(!result.includes("font-size: 1.407em"));
  assert.ok(!result.includes("font-size: 1.35em"));
});

test("sanitizeEpubCss - scales font when body paragraphs are genuinely small", () => {
  const smallBookCss = `
    p { font-size: 9pt; }
    p.texto { font-size: 9.5pt; }
    h1 { font-size: 16pt; }
  `;
  const result = sanitizeEpubCss(smallBookCss);
  // Scale should bring 9.5pt up towards ~14pt (multiplier ~1.35x max)
  // 9pt * 1.35 = 12.15pt, 9.5pt * 1.35 = 12.83pt
  assert.ok(!result.includes("font-size: 9pt"));
  assert.ok(result.includes("font-size: 12.15pt") || result.includes("font-size: 12.83pt"));
});

test("sanitizeEpubCss - strips @page rules and keeps @font-face", () => {
  const css = `
    @page { margin: 0; }
    @font-face { font-family: "MyFont"; src: url("myfont.ttf"); }
    p { font-size: 1em; }
  `;
  const result = sanitizeEpubCss(css);
  assert.ok(!result.includes("@page"));
  assert.ok(result.includes("@font-face"));
  assert.ok(result.includes("font-size: 1em"));
});

test("sanitizeEpubCss - scopes rules to chapterAnchorId using @scope", () => {
  const css = `
    @font-face { font-family: "Rufina"; src: url("rufina.otf"); }
    body { font-family: "Rufina", serif; margin: 2%; }
    p { text-indent: 1.3em; }
  `;
  const result = sanitizeEpubCss(css, { chapterAnchorId: "ch-cap1" });
  // @font-face should be global (outside @scope)
  assert.ok(result.includes("@font-face { font-family: \"Rufina\";"));
  // Chapter rules should be inside @scope (#ch-cap1)
  assert.ok(result.includes("@scope (#ch-cap1)"));
  // Body typography should be mapped to :scope (without layout margin)
  assert.ok(result.includes(":scope {font-family: \"Rufina\", serif"));
  assert.ok(!result.includes("margin: 2%"));
  assert.ok(result.includes("p {text-indent: 1.3em;}"));
});

test("sanitizeEpubCss - preserves rules that are immediately preceded by comments", () => {
  const cssWithComments = `
    /*Órbita*/
    p.orbita1 {
      font-weight: bold;
      font-size: 2.2em;
      text-align: center;
      text-indent: 0;
    }
  `;
  const result = sanitizeEpubCss(cssWithComments, { chapterAnchorId: "ch-orbita" });
  assert.ok(result.includes("p.orbita1"));
  assert.ok(result.includes("text-align: center"));
  assert.ok(result.includes("font-size: 2.2em"));
  assert.ok(result.includes("font-weight: bold"));
});
