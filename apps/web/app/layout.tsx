import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "../components/BottomNav";
import { HeaderNav } from "../components/HeaderNav";

export const metadata: Metadata = {
  title: "Cademy — Tools Akademik Mahasiswa",
  description:
    "Satu tempat untuk sitasi, IPK, kuis, flashcards, pomodoro, dan lainnya. Gratis tanpa daftar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" crossOrigin="" rel="preconnect" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-brand-paper font-body text-brand-navy antialiased selection:bg-brand-yellow selection:text-black">
        <header className="pt-safe fixed top-0 left-0 right-0 z-50 h-16 border-b-[3px] border-black bg-[#EAF5FC]/90 shadow-[0_4px_0px_#000000] backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <a href="/" aria-label="Cademy Home" className="group flex items-center gap-2.5">
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded border-[3px] border-black bg-brand-blue text-white shadow-[2px_2px_0px_#000000] transition-colors group-hover:bg-brand-yellow group-hover:text-black">
                <span className="material-symbols-outlined text-[24px]">school</span>
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-label text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand-blue">
                  Cademy
                </span>
                <span className="font-display text-xl font-bold tracking-tight text-brand-navy">
                  Tools Akademik
                </span>
              </span>
            </a>
            <HeaderNav />
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
                  className="brutal-press flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-black bg-white text-brand-muted shadow-[2px_2px_0px_#000000] transition-colors hover:text-brand-navy focus:outline-none"
                >
                  <span aria-hidden className="material-symbols-outlined text-[22px]">
                    search
                  </span>
                </button>
              </form>
              <a
                href="/about"
                aria-label="Tentang"
                title="Tentang"
                className="hidden h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-brand-blue text-white shadow-[2px_2px_0px_#000000] transition-colors hover:bg-brand-navy sm:inline-flex"
              >
                <span aria-hidden className="material-symbols-outlined text-[18px]">
                  person
                </span>
              </a>
            </div>
          </div>
        </header>
        <main className="w-full scroll-mt-20 pt-[calc(4rem+env(safe-area-inset-top,0px))]">{children}</main>
        <footer className="pb-safe mt-12 border-t-[3px] border-black bg-white px-4 pb-24 pt-8 sm:px-6 md:pb-8">
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
              <a href="/about#kontak" className="underline decoration-2 underline-offset-2 hover:text-brand-blue">
                Kontak
              </a>
              <a
                href="/tools"
                className="rounded border-2 border-black bg-brand-blue px-2.5 py-1 text-white shadow-[2px_2px_0px_#000000] transition-colors hover:bg-brand-navy"
              >
                Direktori Tools
              </a>
            </nav>
          </div>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
