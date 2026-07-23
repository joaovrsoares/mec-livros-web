"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../app/page.module.css";
import {
  getProxyCoverUrl,
  formatHomepageTitle,
  formatHomepageAuthors,
  type MecBook,
  type MecCategory,
} from "@/lib/mec-api";

type CategorySliderProps = {
  books: MecBook[];
  categorySlug: string;
  categoryName: string;
  categories?: MecCategory[];
  activeSlug?: string;
};

export default function CategorySlider({
  books,
  categorySlug,
  categoryName,
  categories = [],
  activeSlug = "",
}: CategorySliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollLeft = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -480, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 480, behavior: "smooth" });
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSlug = e.target.value;
    if (selectedSlug) {
      router.push(`/?category=${selectedSlug}`);
    }
  };

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderHeader}>
        <div className={styles.sliderTitleWrapper}>
          <h2 className={styles.sliderTitle}>Recomendações:</h2>
          {categories.length > 0 && (
            <select
              value={activeSlug || categorySlug}
              onChange={handleCategoryChange}
              className={styles.inlineCategorySelect}
              aria-label="Selecione uma categoria"
            >
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
          )}
        </div>
        <div className={styles.sliderControls}>
          <button
            type="button"
            className={styles.sliderArrow}
            onClick={scrollLeft}
            aria-label="Rolar para a esquerda"
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.sliderArrow}
            onClick={scrollRight}
            aria-label="Rolar para a direita"
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.sliderTrack} ref={trackRef}>
        {books.map((book, index) => {
          const title = formatHomepageTitle(book.title);
          const author = formatHomepageAuthors(book.authors);
          return (
            <Link
              key={book.id}
              href={`/livro/${book.id}`}
              className={styles.sliderCard}
            >
              <div className={styles.coverWrap}>
                <Image
                  src={getProxyCoverUrl(book.cover_filename)}
                  alt={`Capa de ${book.title}`}
                  fill
                  sizes="160px"
                  className={styles.cover}
                  priority={index < 4}
                />
              </div>
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardAuthor}>{author}</p>
            </Link>
          );
        })}

        <Link
          href={`/categoria/${categorySlug}`}
          className={styles.sliderSeeMoreCard}
        >
          <div className={styles.seeMoreIcon}>→</div>
          <span className={styles.seeMoreText}>Ver mais em</span>
          <strong className={styles.seeMoreCategory}>{categoryName}</strong>
        </Link>
      </div>

      <div className={styles.mobileSwipeHint} aria-hidden="true">
        <span>Deslize</span>
        <span className={styles.swipeIcon}>↔</span>
      </div>
    </div>
  );
}
