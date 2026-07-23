import styles from "./page.module.css";

export default function Loading() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={`${styles.hero} ${styles.heroCentered}`}>
          <div
            style={{
              width: 200,
              height: 60,
              backgroundColor: "#e2e8f0",
              borderRadius: 8,
              margin: "0 auto 1.5rem",
              animation: "pulse 1.5s infinite ease-in-out",
            }}
          />
          <div
            style={{
              width: "100%",
              maxWidth: 540,
              height: 48,
              backgroundColor: "#e2e8f0",
              borderRadius: 8,
              margin: "0 auto",
              animation: "pulse 1.5s infinite ease-in-out",
            }}
          />
        </section>
      </main>
    </div>
  );
}
