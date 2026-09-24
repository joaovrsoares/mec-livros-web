"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

function LoadingContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim() ?? "";
  const isSearchQuery = Boolean(query);

  return (
    <>
      <Header defaultQuery={query} />
      <div className={styles.page}>
        <main className={styles.main}>
          {isSearchQuery ? (
            <>
              <div className={styles.resultsSummarySkeleton} />

              <section className={styles.grid}>
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className={styles.cardSkeleton}>
                    <div className={styles.cardCoverWrapSkeleton} />
                    <div className={styles.cardBodySkeleton}>
                      <div className={styles.titleSkeleton} />
                      <div className={styles.authorSkeleton} />
                      <div className={styles.metaSkeleton} />
                      <div className={styles.metaSkeleton} style={{ width: "45%" }} />
                    </div>
                  </div>
                ))}
              </section>
            </>
          ) : (
            <>
              {/* Featured Book Skeleton */}
              <div className={styles.heroSkeleton} />

              {/* Shelf Skeleton 1: Ficção Literária */}
              <div className={styles.sliderContainer}>
                <div className={styles.sliderHeader}>
                  <div className={styles.titleSkeleton} style={{ width: 180, height: 24 }} />
                </div>
                <div className={styles.sliderTrack}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className={styles.sliderCardSkeleton}>
                      <div className={styles.coverWrapSkeleton} />
                      <div className={styles.cardBodySkeleton}>
                        <div className={styles.titleSkeleton} />
                        <div className={styles.authorSkeleton} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shelf Skeleton 2: Clássicos da Literatura */}
              <div className={styles.sliderContainer}>
                <div className={styles.sliderHeader}>
                  <div className={styles.titleSkeleton} style={{ width: 220, height: 24 }} />
                </div>
                <div className={styles.sliderTrack}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className={styles.sliderCardSkeleton}>
                      <div className={styles.coverWrapSkeleton} />
                      <div className={styles.cardBodySkeleton}>
                        <div className={styles.titleSkeleton} />
                        <div className={styles.authorSkeleton} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Categories Grid Skeleton */}
              <div className={styles.categoryGridSkeleton}>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className={styles.categoryCardSkeleton} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}

export default function Loading() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <div className={styles.page}>
            <main className={styles.main}>
              <div className={styles.heroSkeleton} />
            </main>
          </div>
          <Footer />
        </>
      }
    >
      <LoadingContent />
    </Suspense>
  );
}
