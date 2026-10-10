"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import {
  butuhIpTarget,
  ipkKumulatif,
  ipSemester as ipSemesterMurni,
  parseDesimal,
  predikatIpk,
} from "@cademy/utils";

const SCALES: Record<string, Record<string, number>> = {
  "Umum / UNAS": {
    A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, D: 1.0, E: 0,
  },
  UNY: {
    A: 4.0, "A-": 3.67, "B+": 3.33, B: 3.0, "B-": 2.67, "C+": 2.33, C: 2.0, D: 1.0, E: 0,
  },
};

interface Row { id: string; nama: string; sks: string; nilai: string; }

const uid = () => Math.random().toString(36).slice(2, 9);
const inputCls = "h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 font-body text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

const KEY = "cademy:gpa-v1";

function defaultRows(): Row[] {
  return [
    { id: uid(), nama: "Matkul 1", sks: "3", nilai: "A" },
    { id: uid(), nama: "Matkul 2", sks: "2", nilai: "B+" },
  ];
}

function sanitizeLoaded(v: unknown): {
  rows: Row[];
  skala: string;
  sksLalu: string;
  ipkLalu: string;
  target: string;
  sisaSks: string;
} | null {
  try {
    if (typeof v !== "object" || v === null) return null;
    const o = v as Record<string, unknown>;
    const skalaRaw = typeof o["skala"] === "string" ? (o["skala"] as string) : "Umum / UNAS";
    const skala = Object.keys(SCALES).includes(skalaRaw) ? skalaRaw : "Umum / UNAS";
    const grades = Object.keys(SCALES[skala]);
    if (!Array.isArray(o["rows"])) return null;
    const rows: Row[] = [];
    for (const r of (o["rows"] as unknown[]).slice(0, 50)) {
      if (typeof r !== "object" || r === null) continue;
      const ro = r as Record<string, unknown>;
      const nama = typeof ro["nama"] === "string" ? (ro["nama"] as string).slice(0, 120) : "";
      const sks = typeof ro["sks"] === "string" ? (ro["sks"] as string).slice(0, 10) : "3";
      const nilaiRaw = typeof ro["nilai"] === "string" ? (ro["nilai"] as string) : "B";
      const nilai = grades.includes(nilaiRaw) ? nilaiRaw : "B";
      const id =
        typeof ro["id"] === "string" && (ro["id"] as string)
          ? (ro["id"] as string).slice(0, 40)
          : uid();
      rows.push({ id, nama, sks, nilai });
    }
    if (rows.length === 0) return null;
    const str = (x: unknown, fb: string) =>
      typeof x === "string" ? (x as string).slice(0, 20) : fb;
    return {
      rows,
      skala,
      sksLalu: str(o["sksLalu"], "0"),
      ipkLalu: str(o["ipkLalu"], "0"),
      target: str(o["target"], "3.50"),
      sisaSks: str(o["sisaSks"], "20"),
    };
  } catch {
    return null;
  }
}

