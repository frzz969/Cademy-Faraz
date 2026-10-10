import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang — Cademy",
  description:
    "Cademy adalah platform tools akademik gratis untuk mahasiswa: sitasi, IPK, nilai sidang, kuis, flashcards, dan lainnya dalam satu deployment.",
};

const misi = [
  {
    icon: "dashboard_customize",
    iconBg: "bg-[#D9EDFA] text-[#0E4A6E]",
    title: "Satu rumah banyak tools",
    desc: "Satu deployment terpadu, puluhan rute terintegrasi tanpa perlu berpindah-pindah platform atau membuka banyak tab terpisah.",
    foot: "Terpadu & Sentral",
    footIcon: "arrow_forward",
  },
  {
    icon: "bolt",
    iconBg: "bg-[#0E4A6E] text-[#FFFFFF]",
    title: "Cepat dan sederhana",
    desc: "Client-side calculators untuk respons instan 0ms, pemuatan lazy loading untuk perkakas komputasi berat tanpa latensi jaringan.",
    foot: "0ms Response Client",
    footIcon: "speed",
  },
  {
    icon: "lock",
    iconBg: "bg-[#D9EDFA] text-[#0E4A6E]",
    title: "Privasi dulu",
    desc: "Dokumen tidak disimpan ke basis data secara default, pengolahan API key aman di server, dan enkripsi HTTPS penuh untuk ketenangan pikiran.",
    foot: "No Data Retention",
    footIcon: "verified_user",
  },
];

const fase1 = [
  {
    icon: "psychology",
    title: "AI Detector",
    sub: "Analisis Sintaksis & Probabilitas",
    badge: "External",
    badgeCls: "bg-[#D93A2B] text-[#FFFFFF]",
    desc: "Analisis struktur teks esai dan estimasi probabilitas konten yang dihasilkan oleh model generator AI populer untuk integritas akademis.",
    foot: "Tersambung Langsung ⧉",
    cta: "Buka",
    ctaIcon: "open_in_new",
    ctaCls: "bg-[#FFFFFF] text-[#0B2E4B] hover:bg-[#D9EDFA]",
    href: "/tools/ai-detector",
  },
  {
    icon: "format_quote",
    title: "Citation Generator",
    sub: "Standar Referensi Global",
    badge: "Tersedia",
    badgeCls: "bg-[#D9EDFA] text-[#0B2E4B]",
    desc: "Susun daftar pustaka dan sitasi dalam teks secara instan sesuai format APA 7th, MLA 9th, Chicago, hingga IEEE tanpa galat koma.",
    foot: "APA • MLA • IEEE",
    cta: "Gunakan Alat",
    ctaIcon: "arrow_forward",
    ctaCls: "bg-[#0E4A6E] text-[#FFFFFF] hover:bg-[#0B2E4B]",
    href: "/tools/citation",
  },
  {
    icon: "calculate",
    title: "GPA Calculator",
    sub: "Kalkulasi Indeks Prestasi",
    badge: "Tersedia",
    badgeCls: "bg-[#D9EDFA] text-[#0B2E4B]",
    desc: "Hitung IPK kumulatif, simulasikan perolehan nilai semester depan, dan proyeksikan syarat minimal kelulusan dengan bobot SKS adaptif.",
    foot: "Target Semester",
    cta: "Gunakan Alat",
    ctaIcon: "arrow_forward",
    ctaCls: "bg-[#0E4A6E] text-[#FFFFFF] hover:bg-[#0B2E4B]",
    href: "/tools/gpa",
  },
  {
    icon: "assignment_turned_in",
    title: "Grade Calculator",
    sub: "Proporsi & Bobot Evaluasi",
    badge: "Tersedia",
    badgeCls: "bg-[#D9EDFA] text-[#0B2E4B]",
    desc: "Kalkulasi bobot tugas, kuis, UTS, dan UAS. Ketahui skor minimal ujian akhir yang harus dicapai untuk mengamankan huruf mutu A.",
    foot: "Bobot Ujian",
    cta: "Gunakan Alat",
    ctaIcon: "arrow_forward",
    ctaCls: "bg-[#0E4A6E] text-[#FFFFFF] hover:bg-[#0B2E4B]",
    href: "/tools/grade",
  },
];

