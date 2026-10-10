"use client";

import * as React from "react";

// Boundary terakhir: root layout ikut error sehingga file ini wajib membawa
// <html>/<body> sendiri + inline style agar tetap terbaca walau CSS gagal.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pesan =
    error?.message && error.message.trim()
      ? error.message
      : "Terjadi kesalahan tak terduga. Coba muat ulang halaman ini.";

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#EAF5FC",
          color: "#0B2E4B",
          fontFamily:
            "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          role="alert"
          aria-live="assertive"
          style={{
            width: "100%",
            maxWidth: "560px",
            backgroundColor: "#FFFFFF",
            border: "3px solid #000000",
            borderRadius: "16px",
            boxShadow: "4px 4px 0px #000000",
            padding: "24px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 800,
              color: "#0B2E4B",
            }}
          >
            Ups, halaman bermasalah
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: "14px", color: "#4A6B84" }}>
            {pesan}
          </p>
          {error?.digest ? (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#4A6B84",
              }}
            >
              KODE: {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                flex: 1,
                minHeight: "44px",
                minWidth: "44px",
                borderRadius: "999px",
                border: "3px solid #000000",
                backgroundColor: "#0E9FD8",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "4px 4px 0px #000000",
              }}
            >
              Coba lagi
            </button>
            <a
              href="/"
              style={{
                flex: 1,
                minHeight: "44px",
                minWidth: "44px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                border: "3px solid #000000",
                backgroundColor: "#FFFFFF",
                color: "#0B2E4B",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "4px 4px 0px #000000",
              }}
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
