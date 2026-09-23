import Header from "@/components/Header";
import styles from "../../page.module.css";

export default function CategoryLoading() {
  return (
    <>
      <Header />
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.heroWithResults}>
            <div className={styles.resultsSummarySkeleton} style={{ width: 280, height: 28 }} />
            <div className={styles.resultsSummarySkeleton} style={{ width: 180, height: 18, marginTop: 6 }} />
          </section>

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
      </main>
    </div>
  </>
);
}
