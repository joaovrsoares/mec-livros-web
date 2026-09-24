import Link from "next/link";
import styles from "./CategoryGrid.module.css";
import { type MecCategory } from "@/lib/mec-api";

type CategoryGridProps = {
  categories: MecCategory[];
};

export default function CategoryGrid({ categories }: CategoryGridProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Todas as categorias">
      <div className={styles.header}>
        <h2 className={styles.title}>Todas as Categorias</h2>
        <p className={styles.subtitle}>
          Explore o acervo completo distribuído em {categories.length} categorias temáticas
        </p>
      </div>

      <div className={styles.grid}>
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categoria/${cat.slug}`}
            className={styles.card}
            style={
              {
                "--gradient-from": cat.gradient_from || "#1351b4",
                "--gradient-to": cat.gradient_to || "#0d47a1",
              } as React.CSSProperties
            }
          >
            <div className={styles.gradientBar} />
            <div className={styles.cardContent}>
              <span className={styles.categoryName}>{cat.name}</span>
              <span className={styles.categoryCount}>
                {cat.count.toLocaleString("pt-BR")} {cat.count === 1 ? "livro" : "livros"}
              </span>
            </div>
            <span className={styles.arrowIcon} aria-hidden="true">
              ›
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
