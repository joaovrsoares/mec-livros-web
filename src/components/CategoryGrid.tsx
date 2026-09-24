"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./CategoryGrid.module.css";
import { type MecCategory } from "@/lib/mec-api";

type CategoryGridProps = {
  categories: MecCategory[];
};

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!categories || categories.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Todas as categorias">
      <div className={styles.header}>
        <h2 className={styles.title}>Todas as Categorias</h2>
        <p className={styles.subtitle}>
          Explore o acervo completo distribuído em {categories.length} categorias temáticas
        </p>
      </div>

      <div
        className={`${styles.gridContainer} ${
          !isExpanded ? styles.gridCollapsed : styles.gridExpanded
        }`}
      >
        <div className={styles.grid}>
          {categories.map((cat, index) => (
            <Link
              key={cat.slug}
              href={`/categoria/${cat.slug}`}
              className={`${styles.card} ${
                index >= 8 ? styles.mobileHiddenCard : ""
              }`}
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

        {!isExpanded && categories.length > 8 && (
          <div className={styles.blurOverlay}>
            <button
              type="button"
              className={styles.expandButton}
              onClick={() => setIsExpanded(true)}
              aria-label={`Ver todas as ${categories.length} categorias`}
            >
              <span>Ver todas as categorias ({categories.length})</span>
              <svg
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.expandIcon}
                aria-hidden="true"
              >
                <path
                  d="M1 1.5L6 6.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
