"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import styles from "./Header.module.css";

type HeaderProps = {
  defaultQuery?: string;
};

export default function Header({ defaultQuery = "" }: HeaderProps) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  const toggleMobileSearch = () => {
    setIsMobileSearchOpen((prev) => !prev);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logoLink} aria-label="Ir para a página inicial da Livraria">
          <Image
            src="/logo.svg"
            alt="Livraria"
            width={160}
            height={36}
            priority
            className={styles.logo}
          />
        </Link>

        {/* Desktop search bar */}
        <div className={styles.desktopSearchWrapper}>
          <form method="GET" action="/" className={styles.searchForm}>
            <label htmlFor="header-search-input" className={styles.srOnly}>
              Buscar livros por título ou autor
            </label>
            <input
              id="header-search-input"
              type="search"
              name="query"
              defaultValue={defaultQuery}
              placeholder="Pesquise por título ou autor..."
              className={styles.searchInput}
              required
            />
            <button type="submit" className={styles.searchButton}>
              Buscar
            </button>
          </form>
        </div>

        {/* Action icons (Search toggle for mobile + Theme toggle) */}
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={toggleMobileSearch}
            className={`${styles.iconButton} ${styles.mobileSearchToggle}`}
            aria-label={isMobileSearchOpen ? "Fechar busca" : "Abrir busca"}
            aria-expanded={isMobileSearchOpen}
          >
            {isMobileSearchOpen ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Expandable mobile search bar dropdown */}
      {isMobileSearchOpen && (
        <div className={styles.mobileSearchDropdown}>
          <form method="GET" action="/" className={styles.mobileSearchForm}>
            <label htmlFor="header-mobile-search-input" className={styles.srOnly}>
              Buscar livros por título ou autor
            </label>
            <input
              ref={mobileInputRef}
              id="header-mobile-search-input"
              type="search"
              name="query"
              defaultValue={defaultQuery}
              placeholder="Pesquise por título ou autor..."
              className={styles.mobileSearchInput}
              required
            />
            <button type="submit" className={styles.mobileSearchButton}>
              Buscar
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
