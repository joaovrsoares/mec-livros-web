import Link from "next/link";
import styles from "./Footer.module.css";
import { getCategoriesPreview } from "@/lib/mec-api";

type FooterProps = {
  totalBooks?: number;
};

export default async function Footer({ totalBooks }: FooterProps) {
  const currentYear = new Date().getFullYear();

  let bookCount = totalBooks;
  if (!bookCount || bookCount <= 0) {
    try {
      const data = await getCategoriesPreview();
      if (data?.total_books && data.total_books > 0) {
        bookCount = data.total_books;
      }
    } catch {
      // Fallback
    }
  }

  const formattedCount = bookCount && bookCount > 0 ? bookCount.toLocaleString("pt-BR") : null;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brandColumn}>
          <div className={styles.logoRow}>
            <span className={styles.logoText}>Livraria</span>
            <span className={styles.badge}>Acervo Aberto</span>
          </div>
          <p className={styles.tagline}>
            Acesso facilitado, leitura fluida e download em EPUB e PDF diagramado a partir do acervo público do MEC Livros.
          </p>
        </div>

        <div className={styles.infoColumn}>
          <h3 className={styles.columnTitle}>Sobre o Acervo</h3>
          <p className={styles.statsText}>
            {formattedCount ? (
              <>
                Atualmente com <strong>{formattedCount} livros</strong> disponíveis gratuitamente em domínio público, literatura infantojuvenil, clássicos e obras acadêmicas.
              </>
            ) : (
              <>
                Mais de <strong>26.000 livros</strong> disponíveis gratuitamente em domínio público, literatura infantojuvenil, clássicos e obras acadêmicas.
              </>
            )}
          </p>
        </div>

        <div className={styles.linksColumn}>
          <h3 className={styles.columnTitle}>Navegação Rápida</h3>
          <ul className={styles.linksList}>
            <li>
              <Link href="/categoria/classicos" className={styles.link}>
                Clássicos da Literatura
              </Link>
            </li>
            <li>
              <Link href="/categoria/dominio-publico" className={styles.link}>
                Domínio Público
              </Link>
            </li>
            <li>
              <Link href="/categoria/ficcao-literaria" className={styles.link}>
                Ficção Literária
              </Link>
            </li>
            <li>
              <Link href="/categoria/infantil-juvenil" className={styles.link}>
                Infantil e Juvenil
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <p className={styles.copyright}>
          © {currentYear} Livraria. Criado para tornar a literatura acessível a todos.
        </p>
      </div>
    </footer>
  );
}
