import Link from "next/link";
import styles from "@/app/page.module.css";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  getHref: (page: number) => string;
  ariaLabel?: string;
};

function paginationItems(current: number, total: number): number[] {
  const start = Math.max(1, current - 3);
  const end = Math.min(total, current + 3);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function Pagination({
  currentPage,
  totalPages,
  getHref,
  ariaLabel = "Paginação",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label={ariaLabel}>
      {currentPage > 1 ? (
        <Link
          className={styles.pageButton}
          href={getHref(currentPage - 1)}
          aria-label="Página anterior"
        >
          Anterior
        </Link>
      ) : (
        <span className={styles.pageButtonDisabled} aria-disabled="true">
          Anterior
        </span>
      )}

      {paginationItems(currentPage, totalPages).map((pageItem) => {
        const isCurrent = pageItem === currentPage;
        return (
          <Link
            key={pageItem}
            href={getHref(pageItem)}
            aria-label={`Página ${pageItem}`}
            aria-current={isCurrent ? "page" : undefined}
            className={
              isCurrent
                ? `${styles.pageButton} ${styles.pageButtonActive}`
                : styles.pageButton
            }
          >
            {pageItem}
          </Link>
        );
      })}

      {currentPage < totalPages ? (
        <Link
          className={styles.pageButton}
          href={getHref(currentPage + 1)}
          aria-label="Próxima página"
        >
          Próxima
        </Link>
      ) : (
        <span className={styles.pageButtonDisabled} aria-disabled="true">
          Próxima
        </span>
      )}
    </nav>
  );
}
