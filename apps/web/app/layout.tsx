import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cademy — Tools Akademik Mahasiswa",
  description:
    "Satu tempat untuk sitasi, IPK, kuis, flashcards, pomodoro, dan lainnya. Gratis tanpa daftar.",
};

function NavPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="brutal-press rounded-full border-[3px] border-black bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-navy shadow-[2px_2px_0px_#000000] transition-colors hover:bg-brand-yellow"
    >
      {children}
    </a>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" crossOrigin="" rel="preconnect" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-brand-paper font-body text-brand-navy antialiased selection:bg-brand-yellow selection:text-black">
        <header className="sticky top-0 z-50 border-b-[3px] border-black bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <a href="/" aria-label="Cademy Home" className="group flex items-center gap-2">
              <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-black bg-brand-blue text-white shadow-brutal transition-colors group-hover:bg-brand-yellow group-hover:text-black">
                <span className="material-symbols-outlined text-[24px]">school</span>
              </span>
              <span className="leading-none">
                <span className="block font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                  Cademy
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  v2.4 Comic Suite
                </span>
              </span>
            </a>
            <nav aria-label="Navigasi utama" className="hidden items-center gap-2 md:flex">
              <NavPill href="/tools">Tools</NavPill>
              <NavPill href="/tools?cat=all">Kategori</NavPill>
              <NavPill href="/about">About</NavPill>
            </nav>
            <div className="flex items-center gap-2">
              <form action="/tools" method="get" role="search" aria-label="Pencarian tools" className="flex items-center gap-2">
                <input
                  type="search"
                  name="q"
                  placeholder="Cari tools…"
                  aria-label="Cari tools"
                  className="hidden h-10 w-32 rounded-full border-[3px] border-black bg-white px-3.5 text-xs font-bold text-brand-navy shadow-[2px_2px_0px_#000000] outline-none placeholder:text-brand-muted focus:bg-brand-paper sm:block lg:w-44"
                />
                <button
                  type="submit"
                  aria-label="Cari tools"
                  title="Cari tools"
                  className="brutal-press flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-brand-yellow shadow-brutal transition-colors hover:bg-yellow-300 focus:outline-none"
                >
                  <svg aria-hidden className="h-5 w-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
              <a
                href="/tools"
                className="brutal-press hidden h-10 items-center justify-center rounded-xl border-[3px] border-black bg-brand-blue px-4 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0px_#000000] transition-colors hover:bg-brand-navy sm:inline-flex"
              >
                Mulai
              </a>
            </div>
          </div>
        </header>
        <main className="w-full">{children}</main>
        <footer className="mt-12 border-t-[3px] border-black bg-white px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg border-[3px] border-black bg-brand-yellow text-sm font-bold text-black shadow-[2px_2px_0px_#000000]">
                C
              </span>
              <div>
                <span className="block font-display text-base font-extrabold">Cademy</span>
                <p className="text-xs font-semibold text-brand-muted">
                  © {new Date().getFullYear()} Cademy Neo-Comic Suite. Untuk mahasiswa Indonesia.
                </p>
              </div>
            </div>
            <nav
              aria-label="Tautan footer"
              className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-wider"
            >
              <a href="/about#privasi-ketentuan" className="underline decoration-2 underline-offset-2 hover:text-brand-blue">
                Ketentuan
              </a>
              <a href="/about#privasi-ketentuan" className="underline decoration-2 underline-offset-2 hover:text-brand-blue">
                Privasi
              </a>
              <a
                href="/tools"
                className="rounded border-2 border-black bg-brand-blue px-2.5 py-1 text-white shadow-[2px_2px_0px_#000000] hover:bg-brand-navy"
              >
                Direktori Tools
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
