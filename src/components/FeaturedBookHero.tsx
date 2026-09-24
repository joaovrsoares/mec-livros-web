import Image from "next/image";
import Link from "next/link";
import styles from "./FeaturedBookHero.module.css";
import DownloadButton from "@/components/DownloadButton";
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
              {book.description}
            </p>
          )}

          <div className={styles.actions}>
            <DownloadButton
              bookId={book.id}
              bookTitle={book.title}
              bookAuthors={book.authors}
              hasEpub={book.has_epub ?? true}
              variant="rounded"
            />
            <Link href={`/livro/${book.id}`} className={styles.secondaryBtn}>
              Detalhes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
