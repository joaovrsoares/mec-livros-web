"use client";

import { useState, useEffect } from "react";
import styles from "./DownloadButton.module.css";

type DownloadButtonProps = {
  bookId: number;
  bookTitle: string;
  hasEpub?: boolean;
};

export default function DownloadButton({
  bookId,
  bookTitle,
  hasEpub = true,
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!hasEpub) {
    return (
      <div className={styles.container}>
        <button disabled className={styles.downloadBtn}>
          Este título não possui EPUB
        </button>
      </div>
    );
  }

  async function handleDownload() {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/books/${bookId}/download-decrypted`);

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 45;
        const validSeconds = Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds : 45;

        setCountdown(validSeconds);
        setErrorMessage(
          `Limite de downloads atingido. Por favor, aguarde ${validSeconds} segundo(s) para tentar novamente.`
        );
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Erro no download (${response.status} ${response.statusText}).`
        );
      }

      // Read Content-Disposition filename if available
      const disposition = response.headers.get("Content-Disposition");
      let filename = `${bookTitle}.epub`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage("Download concluído com sucesso!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível baixar o livro. Tente novamente mais tarde.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <button
        onClick={handleDownload}
        disabled={isLoading || countdown > 0}
        className={styles.downloadBtn}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span>Processando EPUB...</span>
          </>
        ) : countdown > 0 ? (
          `Aguarde ${countdown}s`
        ) : (
          "Baixar EPUB descriptografado"
        )}
      </button>

      {errorMessage && (
        <div className={styles.toastError} role="alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className={styles.toastSuccess} role="status">
          {successMessage}
        </div>
      )}
    </div>
  );
}
