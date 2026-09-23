import { notFound } from "next/navigation";

import styles from "../../page.module.css";
import { getCategoryBooks } from "@/lib/mec-api";
import BookCard from "@/components/BookCard";
import Header from "@/components/Header";
import Pagination from "@/components/Pagination";

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

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  const page = parsePage(sParams.page);

  let categoryData;
  try {
    categoryData = await getCategoryBooks({ slug, page, limit: 12 });
  } catch {
    notFound();
  }

  const totalItems = categoryData.total;
  const totalPages = Math.ceil(totalItems / 12);

  return (
    <>
      <Header />
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.heroWithResults}>
            <h1 className={styles.categoryHeading}>
              {categoryData.name}
            </h1>
            <p className={styles.resultsSummary}>
              {totalItems} livros encontrados nesta categoria
            </p>
          </section>

          <section className={styles.grid}>
            {categoryData.books.map((book, index) => (
              <BookCard key={book.id} book={book} priority={index < 4} />
            ))}
          </section>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            getHref={(p) => `/categoria/${slug}?page=${p}`}
            ariaLabel="Paginação da categoria"
          />
        </main>
      </div>
    </>
  );
}
