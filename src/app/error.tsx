"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to error monitoring service if available
    console.error("Erro capturado pela error boundary do Next.js:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem", color: "#0f172a" }}>
        Ops! Algo deu errado
      </h2>
      <p style={{ color: "#64748b", maxWidth: 480, marginBottom: "1.5rem" }}>
        Ocorreu um erro ao carregar esta página. Pode ter ocorrido uma instabilidade temporária na API do MEC ou na sua conexão.
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0066cc",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
        <Link
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#f1f5f9",
            color: "#334155",
            borderRadius: "6px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}
