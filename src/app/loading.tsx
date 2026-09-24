"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
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
            <div className={styles.categoriesContainer}>
              <div className={styles.sliderHeader}>
                <div className={styles.sliderTitleWrapper}>
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
                    <div className={styles.cardBodySkeleton}>
                      <div className={styles.titleSkeleton} />
                      <div className={styles.authorSkeleton} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
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
              <div className={styles.categoriesContainer}>
                <div className={styles.sliderHeader}>
                  <div className={styles.sliderTitleWrapper}>
                    <div className={styles.inlineSelectSkeleton} />
                  </div>
                </div>
                <div className={styles.sliderTrack}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className={styles.sliderCardSkeleton}>
                      <div className={styles.coverWrapSkeleton} />
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </>
      }
    >
      <LoadingContent />
    </Suspense>
  );
}
