"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

function LoadingContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim() ?? "";
  const hasQuery = Boolean(query);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section
          className={`${styles.hero} ${hasQuery ? styles.heroWithResults : styles.heroCentered}`}
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
        </section>

        {hasQuery && (
          <>
            <div className={styles.resultsSummarySkeleton} />

            <section className={styles.grid}>
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className={styles.cardSkeleton}>
                  <div className={styles.coverWrapSkeleton} />
                  <div className={styles.titleSkeleton} />
                  <div className={styles.authorSkeleton} />
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function FallbackLoading() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={`${styles.hero} ${styles.heroWithResults}`}>
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
              placeholder="Pesquise"
              className={styles.searchInput}
              required
            />
            <button type="submit" className={styles.searchButton}>
              Buscar
            </button>
          </form>
        </section>

        <div className={styles.resultsSummarySkeleton} />

        <section className={styles.grid}>
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className={styles.cardSkeleton}>
              <div className={styles.coverWrapSkeleton} />
              <div className={styles.titleSkeleton} />
              <div className={styles.authorSkeleton} />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default function Loading() {
  return (
    <Suspense fallback={<FallbackLoading />}>
      <LoadingContent />
    </Suspense>
  );
}
