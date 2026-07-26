import test from "node:test";
import assert from "node:assert/strict";
import {
  getCoverUrl,
  getCategoriesPreview,
  getCategoryBooks,
  formatHomepageTitle,
  formatHomepageAuthors,
} from "./mec-api";

test("getCoverUrl normalizes cover URLs to static-meclivros covers-webp without query params", () => {
  const fullUrl = "https://static-meclivros.mec.gov.br/covers/9786587140315.jpg";
  assert.equal(
    getCoverUrl(fullUrl),
    "https://static-meclivros.mec.gov.br/covers-webp/9786587140315.jpg"
  );

  const relativeFilename = "9786587140315.jpg";
  assert.equal(
    getCoverUrl(relativeFilename),
    "https://static-meclivros.mec.gov.br/covers-webp/9786587140315.jpg"
  );

  const urlWithParam = "https://static-meclivros.mec.gov.br/covers-webp/9786587140315.jpg?w=600";
  assert.equal(
    getCoverUrl(urlWithParam),
    "https://static-meclivros.mec.gov.br/covers-webp/9786587140315.jpg"
  );
});

test("getCategoriesPreview fetches sections and category slugs from MEC API", async () => {
  const data = await getCategoriesPreview();
  assert.ok(data.sections.length > 0);
  const firstSection = data.sections[0];
  assert.ok(firstSection.categories.length > 0);
  assert.ok(firstSection.categories[0].slug);
});

test("getCategoryBooks fetches books for category slug and normalizes cover URLs", async () => {
  const categoryBooks = await getCategoryBooks({ slug: "classicos", page: 1, limit: 12 });
  assert.equal(categoryBooks.slug, "classicos");
  assert.ok(categoryBooks.books.length > 0);
  assert.ok(categoryBooks.books[0].cover_filename.startsWith("https://static-meclivros.mec.gov.br/"));
});

test("formatHomepageTitle truncates titles exceeding 50 characters with ellipsis", () => {
  const shortTitle = "Dom Casmurro";
  assert.equal(formatHomepageTitle(shortTitle), "Dom Casmurro");

  const longTitle = "Este é um título extremamente longo de um livro que possui mais de 50 caracteres no total";
  const formatted = formatHomepageTitle(longTitle);
  assert.equal(formatted.length, 53); // 50 chars + "..."
  assert.ok(formatted.endsWith("..."));
});

test("formatHomepageAuthors formats author list according to count rules", () => {
  assert.equal(formatHomepageAuthors([]), "Autor desconhecido");
  assert.equal(formatHomepageAuthors(["Machado de Assis"]), "Machado de Assis");
  assert.equal(
    formatHomepageAuthors(["Machado de Assis", "José de Alencar"]),
    "Machado de Assis, José de Alencar"
  );
  assert.equal(
    formatHomepageAuthors(["Machado de Assis", "José de Alencar", "Clarice Lispector"]),
    "Machado de Assis, José de Alencar e mais"
  );
});
