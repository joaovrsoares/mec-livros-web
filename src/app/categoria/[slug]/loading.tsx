import Link from "next/link";
import styles from "../../page.module.css";

export default function CategoryLoading() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ marginBottom: 12 }}>
          <Link href="/" style={{ color: "#1351b4", textDecoration: "none", fontWeight: 500 }}>
            ← Voltar para a busca
          </Link>
        </div>

        <section className={styles.heroWithResults}>
          <div className={styles.resultsSummarySkeleton} style={{ width: 280, height: 28 }} />
          <div className={styles.resultsSummarySkeleton} style={{ width: 180, height: 18, marginTop: 6 }} />
        </section>

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