function loadGpa(): ReturnType<typeof sanitizeLoaded> {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return sanitizeLoaded(JSON.parse(raw));
  } catch {
    return null;
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

export default function GpaPage() {
  const [skala, setSkala] = React.useState("Umum / UNAS");
  const POINTS = SCALES[skala];
  const GRADES = Object.keys(POINTS);
  const [rows, setRows] = React.useState<Row[]>([
    { id: uid(), nama: "Matkul 1", sks: "3", nilai: "A" },
    { id: uid(), nama: "Matkul 2", sks: "2", nilai: "B+" },
  ]);
  const [sksLalu, setSksLalu] = React.useState("0");
  const [ipkLalu, setIpkLalu] = React.useState("0");
  const [target, setTarget] = React.useState("3.50");
  const [sisaSks, setSisaSks] = React.useState("20");
  const [toast, setToast] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const toastTimer = React.useRef<number | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  React.useEffect(() => {
    const saved = loadGpa();
    if (saved) {
      setRows(saved.rows);
      setSkala(saved.skala);
      setSksLalu(saved.sksLalu);
      setIpkLalu(saved.ipkLalu);
      setTarget(saved.target);
      setSisaSks(saved.sisaSks);
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ rows, skala, sksLalu, ipkLalu, target, sisaSks })
      );
    } catch {
      showToast("Penyimpanan penuh — hapus sebagian data atau tekan Reset.");
    }
  }, [rows, skala, sksLalu, ipkLalu, target, sisaSks, ready, showToast]);

  // SKS per-baris: disiplin sama seperti field lain — parseDesimal, null → error
  // validasi (bukan Number||0 diam-diam). Total memakai ?? 0 agar tetap hitung.
  const sksParsed = rows.map((r) => parseDesimal(r.sks));
  const totalSks = rows.reduce((a, r, i) => a + (sksParsed[i] ?? 0), 0);
  const totalBobot = rows.reduce((a, r, i) => a + (sksParsed[i] ?? 0) * (POINTS[r.nilai] ?? 0), 0);
  const ipSemester = ipSemesterMurni(
    rows.map((r, i) => ({ sks: sksParsed[i] ?? 0, poin: POINTS[r.nilai] ?? 0 }))
  );

  // parseDesimal: koma ("3,5") diterima di SEMUA field; input tak-angka → null
  // (ditolak eksplisit via error validasi, bukan diam-diam jadi 0).
  const sksLaluN = parseDesimal(sksLalu) ?? 0;
  const ipkLaluN = parseDesimal(ipkLalu) ?? 0;
  const ipk = ipkKumulatif(sksLaluN, ipkLaluN, totalSks, totalBobot, ipSemester);
  const predikat = predikatIpk(ipk);

  const targetN = parseDesimal(target) ?? 0;
  const sisaN = parseDesimal(sisaSks) ?? 0;
  const butuh = butuhIpTarget(
    targetN,
    sksLaluN + totalSks,
    sksLaluN * ipkLaluN + totalBobot,
    sisaN
  );

  function upd(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function reset() {
    if (!window.confirm("Reset semua input GPA ke awal? Data yang diisi akan hilang.")) return;
    setRows(defaultRows());
    setSkala("Umum / UNAS");
    setSksLalu("0");
    setIpkLalu("0");
    setTarget("3.50");
    setSisaSks("20");
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* abaikan */
    }
  }

  async function salinHasil() {
    const teks = `Hasil IPK Cademy\nIP Semester: ${ipSemester.toFixed(2)} (${totalSks} SKS)\nIPK Kumulatif: ${ipk.toFixed(2)} (${predikat})\n${rows.map((r) => `- ${r.nama || "(tanpa nama)"}: ${r.sks} SKS, nilai ${r.nilai}`).join("\n")}`;
    const ok = await copyTextWithFallback(teks);
    showToast(ok ? "Hasil disalin ke clipboard!" : "Gagal menyalin — browser memblokir clipboard.");
  }

  const sksErrors = rows.map((r, i) => {
    const n = sksParsed[i];
    if (n === null || !Number.isFinite(n)) return "SKS harus berupa angka.";
    if (n < 0 || n > 12) return "SKS 0–12 per matkul.";
    return "";
  });
  const namaErrors = rows.map((r) => (!r.nama.trim() ? "Isi nama matkul." : ""));
  const ipkLaluParsed = parseDesimal(ipkLalu);
  const sksLaluParsed = parseDesimal(sksLalu);
  const targetParsed = parseDesimal(target);
  const ipkLaluError = ipkLalu.trim() !== "" && (ipkLaluParsed === null || ipkLaluParsed < 0 || ipkLaluParsed > 4)
    ? "IPK lalu harus 0–4."
    : sksLalu.trim() !== "" && (sksLaluParsed === null || sksLaluParsed < 0)
      ? "SKS lalu tidak boleh negatif."
      : "";
  const targetError = target.trim() !== "" && (targetParsed === null || targetParsed < 0 || targetParsed > 4)
    ? "Target IPK harus 0–4."
    : "";
  const hasError = sksErrors.some(Boolean) || namaErrors.some(Boolean) || ipkLaluError !== "" || targetError !== "";

  return (
    <ToolShell eyebrow="Hub / Alat" title="GPA Calculator" description="Hitung IP semester, IPK kumulatif, dan simulasi target Cumlaude. Semua di browser." icon="calculate" badge="Semester & Target" badgeTone="info">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel className="space-y-3 bg-white lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Mata kuliah semester ini</h2>
            <Button size="sm" variant="accent" onClick={() => setRows((r) => [...r, { id: uid(), nama: `Matkul ${r.length + 1}`, sks: "3", nilai: "B" }])}>+ Tambah</Button>
          </div>
          <p className="text-xs text-brand-muted">Maks 12 SKS per matkul. Nilai A–E mengikuti skala 4,0.</p>
          <label className="block space-y-1"><span className="font-label text-xs font-bold uppercase">Skala nilai</span><select className={inputCls} value={skala} onChange={(e) => setSkala(e.target.value)} aria-label="Skala nilai">{Object.keys(SCALES).map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.id}>
                <div className="grid grid-cols-12 items-center gap-2 rounded-xl border-2 border-black/15 bg-brand-paper p-2">
                  <input className={`${inputCls} col-span-5`} value={r.nama} onChange={(e) => upd(r.id, { nama: e.target.value })} aria-label="Nama matkul" />
                  <input className={`${inputCls} col-span-2 text-center`} inputMode="decimal" value={r.sks} onChange={(e) => upd(r.id, { sks: e.target.value })} aria-label="SKS" />
                  <select className={`${inputCls} col-span-3`} value={r.nilai} onChange={(e) => upd(r.id, { nilai: e.target.value })} aria-label="Nilai">
                    {GRADES.map((g) => <option key={g} value={g}>{g} ({POINTS[g].toFixed(1)})</option>)}
                  </select>
                  <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="col-span-2 flex items-center justify-center rounded-xl border-[3px] border-black bg-white px-2 py-2 font-bold shadow-brutal-sm hover:bg-red-50" aria-label={`Hapus ${r.nama || "matkul"}`}><span aria-hidden className="material-symbols-outlined text-[20px]">close</span></button>
                </div>
                {(sksErrors[i] || namaErrors[i]) && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-brick"><span aria-hidden className="material-symbols-outlined text-[16px]">warning</span> {namaErrors[i] || sksErrors[i]}</p>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1"><span className="font-label text-xs font-bold uppercase">Total SKS lulus lalu</span><input className={inputCls} inputMode="numeric" value={sksLalu} onChange={(e) => setSksLalu(e.target.value)} /></label>
            <label className="block space-y-1"><span className="font-label text-xs font-bold uppercase">IPK lalu (0–4)</span><input className={inputCls} inputMode="decimal" value={ipkLalu} onChange={(e) => setIpkLalu(e.target.value)} /></label>
          </div>
          {ipkLaluError && <p className="flex items-center gap-1 text-xs font-bold text-brand-brick"><span aria-hidden className="material-symbols-outlined text-[16px]">warning</span> {ipkLaluError}</p>}
          {targetError && <p className="flex items-center gap-1 text-xs font-bold text-brand-brick"><span aria-hidden className="material-symbols-outlined text-[16px]">warning</span> {targetError}</p>}
          {hasError && <p className="text-xs font-semibold text-brand-muted">Perbaiki input bertanda peringatan agar hasil akurat.</p>}
        </Panel>

        <div className="space-y-3 lg:col-span-2">
          <Panel className="bg-brand-yellow text-center">
            <p className="font-label text-xs font-bold uppercase">IP Semester</p>
            <p className="font-display text-4xl font-extrabold">{ipSemester.toFixed(2)}</p>
            <p className="text-xs font-semibold">{totalSks} SKS • {predikat}</p>
          </Panel>
          <Panel>
            <p className="font-label text-xs font-bold uppercase">IPK Kumulatif</p>
            <p className="font-display text-3xl font-extrabold">{ipk.toFixed(2)}</p>
            <p className="text-xs text-brand-muted">Skala & predikat mengikuti acuan umum; cumlaude juga mensyaratkan masa studi & aturan kampusmu.</p>
            <div className="mt-3 space-y-2 border-t-2 border-dashed border-black/20 pt-3">
              <p className="font-label text-xs font-bold uppercase">Simulasi target IPK</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1"><span className="text-xs font-bold">Target</span><input className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} /></label>
                <label className="block space-y-1"><span className="text-xs font-bold">Sisa SKS</span><input className={inputCls} value={sisaSks} onChange={(e) => setSisaSks(e.target.value)} /></label>
              </div>
              <p className="rounded-xl bg-brand-paper p-2 text-sm font-semibold">
                {sisaN <= 0 ? "Isi sisa SKS untuk simulasi." : butuh > 4 ? <span className="flex items-center gap-1"><span aria-hidden className="material-symbols-outlined text-[16px] text-brand-brick">warning</span> {`Butuh IP ${butuh.toFixed(2)} — di atas 4.0, target sulit tercapai.`}</span> : butuh < 0 ? <span className="flex items-center gap-1"><span aria-hidden className="material-symbols-outlined text-[16px] text-green-700">check_circle</span> Target sudah tercapai.</span> : <>Butuh rata-rata <b>{butuh.toFixed(2)}</b> di {sisaN} SKS tersisa.</>}
              </p>
              <span className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={salinHasil}>Salin hasil</Button>
                <Button size="sm" variant="secondary" onClick={reset}>Reset</Button>
              </span>
            </div>
          </Panel>
        </div>
      </div>
      {toast && (
        <div aria-live="polite" className="fixed bottom-24 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-2xl border-[3px] border-black bg-brand-navy px-4 py-3 font-body text-sm text-white shadow-brutal md:bottom-6">
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-yellow">check_circle</span>
          <span>{toast}</span>
        </div>
      )}
    </ToolShell>
  );
}
