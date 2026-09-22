import Image from "next/image";
import Link from "next/link";
import styles from "@/app/page.module.css";
import DownloadButton from "@/components/DownloadButton";
import {
  getCoverUrl,
  formatHomepageAuthors,
  type MecBook,
} from "@/lib/mec-api";

type BookCardProps = {
  book: MecBook;
  priority?: boolean;
  showDownload?: boolean;
};

export default function BookCard({
  book,
  priority = false,
  showDownload = true,
}: BookCardProps) {
  const author = formatHomepageAuthors(book.authors);
  const publisher = book.publisher?.trim();
  const pageCount = book.page_count && book.page_count > 0 ? book.page_count : null;

  return (
    <div className={styles.card}>
      <Link href={`/livro/${book.id}`} className={styles.cardCoverWrap}>
        <Image
          src={getCoverUrl(book.cover_filename)}
          alt={`Capa de ${book.title}`}
          fill
          sizes="(max-width: 760px) 90px, 130px"
          className={styles.cardCover}
          priority={priority}
        />
      </Link>
      <div className={styles.cardBody}>
        <Link href={`/livro/${book.id}`} className={styles.cardTitleLink}>
          <h3 className={styles.cardTitle}>{book.title}</h3>
        </Link>
        <p className={styles.cardAuthor}>{author}</p>
        <div className={styles.cardMeta}>
          <p className={styles.cardMetaItem}>
            <strong className={styles.cardMetaLabel}>Editora:</strong>{" "}
            <span>{publisher || "Não informada"}</span>
          </p>
          <p className={styles.cardMetaItem}>
            <strong className={styles.cardMetaLabel}>Páginas:</strong>{" "}
            <span>{pageCount ? `${pageCount} (aprox.)` : "Não informado"}</span>
          </p>
        </div>
        {showDownload && (
          <div className={styles.cardActions}>
            <DownloadButton
              bookId={book.id}
              bookTitle={book.title}
              bookAuthors={book.authors}
              hasEpub={book.has_epub ?? true}
              variant="card"
            />
          </div>
        )}
      </div>
    </div>
  );
}
