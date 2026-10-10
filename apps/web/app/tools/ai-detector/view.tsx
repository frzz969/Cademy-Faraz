"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";

const URL = "https://ai-detector-mahasiswa.vercel.app";

const SAMPLE =
  "Penelitian ini bertujuan untuk menganalisis pengaruh motivasi belajar terhadap hasil capaian akademik mahasiswa semester akhir. Metode yang digunakan adalah survei kuantitatif dengan sampel sebanyak 120 responden dari tiga program studi berbeda. Hasil analisis menunjukkan korelasi positif yang signifikan antara kedua variabel tersebut.";

function simulateScore(text: string): number {
  const words = (text.trim().match(/\S+/g) ?? []).length;
  if (words === 0) return 0;
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const avgLen = words / Math.max(sentences.length, 1);
  const uniq = new Set(text.toLowerCase().replace(/[^a-zà-ž0-9\s]/gi, " ").split(/\s+/).filter(Boolean));
  const variety = uniq.size / Math.max(words, 1);
  // Heuristik layaknya Stitch: kalimat seragam + variasi rendah → skor AI tinggi.
  let ai = 50 + (avgLen > 18 ? 18 : avgLen < 10 ? -12 : 0) + (variety < 0.45 ? 22 : variety > 0.65 ? -18 : 0);
  ai = Math.max(4, Math.min(98, Math.round(ai)));
  return 100 - ai; // dikembalikan sebagai orisinalitas manusia, seperti Stitch
}

