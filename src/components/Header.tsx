import Link from "next/link";
import Image from "next/image";
import styles from "./Header.module.css";

export default function Header() {
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
        <form method="GET" action="/" className={styles.searchForm}>
          <label htmlFor="header-search-input" className={styles.srOnly}>
            Buscar livros por título ou autor
          </label>
          <input
            id="header-search-input"
            type="search"
            name="query"
            placeholder="Pesquise por título ou autor..."
            className={styles.searchInput}
            required
          />
          <button type="submit" className={styles.searchButton}>
            Buscar
          </button>
        </form>
      </div>
    </header>
  );
}
