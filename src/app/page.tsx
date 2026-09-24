import { redirect } from "next/navigation";
import styles from "./page.module.css";
import {
  searchBooks,
  getCategoriesPreview,
  getCategoryBooks,
  getBookById,
  type MecSearchResponse,
  type MecCategory,
  type MecCategoryBooksResponse,
  type MecBook,
} from "@/lib/mec-api";
import Pagination from "@/components/Pagination";
import Header from "@/components/Header";
import FeaturedBookHero from "@/components/FeaturedBookHero";
import CategoryChipsBar from "@/components/CategoryChipsBar";
import BookShelfSlider from "@/components/BookShelfSlider";
import CategorySlider from "@/components/CategorySlider";
import BookCard from "@/components/BookCard";
import Footer from "@/components/Footer";

type HomeProps = {
  searchParams: Promise<{
    query?: string;
    category?: string;
    page?: string;
  }>;
};

function extractBookId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{9}$/.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("id")?.trim() ?? "";
    return /^\d{9}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function parsePage(value?: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

function buildQueryHref(query: string, page: number): string {
  const params = new URLSearchParams({
    query,
    page: String(page),
  });
  return `/?${params.toString()}`;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const categoryParam = params.category?.trim() ?? "";
  const page = parsePage(params.page);
  const directBookId = query ? extractBookId(query) : null;

  if (directBookId) {
    redirect(`/livro/${directBookId}`);
  }

  // Fetch category preview list
  const categoriesData = await getCategoriesPreview().catch(() => null);
  const categoriesList: MecCategory[] =
    categoriesData?.sections?.flatMap((section) => section.categories) ?? [];

  let searchResult: MecSearchResponse | null = null;
  let categoryResult: MecCategoryBooksResponse | null = null;
  let featuredBook: MecBook | null = null;
  let classicsShelf: MecCategoryBooksResponse | null = null;
  let shortStoriesShelf: MecCategoryBooksResponse | null = null;
  let errorMessage = "";

  if (query) {
    try {
      searchResult = await searchBooks({ query, page, limit: 12 });
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os resultados da busca.";
    }
  } else {
    // When no search query, fetch curated shelves in parallel
    const selectedSlug = categoryParam || "ficcao-literaria";

    const [
      featuredResult,
      activeCategoryResult,
      classicsResult,
      shortStoriesResult,
    ] = await Promise.allSettled([
      // Featured editorial book: Memórias Póstumas de Brás Cubas (300000233)
      getBookById("300000233"),
      getCategoryBooks({ slug: selectedSlug, page: 1, limit: 12 }),
      getCategoryBooks({ slug: "classicos", page: 1, limit: 10 }),
      getCategoryBooks({ slug: "contos-cronicas", page: 1, limit: 10 }),
    ]);

    if (featuredResult.status === "fulfilled") {
      featuredBook = featuredResult.value;
    }

    if (activeCategoryResult.status === "fulfilled") {
      categoryResult = activeCategoryResult.value;
    } else {
      errorMessage = "Não foi possível carregar as recomendações de livros.";
    }

    if (classicsResult.status === "fulfilled") {
      classicsShelf = classicsResult.value;
    }

    if (shortStoriesResult.status === "fulfilled") {
      shortStoriesShelf = shortStoriesResult.value;
    }
  }

  const activeCategorySlug = categoryParam || (categoryResult?.slug ?? "ficcao-literaria");

  return (
    <>
      <Header defaultQuery={query} />
      <div className={styles.page}>
        <main className={styles.main}>
          {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

          {/* Text Search Results (Grid with pagination) */}
          {query && searchResult && searchResult.books.length === 0 && (
            <section className={styles.noResultsContainer}>
              <div className={styles.noResultsIcon} aria-hidden="true">
                🔍
              </div>
              <h2 className={styles.noResultsTitle}>Nenhum livro encontrado</h2>
              <p className={styles.noResultsText}>
                Não encontramos resultados para &ldquo;<strong>{query}</strong>&rdquo;.
              </p>
              <div className={styles.noResultsSuggestions}>
                <strong>Dicas de busca:</strong>
                <ul>
                  <li>Verifique se o nome do autor ou título foi digitado corretamente.</li>
                  <li>Tente usar termos mais genéricos ou palavras-chave diferentes.</li>
                  <li>Você também pode buscar diretamente colando o ID de 9 dígitos do livro.</li>
                </ul>
              </div>
            </section>
          )}

          {searchResult && searchResult.books.length > 0 && (
            <>
              <p className={styles.resultsSummary}>
                Busca: <strong>{searchResult.query}</strong> •{" "}
                {searchResult.pagination.total_items} resultados
              </p>

              <section className={styles.grid}>
                {searchResult.books.map((book, index) => (
                  <BookCard key={book.id} book={book} priority={index < 4} />
                ))}
              </section>

              <Pagination
                currentPage={page}
                totalPages={searchResult.pagination.total_pages}
                getHref={(p) => buildQueryHref(query, p)}
                ariaLabel="Paginação da busca"
              />
            </>
          )}

          {/* Homepage Showcase (Curated Hero, Popular Chips & Multi-Shelves) */}
          {!query && (
            <>
              {featuredBook && <FeaturedBookHero book={featuredBook} />}

              {categoriesList.length > 0 && (
                <CategoryChipsBar categories={categoriesList.slice(0, 8)} />
              )}

              {classicsShelf && classicsShelf.books.length > 0 && (
                <BookShelfSlider
                  title="Clássicos da Literatura"
                  subtitle="Obras fundamentais em domínio público e livre acesso"
                  categorySlug="classicos"
                  books={classicsShelf.books}
                />
              )}

              {/* Dynamic Interactive Category Slider with Dropdown */}
              {categoryResult && categoryResult.books.length > 0 && (
                <CategorySlider
                  books={categoryResult.books}
                  categorySlug={categoryResult.slug}
                  categoryName={categoryResult.name}
                  categories={categoriesList}
                  activeSlug={activeCategorySlug}
                />
              )}

              {shortStoriesShelf && shortStoriesShelf.books.length > 0 && (
                <BookShelfSlider
                  title="Contos e Crônicas"
                  subtitle="Narrativas curtas e antologias de grandes autores"
                  categorySlug="contos-cronicas"
                  books={shortStoriesShelf.books}
                />
              )}
            </>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
