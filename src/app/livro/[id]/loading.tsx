import styles from "./page.module.css";

export default function BookLoading() {
  return (
    <main className={styles.page}>
      <div
        style={{
          width: 120,
          height: 20,
          backgroundColor: "#e2e8f0",
          borderRadius: 4,
          marginBottom: "1.5rem",
        }}
      />
      <section className={styles.content}>
        <div
          style={{
            width: "100%",
            maxWidth: 300,
            height: 400,
            backgroundColor: "#e2e8f0",
            borderRadius: 8,
          }}
        />
        <div className={styles.details} style={{ width: "100%" }}>
          <div
            style={{
              width: "70%",
              height: 32,
              backgroundColor: "#e2e8f0",
              borderRadius: 6,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              width: "40%",
              height: 20,
              backgroundColor: "#e2e8f0",
              borderRadius: 4,
              marginBottom: 24,
            }}
          />
          <div
            style={{
              width: "50%",
              height: 16,
              backgroundColor: "#e2e8f0",
              borderRadius: 4,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              width: "60%",
              height: 16,
              backgroundColor: "#e2e8f0",
              borderRadius: 4,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              width: "35%",
              height: 16,
              backgroundColor: "#e2e8f0",
              borderRadius: 4,
              marginBottom: 24,
            }}
          />
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              height: 48,
              backgroundColor: "#cbd5e1",
              borderRadius: 8,
            }}
          />
        </div>
      </section>
    </main>
  );
}
