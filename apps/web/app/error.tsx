"use client";

import * as React from "react";

export default function Error({
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
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <section
        role="alert"
        aria-live="assertive"
        className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-brand-yellow text-brand-navy shadow-brutal"
          >
            <span className="material-symbols-outlined shrink-0 text-[28px] leading-none">
              error
            </span>
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-brand-navy">
            Ups, halaman bermasalah
          </h1>
        </div>
        <p className="mt-3 font-body text-sm text-brand-muted sm:text-base">
          {pesan}
        </p>
        {error?.digest ? (
          <p className="mt-1 font-label text-[11px] font-bold uppercase tracking-wider text-brand-muted">
            Kode: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-brand-blue px-4 py-2.5 font-label text-sm font-bold text-white shadow-brutal transition-all hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span
              aria-hidden
              className="material-symbols-outlined shrink-0 text-[20px] leading-none"
            >
              refresh
            </span>
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-white px-4 py-2.5 font-label text-sm font-bold text-brand-navy shadow-brutal transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span
              aria-hidden
              className="material-symbols-outlined shrink-0 text-[20px] leading-none"
            >
              home
            </span>
            Kembali ke Beranda
          </a>
        </div>
      </section>
    </div>
  );
}
