"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./DownloadButton.module.css";

type DownloadButtonProps = {
  bookId: number;
  bookTitle: string;
  bookAuthors?: string[];
  hasEpub?: boolean;
  variant?: "default" | "card";
};

type DownloadType = "epub" | "pdf";

export default function DownloadButton({
  bookId,
  bookTitle,
  bookAuthors = [],
  hasEpub = true,
  variant = "default",
}: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<DownloadType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent | PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("pointerdown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!hasEpub) {
    return (
      <div
        className={`${styles.container} ${variant === "card" ? styles.containerCard : ""}`}
      >
        <button
          disabled
          className={variant === "card" ? styles.disabledCardBtn : styles.disabledCardBtn}
        >
          {variant === "card" ? "Sem download" : "Este título não possui EPUB / PDF"}
        </button>
      </div>
    );
  }

  async function handleDownload(type: DownloadType) {
    setIsOpen(false);
    setLoadingType(type);
    setErrorMessage(null);
    setSuccessMessage(null);

    const endpoint =
      type === "pdf"
        ? `/api/books/${bookId}/download-pdf`
        : `/api/books/${bookId}/download-decrypted`;

    const defaultExt = type === "pdf" ? "pdf" : "epub";

    try {
      const response = await fetch(endpoint);

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 45;
        const validSeconds =
          Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds : 45;

        setCountdown(validSeconds);
        setErrorMessage("Limite de downloads atingido, aguarde.");
        setLoadingType(null);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
          `Erro no download (${response.status} ${response.statusText}).`
        );
      }

      const disposition = response.headers.get("Content-Disposition");
      const authorAndTitle = [bookAuthors[0], bookTitle]
        .filter(Boolean)
        .join(" - ");
      let filename = `${authorAndTitle}.${defaultExt}`;
      if (disposition) {
        const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        const legacyMatch = disposition.match(/filename="?([^";]+)"?/i);

        if (encodedMatch?.[1]) {
          filename = decodeURIComponent(encodedMatch[1]);
        } else if (legacyMatch?.[1]) {
          filename = legacyMatch[1];
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

      setSuccessMessage(`Download de ${type.toUpperCase()} concluído!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível baixar o livro. Tente novamente mais tarde.";
      setErrorMessage(msg);
    } finally {
      setLoadingType(null);
    }
  }

  const isAnyLoading = loadingType !== null;

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${variant === "card" ? styles.containerCard : ""} ${isOpen ? styles.containerOpen : ""
        }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`${styles.splitGroup} ${variant === "card" ? styles.splitGroupCard : ""
          } ${isAnyLoading || countdown > 0 ? styles.disabledGroup : ""}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload("pdf");
          }}
          disabled={isAnyLoading || countdown > 0}
          className={`${styles.mainBtn} ${variant === "card" ? styles.mainBtnCard : ""}`}
          title="Baixar em formato PDF"
          aria-label="Baixar em PDF"
          aria-busy={loadingType === "pdf"}
        >
          {loadingType ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span>
                {loadingType === "pdf" ? "Baixando PDF..." : "Baixando EPUB..."}
              </span>
            </>
          ) : countdown > 0 ? (
            <span>Aguarde {countdown}s</span>
          ) : (
            <span>Download</span>
          )}
        </button>

        <div className={styles.divider} aria-hidden="true" />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          disabled={isAnyLoading || countdown > 0}
          className={`${styles.arrowBtn} ${variant === "card" ? styles.arrowBtnCard : ""} ${isOpen ? styles.arrowBtnActive : ""
            }`}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label="Escolher formato de download"
          title="Escolher formato de download"
        >
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
            aria-hidden="true"
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className={`${styles.dropdown} ${variant === "card" ? styles.dropdownCard : ""}`}
          role="menu"
        >
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => handleDownload("pdf")}
            role="menuitem"
          >
            <div className={styles.menuItemContent}>
              <span className={styles.formatName}>PDF</span>
              <span className={styles.formatTag}>Para impressão</span>
            </div>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            onClick={() => handleDownload("epub")}
            role="menuitem"
          >
            <div className={styles.menuItemContent}>
              <span className={styles.formatName}>EPUB</span>
              <span className={styles.formatTag}>Para Kindle e apps de leitura</span>
            </div>
          </button>
        </div>
      )}

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
