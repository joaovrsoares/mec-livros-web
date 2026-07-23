import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import styles from "./page.module.css";
import {
  searchBooks,
  getCategoriesPreview,
  getCategoryBooks,
  getProxyCoverUrl,
  formatHomepageTitle,
  formatHomepageAuthors,
  type MecBook,
  type MecSearchResponse,
  type MecCategory,
  type MecCategoryBooksResponse,
} from "@/lib/mec-api";
import { preloadBookCovers } from "@/lib/cover-cache";
import CategorySlider from "@/components/CategorySlider";

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

function paginationItems(current: number, total: number): number[] {
  const start = Math.max(1, current - 3);
  const end = Math.min(total, current + 3);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function buildQueryHref(query: string, page: number): string {
  const params = new URLSearchParams({
    query,
    page: String(page),
  });
  return `/?${params.toString()}`;
}

function BookCard({ book, priority = false }: { book: MecBook; priority?: boolean }) {
  const title = formatHomepageTitle(book.title);
  const author = formatHomepageAuthors(book.authors);
  return (
    <Link href={`/livro/${book.id}`} className={styles.card}>
      <div className={styles.coverWrap}>
        <Image
          src={getProxyCoverUrl(book.cover_filename)}
          alt={`Capa de ${book.title}`}
          fill
          sizes="(max-width: 1200px) 20vw, 160px"
          className={styles.cover}
          priority={priority}
        />
      </div>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardAuthor}>{author}</p>
    </Link>
  );
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
      if (searchResult?.books?.length) {
        await preloadBookCovers(searchResult.books.map((b) => b.cover_filename));
      }
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
      if (categoryResult?.books?.length) {
        await preloadBookCovers(categoryResult.books.map((b) => b.cover_filename));
      }
    } catch (error) {
      if (categoriesList.length > 0 && selectedSlug !== categoriesList[0].slug) {
        try {
          categoryResult = await getCategoryBooks({
            slug: categoriesList[0].slug,
            page: 1,
            limit: 11,
          });
          if (categoryResult?.books?.length) {
            await preloadBookCovers(categoryResult.books.map((b) => b.cover_filename));
          }
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
    <div className={styles.page}>
      <main className={styles.main}>
        <section
          className={`${styles.hero} ${searchResult || categoryResult ? styles.heroWithResults : styles.heroCentered}`}
        >
          <h1 className={styles.srOnly}>MEC Livros</h1>
          <Link href="/" className={styles.logoLink} aria-label="Ir para a home">
            <Image
              src="/logo-desktop.png"
              alt="MEC Livros"
              width={280}
              height={84}
              priority
              className={styles.logo}
            />
          </Link>

          <form method="GET" className={styles.searchForm}>
            <input
              type="search"
              name="query"
              defaultValue={query}
              placeholder="Pesquise por título ou autor"
              className={styles.searchInput}
              required
            />
            <button type="submit" className={styles.searchButton}>
              Buscar
            </button>
          </form>

          {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
        </section>

        {/* Text Search Results (Grid with pagination) */}
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

            {searchResult.pagination.total_pages > 1 && (
              <nav className={styles.pagination} aria-label="Paginação">
                {searchResult.pagination.has_previous_page ? (
                  <Link
                    className={styles.pageButton}
                    href={buildQueryHref(query, page - 1)}
                  >
                    Anterior
                  </Link>
                ) : (
                  <span className={styles.pageButtonDisabled}>Anterior</span>
                )}

                {paginationItems(page, searchResult.pagination.total_pages).map((pageItem) => (
                  <Link
                    key={pageItem}
                    href={buildQueryHref(query, pageItem)}
                    className={
                      pageItem === page
                        ? `${styles.pageButton} ${styles.pageButtonActive}`
                        : styles.pageButton
                    }
                  >
                    {pageItem}
                  </Link>
                ))}

                {searchResult.pagination.has_next_page ? (
                  <Link
                    className={styles.pageButton}
                    href={buildQueryHref(query, page + 1)}
                  >
                    Próxima
                  </Link>
                ) : (
                  <span className={styles.pageButtonDisabled}>Próxima</span>
                )}
              </nav>
            )}
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
  );
}
