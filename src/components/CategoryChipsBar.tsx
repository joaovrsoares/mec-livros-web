import Link from "next/link";
import styles from "./CategoryChipsBar.module.css";
import { type MecCategory } from "@/lib/mec-api";

type CategoryChipsBarProps = {
  categories: MecCategory[];
};

export default function CategoryChipsBar({ categories }: CategoryChipsBarProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <nav className={styles.container} aria-label="Categorias populares">
      <div className={styles.track}>
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categoria/${cat.slug}`}
            className={styles.chip}
          >
            <span className={styles.chipName}>{cat.name}</span>
            {cat.count > 0 && (
              <span className={styles.chipCount}>{cat.count}</span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
