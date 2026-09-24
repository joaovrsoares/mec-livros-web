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
import BookShelfSlider from "@/components/BookShelfSlider";
import CategoryGrid from "@/components/CategoryGrid";
import BookCard from "@/components/BookCard";
import Footer from "@/components/Footer";

// Force dynamic rendering so Math.random() selects a random featured book on every request
export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    query?: string;
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
  let fictionShelf: MecCategoryBooksResponse | null = null;
  let classicsShelf: MecCategoryBooksResponse | null = null;
  let featuredBook: MecBook | null = null;
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
    // When no search query, fetch Ficção Literária and Clássicos da Literatura in parallel
    const [fictionResult, classicsResult] = await Promise.allSettled([
      getCategoryBooks({ slug: "ficcao-literaria", page: 1, limit: 12 }),
      getCategoryBooks({ slug: "classicos", page: 1, limit: 12 }),
    ]);

    if (fictionResult.status === "fulfilled") {
      fictionShelf = fictionResult.value;

      // Pick 1 book randomly from the Ficção Literária results for the Hero banner
      if (fictionShelf.books && fictionShelf.books.length > 0) {
        const randomIndex = Math.floor(Math.random() * fictionShelf.books.length);
        const candidateBook = fictionShelf.books[randomIndex];

        // Fetch full details if needed (to ensure complete synopsis and publisher)
        try {
          featuredBook = await getBookById(String(candidateBook.id));
        } catch {
          featuredBook = candidateBook;
        }
      }
    } else {
      errorMessage = "Não foi possível carregar as recomendações de livros.";
    }

    if (classicsResult.status === "fulfilled") {
      classicsShelf = classicsResult.value;
    }
  }

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

          {/* Homepage Curated Showcase */}
          {!query && (
            <>
              {/* Randomly chosen book from Ficção Literária */}
              {featuredBook && <FeaturedBookHero book={featuredBook} />}

              {/* Shelf 1: Ficção Literária */}
              {fictionShelf && fictionShelf.books.length > 0 && (
                <BookShelfSlider
                  title="Ficção Literária"
                  subtitle="Narrativas contemporâneas e obras consagradas"
                  categorySlug="ficcao-literaria"
                  books={fictionShelf.books}
                />
              )}

              {/* Shelf 2: Clássicos da Literatura */}
              {classicsShelf && classicsShelf.books.length > 0 && (
                <BookShelfSlider
                  title="Clássicos da Literatura"
                  subtitle="Obras fundamentais em domínio público e livre acesso"
                  categorySlug="classicos"
                  books={classicsShelf.books}
                />
              )}

              {/* Grid with all categories dynamically from API */}
              {categoriesList.length > 0 && (
                <CategoryGrid categories={categoriesList} />
              )}
            </>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
