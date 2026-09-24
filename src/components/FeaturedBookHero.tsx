import Image from "next/image";
import Link from "next/link";
import styles from "./FeaturedBookHero.module.css";
import { type MecBook, formatHomepageAuthors } from "@/lib/mec-api";

type FeaturedBookHeroProps = {
  book: MecBook;
};

export default function FeaturedBookHero({ book }: FeaturedBookHeroProps) {
  const authors = formatHomepageAuthors(book.authors);

  return (
    <section className={styles.heroSection} aria-label="Livro em destaque">
      <div className={styles.heroBackdrop} />
      <div className={styles.heroContent}>
        <div className={styles.coverWrapper}>
          <Link href={`/livro/${book.id}`} className={styles.coverLink} tabIndex={-1} aria-hidden="true">
            <Image
              src={book.cover_filename}
              alt=""
              width={160}
              height={240}
              priority
              className={styles.coverImage}
            />
          </Link>
        </div>

        <div className={styles.infoWrapper}>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>Obra em Destaque</span>
            {book.categories && book.categories.length > 0 && (
              <span className={styles.categoryBadge}>{book.categories[0]}</span>
            )}
          </div>

          <h2 className={styles.title}>
            <Link href={`/livro/${book.id}`} className={styles.titleLink}>
              {book.title}
            </Link>
          </h2>

          <p className={styles.author}>por {authors}</p>

          {book.description && (
            <p className={styles.description}>
              {book.description.length > 240
                ? `${book.description.slice(0, 240).trim()}...`
                : book.description}
            </p>
          )}

          <div className={styles.actions}>
            <Link href={`/livro/${book.id}`} className={styles.primaryBtn}>
              Ver Detalhes da Obra
            </Link>
            <a
              href={`/api/books/${book.id}/download-pdf`}
              className={styles.secondaryBtn}
              download
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Baixar PDF Direto
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
