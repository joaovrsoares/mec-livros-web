import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";
import DownloadButton from "@/components/DownloadButton";
import { getBookById, getProxyCoverUrl } from "@/lib/mec-api";
import { preloadBookCovers } from "@/lib/cover-cache";

type BookDetailsProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value?: string): string {
  if (!value) {
    return "Não informado";
  }

  if (/^\d{8}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    return `${day}/${month}/${year}`;
  }

  if (/^\d{4}$/.test(value)) {
    return value;
  }

  return value;
}

export default async function BookDetailsPage({ params }: BookDetailsProps) {
  const { id } = await params;
  let book;
  try {
    book = await getBookById(id);
    if (book?.cover_filename) {
      await preloadBookCovers([book.cover_filename]);
    }
  } catch {
    notFound();
  }

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← Voltar para busca
      </Link>

      <section className={styles.content}>
        <div className={styles.coverWrap}>
          <Image
            src={getProxyCoverUrl(book.cover_filename)}
            alt={`Capa de ${book.title}`}
            fill
            sizes="(max-width: 900px) 60vw, 300px"
            className={styles.cover}
            priority
          />
        </div>

        <div className={styles.details}>
          <h1 className={styles.title}>{book.title}</h1>
          <p className={styles.author}>{book.authors?.join(", ") || "Autor desconhecido"}</p>
          <p className={styles.meta}>
            <strong>Editora:</strong> {book.publisher || "Não informado"}
          </p>
          <p className={styles.meta}>
            <strong>Publicado em:</strong> {formatDate(book.published_date)}
          </p>
          <p className={styles.meta}>
            <strong>Páginas:</strong> {book.page_count || 0}
          </p>
          <p className={styles.meta}>
            <strong>Idioma:</strong> {book.language || "Não informado"}
          </p>
          <p className={styles.meta}>
            <strong>Categorias:</strong>{" "}
            {book.categories?.length ? book.categories.join(", ") : "Não informado"}
          </p>

          <div className={styles.actions}>
            <DownloadButton
              bookId={book.id}
              bookTitle={book.title}
              hasEpub={book.has_epub}
            />
          </div>
        </div>
      </section>

      <section className={styles.descriptionBlock}>
        <h2>Descrição</h2>
        <p>{book.description || "Sem descrição disponível."}</p>
      </section>
    </main>
  );
}
