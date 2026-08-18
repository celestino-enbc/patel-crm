"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#f4f1ea",
          color: "#1f2933",
        }}
      >
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "64px 24px" }}>
          <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12 }}>
            Patel CRM
          </p>
          <h1 style={{ fontSize: 28, margin: "8px 0 12px" }}>Algo salió mal</h1>
          <p style={{ lineHeight: 1.6, color: "#5c564c" }}>
            Se produjo un error inesperado. Recarga la página o vuelve a entrar. El equipo ya
            recibió el reporte si Sentry está configurado.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              border: 0,
              borderRadius: 8,
              background: "#2c3a47",
              color: "#f8f1e3",
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </main>
      </body>
    </html>
  );
}
