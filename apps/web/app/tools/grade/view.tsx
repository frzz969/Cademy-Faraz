"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import {
  clampBobot,
  clampNilai,
  hurufDanPredikat,
  keputusanSidang,
} from "@cademy/utils";

interface Penilai {
  id: string;
  peran: string;
  nama: string;
  tag: string;
  bobot: number;
  nilai: number;
}

interface Riwayat {
  id: string;
  tahap: string;
  judul: string;
  skor: number;
  huruf: string;
  tanggal: string;
}

const KEY = "cademy:sidang";
const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function loadRiwayat(): Riwayat[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Riwayat[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function copyTextWithFallback(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("clipboard unavailable");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

const DEFAULT_PENILAI: Penilai[] = [
  { id: "pembimbing", peran: "Dosen Pembimbing", nama: "Dr. Ir. Rian Prasetya", tag: "Ketua Sidang", bobot: 40, nilai: 90 },
  { id: "penguji1", peran: "Dosen Penguji 1", nama: "Prof. Handoko", tag: "Materi & Metodologi", bobot: 30, nilai: 87 },
  { id: "penguji2", peran: "Dosen Penguji 2", nama: "Siti Sarah, M.Ds", tag: "Aplikasi & Tata Tulis", bobot: 30, nilai: 88 },
];

export default function GradePage() {
  const [penilai, setPenilai] = React.useState<Penilai[]>(DEFAULT_PENILAI);
  const [riwayat, setRiwayat] = React.useState<Riwayat[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const toastTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setRiwayat(loadRiwayat());
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(KEY, JSON.stringify(riwayat));
      } catch {
        /* abaikan */
      }
    }
  }, [riwayat, ready]);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  // (clampBobot/clampNilai kini dari @cademy/utils — diimpor di atas)
  function upd(id: string, patch: Partial<Penilai>) {
    setPenilai((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function applyPreset(bobot: [number, number, number], label: string) {
    setPenilai((ps) => ps.map((p, i) => ({ ...p, bobot: bobot[i] })));
    showToast(`Preset ${label} diterapkan!`);
  }

  const totalBobot = penilai.reduce((a, p) => a + p.bobot, 0);
  const bobotValid = Math.abs(totalBobot - 100) < 0.01;
  const kontribusi = penilai.map((p) => (p.nilai * p.bobot) / 100);
  const finalScore = kontribusi.reduce((a, c) => a + c, 0);
  const { huruf, desc } = hurufDanPredikat(finalScore);
  const lulus = finalScore >= 55;

  const CIRC = 364.4;
  const seg = penilai.map((p) => (p.bobot / 100) * CIRC);
  const offsets = [0, -seg[0], -(seg[0] + seg[1])];

  // Nomor simulasi dari angka terbesar yang ada (bukan length+1),
  // supaya tak duplikat setelah ada riwayat yang dihapus.
  function labelSimulasiBerikutnya(): string {
    let maks = 0;
    for (const r of riwayat) {
      const m = /^SIMULASI (\d+)$/.exec(r.tahap);
      if (m) maks = Math.max(maks, Number(m[1]));
    }
    return `SIMULASI ${maks + 1}`;
  }

  function simpanSimulasi() {
    if (!bobotValid) {
      showToast("Bobot harus berjumlah 100% — sesuaikan slider dulu.");
      return;
    }
    const entry: Riwayat = {
      id: uid(),
      tahap: labelSimulasiBerikutnya(),
      judul: "Sidang Skripsi Akhir",
      skor: Math.round(finalScore * 100) / 100,
      huruf,
      tanggal: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    };
    setRiwayat((r) => [...r, entry]);
    showToast("Simulasi tersimpan ke riwayat!");
  }

  function resetDefault() {
    setPenilai(DEFAULT_PENILAI.map((p) => ({ ...p })));
    showToast("Nilai penilai dikembalikan ke default!");
  }

  async function salinHasil() {
    if (!bobotValid) {
      showToast("Bobot harus berjumlah 100% — sesuaikan slider dulu.");
      return;
    }
    const teks = [
      "Hasil Sidang Cademy",
      `Skor akhir: ${finalScore.toFixed(2)}/100 (${huruf} — ${desc})`,
      `Keputusan: ${keputusanSidang(finalScore)}`,
      ...penilai.map((p, i) => `- ${p.peran} (${p.nama}): nilai ${p.nilai}, bobot ${p.bobot}% = ${kontribusi[i].toFixed(2)} Pts`),
    ].join("\n");
    const ok = await copyTextWithFallback(teks);
    showToast(ok ? "Hasil disalin ke clipboard!" : "Gagal menyalin — browser memblokir clipboard.");
  }

  const inputNamaCls =
    "w-full bg-transparent font-display text-xl font-bold text-brand-navy outline-none border-b-2 border-dashed border-transparent focus:border-brand-blue";
  const inputNilaiCls =
    "h-11 w-full rounded-lg bg-white px-3 text-center font-display text-xl font-bold text-brand-navy shadow-brutal-sm ring-2 ring-black outline-none focus:bg-brand-panel transition-all";

  return (
    <ToolShell
      eyebrow="Alat Studi"
      title="Kalkulator Nilai Sidang"
      description="Hitung nilai sidang skripsi dari 3 penilai secara presisi dan realtime."
      icon="pie_chart"
      badge="Bobot Otomatis"
      badgeTone="beta"
    >
      {/* Sub-header: badge + preset */}
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <span className="font-body text-xs font-semibold text-brand-muted">
          Skala umum 9-huruf — cek aturan kampusmu
        </span>
        <div className="flex items-center gap-2">
          <span className="font-label text-xs font-bold uppercase text-brand-navy">Preset:</span>
          <button
            type="button"
            onClick={() => applyPreset([40, 30, 30], "40 / 30 / 30")}
            className="rounded-full bg-white px-3 py-1.5 font-label text-xs font-bold text-brand-navy shadow-brutal ring-2 ring-black transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            40/30/30
          </button>
          <button
            type="button"
            onClick={() => applyPreset([50, 25, 25], "50 / 25 / 25")}
            className="rounded-full bg-brand-panel px-3 py-1.5 font-label text-xs font-bold text-brand-navy shadow-brutal ring-2 ring-black transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            50/25/25
          </button>
        </div>
      </div>

      {/* Kartu total besar */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-brand-panel p-5 text-brand-navy border-[3px] border-black shadow-brutal">
        <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-brand-blue/10" />
        <div className="absolute right-4 top-4 hidden rotate-6 sm:block">
          <div
            className={`flex items-center gap-1 rounded-full px-3 py-1 font-label text-[11px] font-extrabold uppercase tracking-wider shadow-brutal ring-2 ring-black ${
              lulus ? "bg-brand-yellow text-black" : "bg-brand-brick text-white"
            }`}
          >
            {lulus ? (
              <>
                <span aria-hidden className="material-symbols-outlined text-[16px]">celebration</span> MEMENUHI SYARAT
              </>
            ) : (
              <>
                <span aria-hidden className="material-symbols-outlined text-[16px]">warning</span> BELUM MEMENUHI
              </>
            )}
          </div>
        </div>
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-label text-[11px] font-extrabold uppercase shadow-brutal-sm ring-2 ring-black">
              <span className="h-2 w-2 animate-ping rounded-full bg-brand-blue" />
              Status Kelulusan
            </div>
            <p className="font-label text-xs font-bold text-brand-muted">Hasil simulasi — bukan keputusan resmi kampus.</p>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="font-display text-4xl font-extrabold tracking-tight">{finalScore.toFixed(2)}</span>
              <span className="font-label text-sm font-bold text-brand-muted">/ 100</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-brand-yellow px-2.5 py-0.5 font-display text-xl font-bold text-black shadow-brutal-sm ring-2 ring-black">
                {huruf}
              </div>
              <span className="font-body text-base font-bold">{desc}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-brutal-sm ring-2 ring-black">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow text-black ring-2 ring-black">
                <span aria-hidden className="material-symbols-outlined text-[24px]">workspace_premium</span>
              </div>
              <div>
                <div className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Keputusan Sidang</div>
                <div className="font-display text-lg font-bold uppercase tracking-wide">{keputusanSidang(finalScore)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Donut + input bento */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 border-[3px] border-black shadow-brutal lg:col-span-5">
          <div>
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold"><span aria-hidden className="material-symbols-outlined text-[22px] text-[#0E4A6E]">pie_chart</span> Porsi Kontribusi</h2>
              <span className="rounded-full bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold ring-1 ring-black">
                {totalBobot}% Total
              </span>
            </div>
            <p className="mb-4 font-body text-sm text-brand-muted">
              Visualisasi proporsi kontribusi skor pembimbing dan penguji terhadap nilai kumulatif akhir.
            </p>
            <div className="relative my-3 flex items-center justify-center">
              <svg className="h-48 w-48 -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="58" fill="none" stroke="#EAF5FC" strokeWidth="24" strokeDasharray={CIRC} strokeDashoffset={0} />
                <circle cx="80" cy="80" r="58" fill="none" stroke="#0E4A6E" strokeWidth="24" strokeLinecap="round" className="transition-all duration-300" strokeDasharray={`${seg[0]} ${CIRC - seg[0]}`} strokeDashoffset={offsets[0]} />
                <circle cx="80" cy="80" r="58" fill="none" stroke="#FFD02B" strokeWidth="24" strokeLinecap="round" className="transition-all duration-300" strokeDasharray={`${seg[1]} ${CIRC - seg[1]}`} strokeDashoffset={offsets[1]} />
                <circle cx="80" cy="80" r="58" fill="none" stroke="#D9EDFA" strokeWidth="24" strokeLinecap="round" className="transition-all duration-300" strokeDasharray={`${seg[2]} ${CIRC - seg[2]}`} strokeDashoffset={offsets[2]} />
                <circle cx="80" cy="80" r="46" fill="none" stroke="#000000" strokeWidth="2.5" />
                <circle cx="80" cy="80" r="70" fill="none" stroke="#000000" strokeWidth="2.5" />
              </svg>
              <div className="pointer-events-none absolute flex flex-col items-center text-center">
                <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Skor Rerata</span>
                <span className="font-display text-2xl font-bold">{finalScore.toFixed(1)}</span>
                <span aria-hidden className="material-symbols-outlined text-[20px] text-[#0E4A6E]">verified</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 pt-4">
            {penilai.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-brand-paper p-2 shadow-brutal-sm ring-1 ring-black">
                <div className="flex items-center gap-2">
                  <span className={`h-3.5 w-3.5 rounded-sm ring-1 ring-black ${i === 0 ? "bg-brand-blue" : i === 1 ? "bg-brand-yellow" : "bg-brand-panel"}`} />
                  <span className="max-w-[130px] truncate font-label text-xs font-bold">
                    {p.peran === "Dosen Pembimbing" ? "Pembimbing" : `Penguji ${i}`} ({p.bobot}%)
                  </span>
                </div>
                <span className="font-label text-xs font-bold">{kontribusi[i].toFixed(2)} Pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-7">
          {penilai.map((p, i) => (
            <div key={p.id} className="relative rounded-2xl bg-white p-4 border-[3px] border-black shadow-brutal">
              <div className="flex items-start justify-between gap-2 pb-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-brutal-sm ring-2 ring-black ${
                      i === 1 ? "bg-brand-yellow text-black" : "bg-brand-panel text-brand-blue"
                    }`}
                  >
                    <span aria-hidden className="material-symbols-outlined text-[20px]">{i === 0 ? "person_apron" : i === 1 ? "school" : "assignment_ind"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-label text-[11px] font-extrabold uppercase text-brand-blue">{p.peran}</span>
                    <input
                      value={p.nama}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => upd(p.id, { nama: e.target.value })}
                      className={inputNamaCls}
                      aria-label={`Nama ${p.peran}`}
                    />
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-brand-paper px-2 py-0.5 font-label text-[11px] font-extrabold ring-1 ring-black">
                  {p.tag}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
                <div className="col-span-1 space-y-1 sm:col-span-8">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor={`weight-${p.id}`} className="font-label text-xs font-bold text-brand-muted">
                      Bobot Persentase
                    </label>
                    <span className="font-label text-sm font-bold">{p.bobot}%</span>
                  </div>
                  <input
                    id={`weight-${p.id}`}
                    type="range"
                    min={10}
                    max={80}
                    value={p.bobot}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => upd(p.id, { bobot: clampBobot(Number(e.target.value)) })}
                    className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-brand-paper accent-brand-blue ring-2 ring-black"
                  />
                </div>
                <div className="col-span-1 sm:col-span-4">
                  <label htmlFor={`score-${p.id}`} className="mb-1 block font-label text-xs font-bold text-brand-muted">
                    Nilai (0-100)
                  </label>
                  <input
                    id={`score-${p.id}`}
                    type="number"
                    min={0}
                    max={100}
                    value={p.nilai}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => upd(p.id, { nilai: clampNilai(Number(e.target.value)) })}
                    className={inputNilaiCls}
                  />
                </div>
              </div>
            </div>
          ))}
          {!bobotValid && (
            <div role="alert" className="flex items-center gap-2 rounded-2xl bg-red-100 p-3 text-brand-brick shadow-brutal ring-2 ring-black">
              <span aria-hidden className="material-symbols-outlined text-xl">warning</span>
              <span className="font-label text-xs font-bold text-black">
                Bobot harus berjumlah 100% — Total bobot saat ini {totalBobot}% bukan 100%! Periksa proporsi pembimbing dan penguji.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Riwayat + cetak */}
      <div className="mt-5 space-y-4 rounded-2xl bg-white p-5 border-[3px] border-black shadow-brutal">
        <div className="flex flex-col justify-between gap-3 pb-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-yellow text-black shadow-brutal-sm ring-2 ring-black">
              <span aria-hidden className="material-symbols-outlined text-lg">history</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Riwayat Simulasi Sidang</h2>
              <p className="font-body text-sm text-brand-muted">Catatan simulasi dari seminar proposal sampai draft skripsi final.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={simpanSimulasi}
              disabled={!bobotValid}
              title={!bobotValid ? "Bobot harus berjumlah 100%" : undefined}
              className="h-11 rounded-full bg-brand-yellow px-4 font-label text-xs font-bold uppercase text-black shadow-brutal ring-2 ring-black transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0"
            >
              <span aria-hidden className="material-symbols-outlined text-lg">save</span> Simpan Simulasi
            </button>
            <button
              type="button"
              onClick={salinHasil}
              disabled={!bobotValid}
              title={!bobotValid ? "Bobot harus berjumlah 100%" : undefined}
              className="h-11 rounded-full bg-white px-4 font-label text-xs font-bold uppercase text-black shadow-brutal ring-2 ring-black transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0"
            >
              <span aria-hidden className="material-symbols-outlined text-lg">content_copy</span> Salin Hasil
            </button>
            <button
              type="button"
              onClick={resetDefault}
              className="h-11 rounded-full bg-white px-4 font-label text-xs font-bold uppercase text-black shadow-brutal ring-2 ring-black transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined text-lg">refresh</span> Reset
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-11 items-center gap-2 rounded-full bg-brand-blue px-4 font-label text-xs font-bold uppercase text-white shadow-brutal ring-2 ring-black transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined text-lg">picture_as_pdf</span> Cetak / Simpan PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-3">
          {riwayat.length === 0 && (
            <p className="rounded-lg border-2 border-dashed border-black/30 bg-brand-paper p-4 text-center text-sm text-brand-muted md:col-span-3">
              Belum ada simulasi tersimpan. Atur nilai penilai lalu tekan “Simpan Simulasi”.
            </p>
          )}
          {riwayat.map((r) => (
            <div key={r.id} className="flex flex-col justify-between rounded-lg bg-brand-paper p-3.5 shadow-brutal-sm ring-2 ring-black">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">{r.tahap}</span>
                  <h4 className="font-display text-lg font-bold">{r.judul}</h4>
                </div>
                <span className="rounded-md bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold ring-1 ring-black">
                  {r.huruf}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between pt-3">
                <span className="font-display text-xl font-extrabold">{r.skor.toFixed(2)}</span>
                <span className="flex items-center gap-1 font-label text-xs font-bold text-brand-muted"><span aria-hidden className="material-symbols-outlined text-sm">calendar_today</span> {r.tanggal}</span>
              </div>
              <button
                type="button"
                onClick={() => setRiwayat((rs) => rs.filter((x) => x.id !== r.id))}
                className="mt-2 self-start text-xs font-bold text-brand-brick underline"
              >
                Hapus
              </button>
            </div>
          ))}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-lg bg-brand-panel p-3.5 shadow-brutal-sm ring-2 ring-black">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-label text-[11px] font-extrabold uppercase text-brand-blue">Simulasi Aktif</span>
                <h4 className="font-display text-lg font-bold">Sidang Skripsi Akhir</h4>
              </div>
              <span className="rounded-md bg-brand-blue px-2 py-0.5 font-label text-[11px] font-extrabold text-white ring-1 ring-black">
                {huruf}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between pt-3">
              <span className="font-display text-xl font-extrabold text-brand-blue">{finalScore.toFixed(2)}</span>
              <span className="flex items-center gap-1 font-label text-xs font-bold"><span aria-hidden className="material-symbols-outlined text-sm">schedule</span> Hari Ini</span>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div aria-live="polite" className="fixed bottom-24 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-2xl bg-brand-yellow px-4 py-3 font-label text-xs font-bold text-black border-[3px] border-black shadow-brutal md:bottom-6">
          <span aria-hidden className="material-symbols-outlined shrink-0 text-lg leading-none">check_circle</span>
          <span>{toast}</span>
        </div>
      )}
    </ToolShell>
  );
}