const stack = ["Next.js 14", "TypeScript", "Tailwind CSS", "Turborepo", "pnpm", "Vercel Edge"];

const roadmap = [
  { icon: "picture_as_pdf", title: "PDF Tools", desc: "Kompresi dokumen berukuran besar, ekstraksi tabel teks, dan pemisahan bab file skripsi secara lokal.", phase: "Fase Pra-Rilis" },
  { icon: "calendar_month", title: "Study Planner", desc: "Manajemen jadwal kuliah adaptif, deadline tugas otomatis, dan kalender ujian terintegrasi.", phase: "Fase Pra-Rilis" },
  { icon: "style", title: "Quiz & Flashcard", desc: "Latihan soal interaktif bab kuliah dengan metode Spaced Repetition untuk retensi memori jangka panjang.", phase: "Fase Konsep" },
  { icon: "fact_check", title: "Thesis Checker", desc: "Pemeriksa kelengkapan format naskah skripsi, margin panduan kampus, dan konsistensi penomoran bab.", phase: "Fase Konsep" },
];

export default function AboutPage() {
  return (
    <div className="page-about w-full">
      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-6 sm:px-6 md:py-10">
        {/* HERO */}
        <section className="flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#D9EDFA] px-3 py-1 font-body text-xs font-bold uppercase tracking-wider text-[#0B2E4B] shadow-[2px_2px_0px_#000000]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#0E4A6E]" />
            TENTANG KAMI • V2.4
          </div>
          <div className="flex max-w-3xl flex-col gap-2">
            <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-[#0B2E4B] sm:text-5xl">
              About{" "}
              <span className="inline-block rounded-lg border-2 border-black bg-[#FFD02B] px-2 py-0.5 text-[#0B2E4B] shadow-[2px_2px_0px_#000000]">
                Academic Hub
              </span>
            </h1>
            <p className="mt-1 font-body text-lg font-medium text-[#4E7390] sm:text-xl">
              Academic tools in one place. Tools for students, research, and everyday academic work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-[#FFFFFF] px-3 py-1.5 font-body text-xs font-bold text-[#0B2E4B] shadow-[2px_2px_0px_#000000] sm:text-sm">
              <span aria-hidden className="material-symbols-outlined text-base text-[#0E4A6E]">school</span>
              Platform Terbuka Mahasiswa & Peneliti
            </span>
            <span className="inline-flex items-center rounded-full border-2 border-black bg-[#D9EDFA] px-3 py-1.5 font-body text-xs font-bold uppercase text-[#0B2E4B] shadow-[2px_2px_0px_#000000]">
              100% Bebas Iklan
            </span>
          </div>
        </section>

        {/* MISI */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {misi.map((m) => (
            <div key={m.title} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-6 shadow-[4px_4px_0px_#000000] transition-transform hover:-translate-y-1">
              <div aria-hidden className="absolute -right-3 -top-3 h-16 w-16 rounded-full border-2 border-black bg-[#D9EDFA] opacity-80 transition-transform group-hover:scale-110" />
              <div className="relative z-10 space-y-4">
                <div aria-hidden className={`flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-black shadow-[2px_2px_0px_#000000] ${m.iconBg}`}>
                  <span className="material-symbols-outlined text-2xl font-black">{m.icon}</span>
                </div>
                <div>
                  <h2 className="font-display text-xl font-black text-[#0B2E4B]">{m.title}</h2>
                  <p className="mt-2 font-body text-base leading-relaxed text-[#4E7390]">{m.desc}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t-2 border-[#000000]/10 pt-4">
                <span className="font-body text-xs font-bold uppercase text-[#4E7390]">{m.foot}</span>
                <span aria-hidden className="material-symbols-outlined text-[#0B2E4B]">{m.footIcon}</span>
              </div>
            </div>
          ))}
        </section>

        {/* FASE 1 */}
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-2 border-b-4 border-[#000000] pb-3 sm:flex-row sm:items-end">
            <div>
              <span className="font-body text-xs font-bold uppercase tracking-wider text-[#4E7390]">Arsitektur Produksi Aktif</span>
              <h2 className="font-display text-2xl font-black text-[#0B2E4B] sm:text-3xl">
                Koleksi Alat Fase 1 (Rilis Aktif)
              </h2>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-black bg-[#FFD02B] px-3 py-1 font-body text-xs font-black text-[#000000]">
              4 Alat Siap Pakai
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fase1.map((t) => (
              <article key={t.title} className="flex flex-col justify-between gap-4 rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-5 shadow-[4px_4px_0px_#000000] transition-colors hover:bg-[#D9EDFA]/40">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#0E4A6E] font-bold text-[#FFFFFF]">
                        <span className="material-symbols-outlined text-xl">{t.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-black leading-tight text-[#0B2E4B]">{t.title}</h3>
                        <span className="font-body text-xs font-bold uppercase text-[#4E7390]">{t.sub}</span>
                      </div>
                    </div>
                    <span className={`rounded-full border-2 border-black px-2.5 py-1 font-body text-xs font-bold uppercase ${t.badgeCls}`}>
                      {t.badge}
                    </span>
                  </div>
                  <p className="font-body text-sm leading-relaxed text-[#4E7390]">{t.desc}</p>
                </div>
                <div className="flex items-center justify-between border-t-2 border-[#000000]/10 pt-3">
                  <span className="font-body text-xs font-bold text-[#4E7390]">{t.foot}</span>
                  <Link
                    href={t.href}
                    className={`flex h-10 items-center gap-1 rounded-xl border-2 border-black px-4 font-body text-xs font-bold shadow-[2px_2px_0px_#000000] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${t.ctaCls}`}
                  >
                    {t.cta} <span aria-hidden className="material-symbols-outlined text-sm">{t.ctaIcon}</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* TECH */}
        <section className="space-y-5 rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-6 shadow-[4px_4px_0px_#000000]">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <span className="font-body text-xs font-bold uppercase text-[#4E7390]">Modern Engineering Stack</span>
              <h2 className="font-display text-2xl font-black text-[#0B2E4B]">Teknologi di Balik Academic Hub</h2>
            </div>
            <span className="w-fit rounded-full border-2 border-black bg-[#D9EDFA] px-3 py-1 font-body text-xs font-bold text-[#0B2E4B]">
              High Performance • Monorepo
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            {stack.map((s) => (
              <div key={s} className="flex h-10 items-center gap-2 rounded-xl border-2 border-black bg-[#D9EDFA] px-3.5 font-body text-xs font-bold text-[#0B2E4B] shadow-[2px_2px_0px_#000000]">
                <span className="inline-block h-3 w-3 rounded-full bg-[#0E4A6E]" /> {s}
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 rounded-xl border-2 border-black bg-[#D9EDFA] p-4 font-body text-sm text-[#4E7390]">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-xl leading-none text-[#0E4A6E]">verified</span>
            <p className="leading-relaxed">
              Dibangun dengan struktur monorepo teroptimasi. Modul dipisahkan secara independen untuk memastikan waktu muat super cepat, isolasi keamanan tipe end-to-end, dan pembaruan berkala tanpa downtime.
            </p>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-2 border-b-4 border-[#000000] pb-3 sm:flex-row sm:items-end">
            <div>
              <span className="font-body text-xs font-bold uppercase tracking-wider text-[#4E7390]">Laboratorium Pengembangan</span>
              <h2 className="font-display text-2xl font-black text-[#0B2E4B] sm:text-3xl">
                Segera Hadir di Rilis Berikutnya
              </h2>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-black bg-[#D9EDFA] px-3 py-1 font-body text-xs font-black text-[#0B2E4B]">
              Rilis Berikutnya
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roadmap.map((r) => (
              <div key={r.title} className="flex flex-col justify-between gap-4 rounded-2xl border-[3px] border-dashed border-black bg-[#FFFFFF] p-5 shadow-[2px_2px_0px_#000000]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span aria-hidden className="text-2xl text-[#0E4A6E]">{r.icon}</span>
                    <span className="rounded-md border-2 border-black bg-[#D9EDFA] px-2 py-0.5 font-body text-xs font-bold uppercase text-[#0B2E4B]">
                      Coming Soon
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#0B2E4B]">{r.title}</h3>
                  <p className="font-body text-sm text-[#4E7390]">{r.desc}</p>
                </div>
                <span className="font-body text-xs font-bold uppercase tracking-wider text-[#4E7390]">{r.phase}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section id="kontak" className="space-y-6 rounded-2xl border-[3px] border-black bg-[#D9EDFA] p-6 text-[#0B2E4B] shadow-[4px_4px_0px_#000000] sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#FFD02B] px-3 py-1 font-body text-xs font-black uppercase text-[#000000]">
                Hubungi Tim Pengembang
              </div>
              <h2 className="font-display text-2xl font-black text-[#0B2E4B] sm:text-3xl">
                Punya ide alat akademik baru?
              </h2>
              <p className="font-body text-base leading-relaxed text-[#4E7390]">
                Academic Hub terus berkembang berkat masukan dari rekan mahasiswa, dosen, dan peneliti independen. Kirimkan saran atau laporkan bug melalui kanal terbuka kami.
              </p>
            </div>
            <div className="flex min-w-[240px] flex-col gap-3">
              <a
                href="mailto:halo@academichub.id"
                className="flex h-12 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#0E4A6E] px-5 font-body text-sm font-bold text-[#FFFFFF] shadow-[4px_4px_0px_#000000] transition-transform hover:bg-[#0B2E4B] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span aria-hidden className="material-symbols-outlined text-xl">mail</span>
                halo@academichub.id
              </a>
              <a
                href="#kontak"
                className="flex h-12 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#FFFFFF] px-5 font-body text-sm font-bold text-[#0B2E4B] shadow-[4px_4px_0px_#000000] transition-colors hover:bg-[#EAF5FC] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span aria-hidden className="material-symbols-outlined text-xl">groups</span>
                Komunitas & Kanal Kontak
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t-2 border-[#000000]/10 pt-6 sm:flex-row">
            <p className="text-center font-body text-sm text-[#4E7390] sm:text-left">
              Dibangun dengan <span aria-hidden className="material-symbols-outlined inline-block align-[-3px] text-base text-[#D93A2B]">favorite</span> untuk mahasiswa, peneliti, dan pengajar di seluruh Indonesia.
            </p>
            <div className="flex items-center gap-4">
              <a href="#privasi-ketentuan" className="font-body text-xs font-bold text-[#0E4A6E] underline hover:text-[#0B2E4B]">
                Kebijakan Privasi (Privacy Policy)
              </a>
              <a href="#privasi-ketentuan" className="font-body text-xs font-bold text-[#0E4A6E] underline hover:text-[#0B2E4B]">
                Ketentuan Layanan
              </a>
            </div>
          </div>
        </section>

        {/* PRIVASI & KETENTUAN */}
        <section id="privasi-ketentuan" className="space-y-4 rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-6 shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center gap-2">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-lg border-[3px] border-black bg-brand-panel text-[#0B2E4B] shadow-[2px_2px_0px_#000000]">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </span>
            <h2 className="font-display text-xl font-black text-[#0B2E4B] sm:text-2xl">
              Privasi & Ketentuan Layanan
            </h2>
          </div>
          <ul className="list-disc space-y-2 pl-5 font-body text-sm leading-relaxed text-[#4E7390]">
            <li>
              Tools berjalan 100% di browser: dokumen dan input tidak dikirim atau disimpan ke server Cademy.
            </li>
            <li>
              Tanpa akun dan tanpa pelacakan iklan; progres hanya tersimpan di localStorage perangkatmu.
            </li>
            <li>
              Tool berlabel Eksternal dibuka di tab baru dan tunduk pada kebijakan masing-masing penyedia.
            </li>
          </ul>
        </section>

        <div className="flex flex-col items-center justify-center gap-3 pb-6 pt-2 sm:flex-row">
          <Link
            href="/tools"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#0E4A6E] px-6 font-body text-sm font-bold text-[#FFFFFF] shadow-[4px_4px_0px_#000000] transition-colors hover:bg-[#0B2E4B] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:w-auto"
          >
            <span aria-hidden className="material-symbols-outlined text-lg">apps</span>
            Eksplorasi Direktori Alat
          </Link>
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#FFFFFF] px-6 font-body text-sm font-bold text-[#0B2E4B] shadow-[4px_4px_0px_#000000] transition-colors hover:bg-[#D9EDFA] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:w-auto"
          >
            <span aria-hidden className="material-symbols-outlined text-lg">home</span>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
