import { redirect } from "next/navigation";
import styles from "./page.module.css";
import {
  searchBooks,
  getCategoriesPreview,
  getCategoryBooks,
  type MecSearchResponse,
  type MecCategory,
  type MecCategoryBooksResponse,
} from "@/lib/mec-api";
import Pagination from "@/components/Pagination";
import Header from "@/components/Header";
import CategorySlider from "@/components/CategorySlider";
import BookCard from "@/components/BookCard";

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
    // Default to 'ficcao-literaria' if no category query param is passed
    const selectedSlug = categoryParam || "ficcao-literaria";
    try {
      categoryResult = await getCategoryBooks({ slug: selectedSlug, page: 1, limit: 11 });
    } catch (error) {
      if (categoriesList.length > 0 && selectedSlug !== categoriesList[0].slug) {
        try {
          categoryResult = await getCategoryBooks({
            slug: categoriesList[0].slug,
            page: 1,
            limit: 11,
          });
        } catch {
          errorMessage = "Não foi possível carregar as recomendações de livros.";
        }
      } else {
        errorMessage =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as recomendações de livros.";
      }
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

          {/* Home Recommendations (Category Slider of 12 books + Inline Dropdown) */}
          {!query && categoryResult && categoryResult.books.length > 0 && (
            <CategorySlider
              books={categoryResult.books}
              categorySlug={categoryResult.slug}
              categoryName={categoryResult.name}
              categories={categoriesList}
              activeSlug={activeCategorySlug}
            />
          )}
        </main>
      </div>
    </>
  );
}
