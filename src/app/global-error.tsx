"use client";

import { useEffect } from "react";

export default function GlobalError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro global capturado:", _error);
  }, [_error]);
  return (
    <html lang="pt-BR">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <h2>Erro crítico na aplicação</h2>
        <p style={{ color: "#64748b" }}>
          Desculpe pelo inconveniente. Um erro grave impediu a exibição da página.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0066cc",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Recarregar aplicação
        </button>
      </body>
    </html>
  );
}
