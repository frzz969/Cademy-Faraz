import Link from "next/link";
import type { Metadata } from "next";
import { categories, getPopularTools, tools } from "@cademy/tool-registry";
import { CategoryPill } from "@cademy/ui";

export const metadata: Metadata = {
  title: "Cademy — Tools Akademik Gratis untuk Mahasiswa Indonesia",
  description:
    "Direktori tools akademik gratis: generator sitasi APA/MLA, kalkulator IPK & nilai sidang, kuis, flashcards, pomodoro, dan checklist skripsi. 100% berjalan di browser, tanpa daftar.",
};

const badgeCls: Record<string, string> = {
  external: "bg-[#D93A2B] text-white",
  available: "bg-[#0E4A6E] text-white",
  beta: "bg-[#FFD02B] text-[#000000]",
  "coming-soon": "bg-[#4E7390] text-white",
};

export default function HomePage() {
  const popular = getPopularTools();
  const totalTools = tools.length;
  const browserOnlyTools = tools.filter((t) => t.status === "available" && !t.url).length;
  const totalCategories = categories.length - 1;
  return (
    <div className="page-home w-full">
      {/* HERO — academic_hub_homepage */}
      <section aria-labelledby="hero-heading" className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="order-2 flex flex-col items-start gap-4 lg:order-1 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-[#FFD02B] px-3.5 py-1.5 shadow-[4px_4px_0px_#000000]">
              <span aria-hidden className="material-symbols-outlined text-[18px] text-[#000000]">auto_awesome</span>
              <span className="text-xs font-black uppercase tracking-wide text-[#000000]">
                THE ALL-IN-ONE ACADEMIC SUITE
              </span>
            </div>
            <h1
              id="hero-heading"
              className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-[#0B2E4B] sm:text-4xl lg:text-[44px]"
            >
              Perangkat untuk{" "}
              <span className="inline-block rotate-[-1deg] rounded-lg border-[3px] border-black bg-[#0E4A6E] px-2 py-0.5 text-white shadow-[4px_4px_0px_#000000]">
                mahasiswa
              </span>
              , riset, dan kerja akademik sehari-hari.
            </h1>
            <p className="max-w-xl font-body text-base font-medium leading-relaxed text-[#4E7390] sm:text-lg">
              Jelajahi tools serbaguna yang menyederhanakan penulisan, sitasi, nilai, dan analisis tanpa fitur berlebih.
            </p>
            <form action="/tools" method="get" className="mt-2 w-full rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-3 shadow-[4px_4px_0px_#000000] sm:p-4">
              <div className="relative flex items-center">
                <span aria-hidden className="pointer-events-none absolute left-3.5 text-[#0B2E4B]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  name="q"
                  placeholder="Cari tools (mis. IPK, sitasi APA, pendeteksi AI)..."
                  className="w-full rounded-xl border-[3px] border-black bg-[#EAF5FC] py-3 pl-11 pr-24 font-body text-sm font-medium text-[#0B2E4B] placeholder:text-[#4E7390] focus:outline-none focus:ring-2 focus:ring-[#0E4A6E]"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 rounded-lg border-[3px] border-black bg-[#0E4A6E] px-3.5 py-2 font-body text-xs font-bold uppercase text-white shadow-[2px_2px_0px_#000000] transition-transform hover:bg-[#0B2E4B] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Cari
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#4E7390]">Filter:</span>
                {categories.map((c) => (
                  <CategoryPill key={c.id} href={`/tools${c.id === 'all' ? '' : `?cat=${c.id}`}`} active={c.id === 'all'}>
                    {c.label}
                  </CategoryPill>
                ))}
              </div>
            </form>
            <p className="mt-1 flex items-center gap-3 font-body text-xs font-bold text-[#4E7390]">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0E4A6E] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-black bg-[#0E4A6E]" />
              </span>
              Gratis & terbuka untuk semua kampus • Tanpa daftar
            </p>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative overflow-hidden rounded-2xl border-[3px] border-black bg-[#FFFFFF] shadow-[4px_4px_0px_#000000]">
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-[#D9EDFA] p-8 text-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-[3px] border-black bg-[#FFFFFF] shadow-[4px_4px_0px_#000000]">
                    <span className="material-symbols-outlined text-[44px] text-[#0E4A6E]">school</span>
                  </span>
                  <p className="font-display text-2xl font-extrabold tracking-tight text-[#0B2E4B]">
                    Students & researchers at work
                  </p>
                  <p className="max-w-xs font-body text-sm font-medium text-[#4E7390]">
                    Books, laptop, and glowing ideas — illustration placeholder
                  </p>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border-[3px] border-black bg-[#FFD02B] px-3 py-1 shadow-[4px_4px_0px_#000000]">
                  <span aria-hidden className="material-symbols-outlined text-[16px] text-[#000000]">bolt</span>
                  <p className="font-display text-xs font-black uppercase tracking-wide text-[#000000]">
                    Sandbox Akademik Real-Time
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-3 hidden -rotate-3 rounded-full border-[3px] border-black bg-[#D9EDFA] px-3 py-1 font-body text-xs font-black text-[#0B2E4B] shadow-[4px_4px_0px_#000000] sm:block">
                ZERO BS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR TOOLS — dari registry */}
      <section aria-labelledby="popular-tools-heading" id="tools" className="mx-auto max-w-7xl border-t-[3px] border-[#000000] px-4 py-10 sm:py-16">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-block rounded-md border-[3px] border-black bg-[#0E4A6E] px-3 py-1 font-body text-xs font-bold uppercase text-white shadow-[4px_4px_0px_#000000]">
              Instant Utilities
            </div>
            <h2 id="popular-tools-heading" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-[#0B2E4B] sm:text-3xl">
              <span aria-hidden className="material-symbols-outlined text-[32px] text-[#D93A2B]">local_fire_department</span>
              Tools Populer
            </h2>
            <p className="mt-1 font-body text-sm font-medium text-[#4E7390] sm:text-base">
              Most used academic utilities by students & researchers worldwide.
            </p>
          </div>
          <div className="text-right">
            <span className="rounded-full border-2 border-black bg-[#D9EDFA] px-3 py-1 font-body text-xs font-bold uppercase tracking-wider text-[#0B2E4B]">
              Showing {popular.length} core tools
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {popular.map((t, i) => {
            const isExternal = t.status === "external" && t.url && t.slug !== "ai-detector";
            const ctaPrimary = i === 0;
            const ctaLabel =
              t.slug === "ai-detector" ? "Open" : t.slug === "citation" ? "Launch Tool" : t.slug === "gpa" ? "Calculate" : t.slug === "grade" ? "Check Grades" : "Buka";
            return (
              <article
                key={t.slug}
                className="flex flex-col justify-between rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-5 shadow-[4px_4px_0px_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000000]"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-black bg-[#D9EDFA] shadow-[4px_4px_0px_#000000]">
                      <span aria-hidden className="material-symbols-outlined text-[28px] text-[#0E4A6E]">{t.icon}</span>
                    </div>
                    <span className={`rounded-full border-2 border-black px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000000] ${badgeCls[t.status] ?? badgeCls.available}`}>
                      {t.badge ?? (t.status === "external" ? "Eksternal" : t.status === "beta" ? "Beta" : t.status === "coming-soon" ? "Segera Hadir" : "Tersedia")}
                    </span>
                  </div>
                  <h3 className="mb-2 font-display text-xl font-bold text-[#0B2E4B]">
                    <span className="inline-block rounded-lg border-[3px] border-black bg-[#D9EDFA] px-2 py-1 text-[#0B2E4B] shadow-[4px_4px_0px_#000000]">
                      {t.name}
                    </span>
                  </h3>
                  <p className="font-body text-xs font-medium leading-relaxed text-[#4E7390] sm:text-sm">{t.description}</p>
                </div>
                <div className="mt-2 border-t-[2px] border-dashed border-[#D9EDFA] pt-6">
                  <Link
                    href={isExternal ? t.url! : `/tools/${t.slug}`}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noreferrer" : undefined}
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-black font-display text-sm font-extrabold uppercase tracking-wider shadow-[4px_4px_0px_#000000] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none ${ctaPrimary ? "bg-[#0E4A6E] text-white hover:bg-[#0B2E4B]" : "bg-[#FFFFFF] text-[#0B2E4B] hover:bg-[#D9EDFA]"}`}
                  >
                    <span>{ctaLabel}</span>
                    <span>{isExternal ? "⧉" : "→"}</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* STATS — jujur, dari registry */}
      <section aria-labelledby="community-stats-heading" id="stats" className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="relative overflow-hidden rounded-3xl border-[3px] border-black bg-[#D9EDFA] p-6 shadow-[4px_4px_0px_#000000] sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-8 select-none text-9xl font-black text-[#0B2E4B] opacity-10">
            ✎
          </div>
          <div className="relative z-10 max-w-3xl">
            <div className="mb-3 inline-block rounded-full border-2 border-black bg-[#FFFFFF] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0E4A6E] shadow-[2px_2px_0px_#000000]">
              📦 Isi Katalog Saat Ini
            </div>
            <h2 id="community-stats-heading" className="font-display text-2xl font-extrabold leading-tight text-[#0B2E4B] sm:text-3xl">
              Alat yang berjalan penuh di browser kamu, tanpa server.
            </h2>
            <p className="mt-3 max-w-xl font-body text-sm font-semibold text-[#4E7390] sm:text-base">
              Angka di bawah dihitung langsung dari katalog alat. Datamu hanya tersimpan di localStorage perangkatmu.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border-[3px] border-black bg-[#FFFFFF] p-3 shadow-[4px_4px_0px_#000000]">
                <div className="font-display text-xl font-extrabold text-[#0E4A6E] sm:text-2xl">{totalTools}</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#4E7390]">Total Alat</div>
              </div>
              <div className="rounded-xl border-[3px] border-black bg-[#FFFFFF] p-3 shadow-[4px_4px_0px_#000000]">
                <div className="font-display text-xl font-extrabold text-[#0E4A6E] sm:text-2xl">{browserOnlyTools}</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#4E7390]">Berjalan di Browser</div>
              </div>
              <div className="rounded-xl border-[3px] border-black bg-[#FFFFFF] p-3 shadow-[4px_4px_0px_#000000]">
                <div className="font-display text-xl font-extrabold text-[#0E4A6E] sm:text-2xl">{totalCategories}</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#4E7390]">Kategori Alat</div>
              </div>
              <div className="rounded-xl border-[3px] border-black bg-[#FFFFFF] p-3 shadow-[4px_4px_0px_#000000]">
                <div className="font-display text-xl font-extrabold text-[#0E4A6E] sm:text-2xl">0</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#4E7390]">Data Dikirim ke Server</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