export default function AiDetectorView() {
  const [sample, setSample] = React.useState("");
  const [result, setResult] = React.useState<number | null>(null);

  return (
    <ToolShell
      eyebrow="Hub / Alat"
      title="AI Detector"
      description="Simulasi heuristik lokal untuk edukasi — bukan detektor sungguhan. Coba simulasi di bawah atau buka tool eksternal."
      icon="smart_toy"
      badge="External"
      external
    >
      <div className="flex w-full flex-col pb-2">

        {/* Bridge + sandbox berdampingan di desktop */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <section className="relative mb-5 rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-5 shadow-[4px_4px_0px_#000000] lg:col-span-7 lg:mb-0">
          <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full border-2 border-black bg-[#D93A2B] px-3 py-0.5 text-[#FFFFFF] shadow-[2px_2px_0px_#000000]">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[14px] leading-none">public</span>
            <span className="font-body text-[11px] font-bold uppercase tracking-widest">External Tool</span>
          </div>

          <div className="my-3 flex items-center justify-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border-[3px] border-black bg-[#D9EDFA] shadow-[3px_3px_0px_#000000]">
              <div className="relative flex items-center justify-center">
                <span aria-hidden className="material-symbols-outlined shrink-0 text-[52px] leading-none text-[#0B2E4B]">smart_toy</span>
                <div className="absolute -bottom-1 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-[#0E4A6E] text-[#FFFFFF] shadow-[2px_2px_0px_#000000]">
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">manage_search</span>
                </div>
              </div>
              <span aria-hidden className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-black bg-[#FFD02B] shadow-[1px_1px_0px_#000000]" />
              <span aria-hidden className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full border border-black bg-[#0E4A6E]" />
            </div>
          </div>

          <div className="mb-3 mt-2 text-center">
            <div className="mb-2 inline-block rounded-full border-2 border-black bg-[#D9EDFA] px-2.5 py-0.5 font-body text-[11px] font-bold uppercase tracking-wider text-[#0B2E4B]">
              Tautan Eksternal
            </div>
            <h1 className="font-display text-[26px] font-bold leading-8 tracking-tight text-[#0B2E4B]">
              AI Detector
            </h1>
            <p className="mt-1 font-body text-sm font-bold text-[#0E4A6E]">
              Analyze your writing with AI Detector
            </p>
          </div>

          <div className="mb-5 rounded-2xl border-2 border-black bg-[#D9EDFA] p-3.5 shadow-[2px_2px_0px_#000000]">
            <p className="font-body text-sm font-medium leading-relaxed text-[#4E7390]">
              Pindai esai, draf skripsi, dan artikel ilmiah untuk estimasi probabilitas
              teks berbasis generator AI — menurut penyedia. Rincian fitur mengikuti
              halaman tool eksternal tersebut.
            </p>
          </div>

          <a
            href={URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#0E4A6E] px-6 text-[#FFFFFF] shadow-[4px_4px_0px_#000000] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <span className="font-display text-xl font-bold tracking-tight">Buka AI Detector Eksternal</span>
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[24px] leading-none">open_in_new</span>
          </a>
          <p className="mt-2 text-center font-body text-[11px] font-bold uppercase tracking-wider text-[#4E7390]">
            Dibuka di tab baru • Kebijakan layanan milik penyedia
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 border-t-2 border-black pt-3 text-center">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0E4A6E] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0E4A6E]" />
            </span>
            <span className="font-body text-xs font-medium text-[#4E7390]">
              Tautan keluar • Kebijakan layanan milik penyedia
            </span>
          </div>
        </section>

        {/* Uji ringkas */}
        <section className="mb-5 rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-4 shadow-[4px_4px_0px_#000000] lg:col-span-5 lg:mb-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden className="material-symbols-outlined text-[22px] text-[#0E4A6E]">assignment_turned_in</span>
              <h2 className="font-display text-xl font-bold text-[#0B2E4B]">Uji Ringkas Teks</h2>
            </div>
            <span className="flex items-center gap-1 rounded-full border-[3px] border-black bg-[#FFD02B] px-2 py-0.5 font-body text-[11px] font-extrabold uppercase text-[#000000] shadow-[2px_2px_0px_#000000]">
              <span aria-hidden className="material-symbols-outlined text-[14px]">science</span>
              DEMO — bukan detektor sungguhan
            </span>
          </div>
          <p className="mb-3 rounded-2xl border-2 border-black bg-[#FFD02B] p-2 font-body text-xs font-bold text-[#000000]">
            DEMO — bukan detektor sungguhan. Ini simulasi heuristik lokal untuk edukasi, bukan bukti orisinalitas.
          </p>
          <div className="mb-3 space-y-2">
            <textarea
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              rows={3}
              placeholder="Ketik atau tempel satu paragraf pendahuluan untuk cek simulasi skor cepat..."
              aria-label="Teks untuk uji ringkas"
              className="w-full resize-none rounded-2xl border-2 border-black bg-[#D9EDFA] p-3 font-body text-sm text-[#0B2E4B] placeholder:text-[#4E7390] outline-none transition-colors focus:bg-[#FFFFFF]"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSample(SAMPLE)}
                className="text-left font-body text-xs font-bold text-[#0E4A6E] hover:underline"
              >
                + Isi Contoh Abstrak
              </button>
              <button
                type="button"
                onClick={() => setResult(simulateScore(sample))}
                disabled={sample.trim().length === 0}
                className="rounded-full border-2 border-black bg-[#FFD02B] px-3 py-1.5 font-body text-xs font-bold text-[#000000] shadow-[2px_2px_0px_#000000] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              >
                Cek Probabilitas
              </button>
            </div>
          </div>
          {result !== null && (
            <div className="rounded-2xl border-2 border-black bg-[#D9EDFA] p-3 shadow-[2px_2px_0px_#000000]">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-body text-xs font-bold text-[#0B2E4B]">
                  Estimasi Orisinalitas Manusia:
                </span>
                <span className="flex items-center gap-1 rounded-full border-2 border-black bg-[#FFD02B] px-2 py-0.5 font-body text-[10px] font-extrabold uppercase text-[#000000]">
                  Hasil simulasi
                </span>
              </div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="sr-only">Skor orisinalitas</span>
                <span className="font-display text-xl font-bold text-[#0E4A6E]">{result}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full border-2 border-black bg-[#FFFFFF]">
                <div className="h-full bg-[#0E4A6E] transition-all duration-500" style={{ width: `${result}%` }} />
              </div>
              <p className="mt-2 font-body text-[11px] font-bold uppercase text-[#4E7390]">
                {result >= 80
                  ? "Pola struktur kalimat alami. Klik tombol utama di atas untuk laporan komprehensif."
                  : result >= 60
                    ? "Ada pola berulang. Pertimbangkan parafrase sebelum cek penuh."
                    : "Banyak pola mirip-AI. Parafrase argumen dan tambah referensi primer."}
              </p>
            </div>
          )}
        </section>

        </div>

        {/* Keunggulan */}
        <section className="mb-5 mt-5 space-y-3">
          <div className="flex items-center gap-1.5 px-1">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-[#0E4A6E]">bolt</span>
            <h2 className="font-display text-xl font-bold text-[#0B2E4B]">Tentang Simulasi Ini</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              icon: "verified",
              title: "Simulasi Heuristik Lokal",
              chip: "Edukasi",
              chipCls: "bg-[#FFD02B] text-[#000000]",
              desc: "Skor dihitung dari panjang kalimat & variasi kata di browser — untuk latihan, bukan bukti orisinalitas.",
            },
            {
              icon: "lock",
              title: "Privasi Naskah Terjamin",
              chip: "Aman",
              chipCls: "bg-[#D9EDFA] text-[#0E4A6E]",
              desc: "Dokumen diproses di memori sesi aktif dan tidak disimpan ke basis data publik maupun dipakai untuk training model.",
            },
            {
              icon: "description",
              title: "Tanpa Laporan Formal",
              chip: "Demo",
              chipCls: "bg-[#D9EDFA] text-[#0B2E4B]",
              desc: "Halaman ini tidak membuat laporan PDF/PNG. Gunakan tool eksternal di atas bila butuh laporan.",
            },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3.5 rounded-2xl border-[3px] border-black bg-[#FFFFFF] p-3.5 shadow-[4px_4px_0px_#000000]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-black bg-[#D9EDFA] text-[#0E4A6E] shadow-[2px_2px_0px_#000000]">
                <span aria-hidden className="material-symbols-outlined text-[24px]">{f.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-display text-xl font-bold text-[#0B2E4B]">{f.title}</h3>
                  <span className={`rounded border px-1.5 py-0.5 font-body text-[11px] font-bold uppercase ${f.chipCls}`} style={{ outline: "1.5px solid #000000" }}>
                    {f.chip}
                  </span>
                </div>
                <p className="mt-1 font-body text-sm text-[#4E7390]">{f.desc}</p>
              </div>
            </div>
          ))}
          </div>
        </section>

        {/* Pedoman */}
        <section className="mb-6 rounded-2xl border-[3px] border-black bg-[#D9EDFA] p-4 shadow-[4px_4px_0px_#000000]">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#FFFFFF] text-[#D93A2B] shadow-[2px_2px_0px_#000000]">
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none font-bold">priority_high</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#0B2E4B]">
                Pedoman Sidang & Seminar Skripsi
              </h2>
              <p className="mt-1 font-body text-sm font-medium leading-normal text-[#4E7390]">
                Skor simulasi bersifat <strong className="text-[#0B2E4B]">indikator pendukung</strong>,
                bukan vonis mutlak plagiarisme. Jika orisinalitas di bawah 60%, lakukan parafrase
                argumen dan sertakan referensi primer langsung dari jurnal bereputasi.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t-2 border-[#000000] pt-3">
            <span className="rounded border bg-[#FFFFFF] px-2 py-0.5 font-body text-[11px] font-bold uppercase text-[#0B2E4B]" style={{ outline: "1.5px solid #000000" }}>
              ORISINALITAS AMAN: ≥ 80%
            </span>
            <span className="rounded border bg-[#FFFFFF] px-2 py-0.5 font-body text-[11px] font-bold uppercase text-[#0B2E4B]" style={{ outline: "1.5px solid #000000" }}>
              CEK ULANG: 60% - 79%
            </span>
            <span className="rounded border bg-[#FFFFFF] px-2 py-0.5 font-body text-[11px] font-bold uppercase text-[#D93A2B]" style={{ outline: "1.5px solid #000000" }}>
              REVISI MAYOR: &lt; 60%
            </span>
          </div>
        </section>

        <p className="pt-2 text-center font-body text-xs font-medium text-[#4E7390]">
          Skor simulasi bersifat heuristik — gunakan tool eksternal di atas untuk laporan komprehensif.
        </p>
      </div>
    </ToolShell>
  );
}
