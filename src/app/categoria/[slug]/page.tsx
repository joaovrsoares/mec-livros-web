import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "../../page.module.css";
import { getCategoryBooks, getProxyCoverUrl, type MecBook } from "@/lib/mec-api";
import { preloadBookCovers } from "@/lib/cover-cache";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

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

function BookCard({ book, priority = false }: { book: MecBook; priority?: boolean }) {
  const author = book.authors?.join(", ") || "Autor desconhecido";
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
      <h3 className={styles.cardTitle}>{book.title}</h3>
      <p className={styles.cardAuthor}>{author}</p>
    </Link>
  );
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  const page = parsePage(sParams.page);

  let categoryData;
  try {
    categoryData = await getCategoryBooks({ slug, page, limit: 12 });
    if (categoryData?.books?.length) {
      await preloadBookCovers(categoryData.books.map((b) => b.cover_filename));
    }
  } catch {
    notFound();
  }

  const totalItems = categoryData.total;
  const totalPages = Math.ceil(totalItems / 12);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ marginBottom: 12 }}>
          <Link href="/" className={styles.backLink || ""} style={{ color: "#1351b4", textDecoration: "none", fontWeight: 500 }}>
            ← Voltar para a busca
          </Link>
        </div>

        <section className={styles.heroWithResults}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1c2536", margin: "0 0 6px" }}>
            {categoryData.name}
          </h1>
          <p className={styles.resultsSummary} style={{ margin: 0 }}>
            {totalItems} livros encontrados nesta categoria
          </p>
        </section>

        <section className={styles.grid}>
          {categoryData.books.map((book, index) => (
            <BookCard key={book.id} book={book} priority={index < 4} />
          ))}
        </section>

        {totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Paginação da categoria">
            {page > 1 ? (
              <Link
                className={styles.pageButton}
                href={`/categoria/${slug}?page=${page - 1}`}
              >
                Anterior
              </Link>
            ) : (
              <span className={styles.pageButtonDisabled}>Anterior</span>
            )}

            {paginationItems(page, totalPages).map((pageItem) => (
              <Link
                key={pageItem}
                href={`/categoria/${slug}?page=${pageItem}`}
                className={
                  pageItem === page
                    ? `${styles.pageButton} ${styles.pageButtonActive}`
                    : styles.pageButton
                }
              >
                {pageItem}
              </Link>
            ))}

            {page < totalPages ? (
              <Link
                className={styles.pageButton}
                href={`/categoria/${slug}?page=${page + 1}`}
              >
                Próxima
              </Link>
            ) : (
              <span className={styles.pageButtonDisabled}>Próxima</span>
            )}
          </nav>
        )}
      </main>
    </div>
  );
}
