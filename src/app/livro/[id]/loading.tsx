import Link from "next/link";
import styles from "./page.module.css";

export default function BookDetailsLoading() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← Voltar para busca
      </Link>

      <section className={styles.content}>
        <div className={styles.coverWrapSkeleton} />

        <div className={styles.details}>
          <div className={styles.titleSkeleton} />
          <div className={styles.authorSkeleton} />
          <div className={styles.metaSkeleton} />
          <div className={styles.metaSkeleton} style={{ width: "40%" }} />
          <div className={styles.metaSkeleton} style={{ width: "30%" }} />
          <div className={styles.metaSkeleton} style={{ width: "35%" }} />
          <div className={styles.metaSkeleton} style={{ width: "50%" }} />
          <div className={styles.buttonSkeleton} />
        </div>
      </section>

      <section className={styles.descriptionBlock}>
        <h2>Descrição</h2>
        <div className={styles.descriptionSkeleton} style={{ width: "100%" }} />
        <div className={styles.descriptionSkeleton} style={{ width: "95%" }} />
        <div className={styles.descriptionSkeleton} style={{ width: "80%" }} />
      </section>
    </main>
  );
}
