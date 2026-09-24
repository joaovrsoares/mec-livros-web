"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./BookShelfSlider.module.css";
import {
  type MecBook,
  formatHomepageTitle,
  formatHomepageAuthors,
} from "@/lib/mec-api";

type BookShelfSliderProps = {
  title: string;
  categorySlug: string;
  books: MecBook[];
  subtitle?: string;
};

export default function BookShelfSlider({
  title,
  categorySlug,
  books,
  subtitle,
}: BookShelfSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!books || books.length === 0) return null;

  const scrollLeft = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -460, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 460, behavior: "smooth" });
    }
  };

  return (
    <section className={styles.shelfContainer} aria-label={title}>
      <div className={styles.shelfHeader}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h2 className={styles.shelfTitle}>{title}</h2>
            <Link href={`/categoria/${categorySlug}`} className={styles.viewAllLink}>
              Ver todos <span aria-hidden="true">›</span>
            </Link>
          </div>
          {subtitle && <p className={styles.shelfSubtitle}>{subtitle}</p>}
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={scrollLeft}
            aria-label={`Rolar ${title} para a esquerda`}
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.arrowBtn}
            onClick={scrollRight}
            aria-label={`Rolar ${title} para a direita`}
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.shelfTrack} ref={trackRef}>
        {books.map((book, index) => {
          const formattedTitle = formatHomepageTitle(book.title);
          const formattedAuthor = formatHomepageAuthors(book.authors);

          return (
            <div key={book.id} className={styles.shelfCard}>
              <Link
                href={`/livro/${book.id}`}
                className={styles.coverLink}
                tabIndex={-1}
                aria-hidden="true"
              >
                <div className={styles.coverWrap}>
                  <Image
                    src={book.cover_filename}
                    alt=""
                    fill
                    sizes="160px"
                    priority={index < 3}
                    className={styles.cover}
                  />
                </div>
              </Link>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardTitle}>
                  <Link href={`/livro/${book.id}`} className={styles.cardLink} title={book.title}>
                    {formattedTitle}
                  </Link>
                </h3>
                <p className={styles.cardAuthor} title={book.authors?.join(", ")}>
                  {formattedAuthor}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
