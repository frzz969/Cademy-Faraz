"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  categories,
  tools,
  type Tool,
  type ToolCategory,
} from "@cademy/tool-registry";
import { CategoryPill, CategoryTitle } from "@cademy/ui";

type Cat = ToolCategory | "all";

const badgeCls: Record<Tool["status"], string> = {
  available: "bg-[#0E4A6E] text-[#FFFFFF]",
  external: "bg-[#D93A2B] text-[#FFFFFF]",
  beta: "bg-[#FFD02B] text-[#000000]",
  "coming-soon": "bg-[#4E7390] text-[#FFFFFF]",
};

const badgeLabel: Record<Tool["status"], string> = {
  available: "Tersedia",
  external: "Eksternal",
  beta: "Beta",
  "coming-soon": "Segera Hadir",
};

const CATS: Cat[] = ["all", "writing", "research", "study", "documents", "productivity"];

export function ToolsView() {
  const params = useSearchParams();
  const qParam = params.get("q") ?? "";
  const catParam = (params.get("cat") ?? "all") as Cat;
  const focusParam = params.get("focus");
  const [query, setQuery] = React.useState(qParam);
  const [cat, setCat] = React.useState<Cat>(
    (CATS as string[]).includes(catParam) ? catParam : "all"
  );
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [toast, setToast] = React.useState<{ msg: string; icon: string } | null>(null);
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const chipsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setQuery(qParam), [qParam]);
  React.useEffect(() => {
    if ((CATS as string[]).includes(catParam)) setCat(catParam);
  }, [catParam]);

  React.useEffect(() => {
    if (focusParam === "search") searchRef.current?.focus();
  }, [focusParam]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, cat]);

  function showToast(msg: string, icon = "check_circle") {
    setToast({ msg, icon });
    window.clearTimeout((showToast as unknown as { t?: number }).t);
    (showToast as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 2400);
  }

  const filtered = tools.filter((t) => {
    const q = query.toLowerCase().trim();
    const matchQ =
      !q || `${t.name} ${t.description} ${(t.meta ?? []).join(" ")}`.toLowerCase().includes(q);
    const matchC = cat === "all" || t.category.includes(cat);
    return matchQ && matchC;
  });
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="flex w-full flex-col pb-10">
      <section className="mb-6 flex flex-col gap-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-[#D9EDFA] px-3 py-1 font-body text-[11px] font-extrabold uppercase text-[#0B2E4B] shadow-[4px_4px_0px_#000000]">
            <span aria-hidden className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Direktori Alat Akademik</span>
          </span>
          <span className="inline-flex items-center rounded-full border-[3px] border-black bg-[#FFFFFF] px-2 py-0.5 font-body text-[11px] font-extrabold uppercase text-[#4E7390] shadow-[4px_4px_0px_#000000]">
            Koleksi Lengkap
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] font-bold leading-8 text-[#0B2E4B] md:text-4xl md:leading-[44px]">
            Eksplorasi Semua Alat
          </h1>
          <p className="max-w-2xl font-body text-base text-[#4E7390]">
            Kumpulan {tools.length} utilitas untuk mahasiswa Indonesia: sitasi, IPK, kuis, PDF, dan skripsi.
          </p>
        </div>
        <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0B2E4B]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari 50+ alat riset, kalkulator, prompt AI..."
              className="h-12 w-full rounded-2xl border-[3px] border-black bg-[#D9EDFA] pl-11 pr-4 font-body text-base text-[#0B2E4B] placeholder:text-[#4E7390] shadow-[4px_4px_0px_#000000] outline-none transition-colors focus:bg-[#FFFFFF]"
            />
          </div>
          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls="chip-kategori"
            onClick={() => {
              const next = !showFilters;
              setShowFilters(next);
              if (next) chipsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            className="brutal-press flex h-12 select-none items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#0E4A6E] px-6 font-body text-xs font-bold text-[#FFFFFF] shadow-[4px_4px_0px_#000000]"
          >
            <svg aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
              <circle cx="9" cy="6" r="2" fill="#0E4A6E" stroke="currentColor" strokeWidth="2" />
              <circle cx="15" cy="12" r="2" fill="#0E4A6E" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="18" r="2" fill="#0E4A6E" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>Filter Cepat</span>
          </button>
        </div>
        <div ref={chipsRef} id="chip-kategori" className={`no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1 ${showFilters ? "" : "hidden"}`}>
          {categories.map((c) => (
            <CategoryPill
              key={c.id}
              active={cat === c.id}
              onClick={() => setCat(c.id)}
              aria-pressed={cat === c.id}
            >
              {c.id === "all" ? `Semua (${tools.length})` : c.label}
            </CategoryPill>
          ))}
        </div>
      </section>

      {cat !== "all" && (
        <CategoryTitle
          as="h2"
          label={categories.find((c) => c.id === cat)?.label ?? cat}
          count={filtered.length}
          className="mb-4"
        />
      )}

      {filtered.length === 0 ? (
        <div className="my-6 flex flex-col items-center justify-center rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-10 text-center shadow-[4px_4px_0px_#000000]">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black bg-[#FFD02B] shadow-[4px_4px_0px_#000000]">
            <span aria-hidden className="material-symbols-outlined text-[32px] text-[#0B2E4B]">search</span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#0B2E4B]">Tidak Ditemukan Alat Serupa</h2>
          <p className="mb-4 mt-1 max-w-sm font-body text-sm text-[#4E7390]">
            Coba gunakan kata kunci lain seperti &quot;sitasi&quot;, &quot;skripsi&quot;, atau ganti filter kategori aktif.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCat("all");
            }}
            className="h-11 rounded-full border-[3px] border-black bg-[#0E4A6E] px-6 font-body text-xs font-bold text-[#FFFFFF] shadow-[4px_4px_0px_#000000] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Hapus Filter & Pencarian
          </button>
        </div>
      ) : (
        <section className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => {
            const isExternal = t.status === "external" && t.url && t.slug !== "ai-detector";
            return (
              <article key={t.slug} className="flex flex-col justify-between rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-4 shadow-[4px_4px_0px_#000000] md:p-6">
                <div className="flex flex-col gap-2">
                  <div className="-mx-4 -mt-4 flex items-center justify-between rounded-t-[13px] border-b-[3px] border-black bg-[#D9EDFA] px-4 pb-2 pt-3 md:-mx-6 md:-mt-6 md:px-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-[3px] border-black bg-[#FFFFFF] shadow-[4px_4px_0px_#000000]">
                      <span aria-hidden className="material-symbols-outlined text-[24px] text-[#0B2E4B]">{t.icon}</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full border-[3px] border-black px-2.5 py-1 font-body text-[11px] font-extrabold uppercase shadow-[4px_4px_0px_#000000] ${badgeCls[t.status]}`}>
                      {t.badge ?? badgeLabel[t.status]}
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#0B2E4B]">
                    <span className="inline-block rounded-lg border-[3px] border-black bg-[#D9EDFA] px-2 py-1 text-[#0B2E4B] shadow-[4px_4px_0px_#000000]">
                      {t.name}
                    </span>
                  </h2>
                  <p className="line-clamp-3 font-body text-sm text-[#4E7390]">{t.description}</p>
                  {(t.meta ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(t.meta ?? []).map((m) => (
                        <span key={m} className="rounded-full border-2 border-black bg-[#D9EDFA] px-2 py-0.5 font-body text-[11px] font-extrabold uppercase text-[#0B2E4B]">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t-[3px] border-black pt-4">
                  {isExternal ? (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 flex-1 items-center justify-center gap-1 rounded-full border-[3px] border-black bg-[#FFFFFF] px-4 font-body text-xs font-bold text-[#0B2E4B] shadow-[4px_4px_0px_#000000] transition-colors hover:bg-[#D9EDFA] active:translate-x-1 active:translate-y-1 active:shadow-none"
                    >
                      <span>Buka Alat</span>
                      <span aria-hidden>↗</span>
                    </a>
                  ) : (
                    <Link
                      href={`/tools/${t.slug}`}
                      className="flex h-11 flex-1 items-center justify-center gap-1 rounded-full border-[3px] border-black bg-[#FFFFFF] px-4 font-body text-xs font-bold text-[#0B2E4B] shadow-[4px_4px_0px_#000000] transition-colors hover:bg-[#D9EDFA] active:translate-x-1 active:translate-y-1 active:shadow-none"
                    >
                      <span>Buka Alat</span>
                      <span aria-hidden>→</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    aria-label={`Simpan ${t.name}`}
                    aria-pressed={!!saved[t.slug]}
                    onClick={() => {
                      const on = !saved[t.slug];
                      setSaved((s) => ({ ...s, [t.slug]: on }));
                      showToast(on ? "Disimpan ke penanda riset pribadi!" : "Alat dihapus dari penanda riset.", on ? "bookmark" : "bookmark_border");
                    }}
                    className={`brutal-press flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-black text-[#0B2E4B] shadow-[4px_4px_0px_#000000] transition-colors ${saved[t.slug] ? "bg-[#D9EDFA]" : "bg-[#FFFFFF] hover:bg-[#D9EDFA]"}`}
                  >
                    <svg aria-hidden className="h-5 w-5" fill={saved[t.slug] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border-[3px] border-black bg-[#D9EDFA] p-4 shadow-[4px_4px_0px_#000000] sm:flex-row md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-black bg-[#0E4A6E] font-body text-xs font-bold text-[#FFFFFF] shadow-[2px_2px_0px_#000000]">
            {visible.length}
          </div>
          <div className="flex flex-col">
            <span className="font-body text-xs font-bold text-[#0B2E4B]">Menampilkan {visible.length} dari {filtered.length} Alat (total {tools.length})</span>
            <span className="font-body text-[11px] font-extrabold uppercase tracking-wider text-[#4E7390]">Katalog Terbuka Versi 2.4</span>
          </div>
        </div>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="brutal-press flex h-12 w-full select-none items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#FFD02B] px-8 font-body text-xs font-bold text-[#000000] shadow-[4px_4px_0px_#000000] sm:w-auto"
          >
            <span>Muat Lebih Banyak Alat</span>
            <span aria-hidden className="material-symbols-outlined text-[20px]">bolt</span>
          </button>
        ) : (
          <p className="flex h-12 w-full items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#FFFFFF] px-8 font-body text-xs font-bold text-[#0B2E4B] shadow-[4px_4px_0px_#000000] sm:w-auto">
            <span>Koleksi Lengkap Ditampilkan</span>
            <span aria-hidden className="material-symbols-outlined text-[20px]">check</span>
          </p>
        )}
      </section>

      <div
        aria-live="polite"
        className={`fixed bottom-20 left-4 right-4 z-40 flex items-center gap-3 rounded-2xl border-[3px] border-black bg-[#0B2E4B] p-4 text-[#FFFFFF] shadow-[4px_4px_0px_#000000] transition-all sm:bottom-6 sm:left-auto sm:w-80 ${toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
      >
        <span className="material-symbols-outlined text-2xl text-[#FFD02B]">{toast?.icon ?? "bookmark"}</span>
        <p className="font-body text-sm leading-tight">{toast?.msg ?? "Pilihan Anda telah diperbarui."}</p>
      </div>
    </div>
  );
}
