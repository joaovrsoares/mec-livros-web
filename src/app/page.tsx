import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import styles from "./page.module.css";
import { searchBooks, type MecBook, type MecSearchResponse } from "@/lib/mec-api";

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
  const author = book.authors?.join(", ") || "Autor desconhecido";
  return (
    <Link href={`/livro/${book.id}`} className={styles.card}>
      <div className={styles.coverWrap}>
        <Image
          src={book.cover_filename}
          alt={`Capa de ${book.title}`}
          fill
          sizes="(max-width: 1200px) 20vw, 160px"
          className={styles.cover}
          priority={priority}
        />
      </div>
      <h3 className={styles.cardTitle}>{book.title}</h3>
      <p className={styles.cardAuthor}>{author}</p>
    </Link>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = params.query?.trim() ?? "";
  const page = parsePage(params.page);
  const directBookId = query ? extractBookId(query) : null;

  if (directBookId) {
    redirect(`/livro/${directBookId}`);
  }

  let searchResult: MecSearchResponse | null = null;
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
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section
          className={`${styles.hero} ${searchResult ? styles.heroWithResults : styles.heroCentered}`}
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
              placeholder="Pesquise"
              className={styles.searchInput}
              required
            />
            <button type="submit" className={styles.searchButton}>
              Buscar
            </button>
          </form>

          {!query && (
            <p className={styles.infoMessage}>
              Você pode buscar por título, autor, URL ou ID.
            </p>
          )}

          {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
        </section>

        {searchResult && (
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

              {paginationItems(page, searchResult.pagination.total_pages).map(
                (pageItem) => (
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
                ),
              )}

              {searchResult.pagination.has_next_page ? (
                <Link className={styles.pageButton} href={buildQueryHref(query, page + 1)}>
                  Próxima
                </Link>
              ) : (
                <span className={styles.pageButtonDisabled}>Próxima</span>
              )}
            </nav>
          </>
        )}
      </main>
    </div>
  );
}
