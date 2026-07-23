"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

function LoadingContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim() ?? "";
  const isSearchQuery = Boolean(query);

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
              defaultValue={query}
              placeholder="Pesquise por título, autor, URL ou ID"
              className={styles.searchInput}
              required
            />
            <button type="submit" className={styles.searchButton}>
              Buscar
            </button>
          </form>
        </section>

        {isSearchQuery ? (
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
        ) : (
          <div className={styles.sliderContainer}>
            <div className={styles.sliderHeader}>
              <div className={styles.sliderTitleWrapper}>
                <h2 className={styles.sliderTitle}>Recomendações:</h2>
                <div className={styles.inlineSelectSkeleton} />
              </div>
              <div className={styles.sliderControls}>
                <div className={styles.sliderArrowSkeleton} />
                <div className={styles.sliderArrowSkeleton} />
              </div>
            </div>

            <div className={styles.sliderTrack}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={styles.sliderCardSkeleton}>
                  <div className={styles.coverWrapSkeleton} />
                  <div className={styles.titleSkeleton} />
                  <div className={styles.authorSkeleton} />
                </div>
              ))}
            </div>
          </div>
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
              placeholder="Pesquise por título, autor, URL ou ID"
              className={styles.searchInput}
              required
            />
            <button type="submit" className={styles.searchButton}>
              Buscar
            </button>
          </form>
        </section>

        <div className={styles.sliderContainer}>
          <div className={styles.sliderHeader}>
            <div className={styles.sliderTitleWrapper}>
              <h2 className={styles.sliderTitle}>Recomendações:</h2>
              <div className={styles.inlineSelectSkeleton} />
            </div>
            <div className={styles.sliderControls}>
              <div className={styles.sliderArrowSkeleton} />
              <div className={styles.sliderArrowSkeleton} />
            </div>
          </div>

          <div className={styles.sliderTrack}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={styles.sliderCardSkeleton}>
                <div className={styles.coverWrapSkeleton} />
                <div className={styles.titleSkeleton} />
                <div className={styles.authorSkeleton} />
              </div>
            ))}
          </div>
        </div>
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
