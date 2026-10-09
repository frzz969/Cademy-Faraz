"use client";

import * as React from "react";
import Link from "next/link";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import { loadTasks, saveTasks, bySource } from "../../../components/task-store";

interface Step {
  id: string;
  label: string;
  sub: string;
}

interface Phase {
  id: string;
  no: string;
  title: string;
  desc: string;
  steps: Step[];
}

interface Revision {
  id: string;
  penguji: string;
  catatan: string;
  selesai: boolean;
}

interface Saved {
  steps: Record<string, boolean>;
  revisions: Revision[];
  revisionStart: string;
  similarity: string;
}

const KEY = "cademy:flowchart";
const REVISION_LIMIT_DAYS = 14;
const ORIGINALITY_MAX = 20;
const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const PHASES: Phase[] = [
  {
    id: "proposal",
    no: "01",
    title: "Proposal Penelitian",
    desc: "Tahap Awal & Seminar Proposal",
    steps: [
      { id: "judul", label: "Judul Skripsi Disetujui", sub: "Disahkan oleh Koordinator Skripsi Prodi" },
      { id: "bab13", label: "Penyusunan Bab 1 - 3", sub: "Latar belakang, landasan teori, metodologi riset" },
      { id: "sempro", label: "Sesi Bimbingan Proposal", sub: "8x tercatat di logbook online dosen pembimbing" },
    ],
  },
  {
    id: "sidang",
    no: "02",
    title: "Pelaksanaan Sidang",
    desc: "Sidang Meja Hijau / Pendadaran",
    steps: [
      { id: "daftar", label: "Pendaftaran Ujian Seminar", sub: "Formulir pendaftaran terverifikasi Bagian Akademik" },
      { id: "slide", label: "Slide Presentasi", sub: "Pitch deck 15 menit demonstrasi prototipe produk" },
      { id: "naskah", label: "Naskah Siap Uji (Jilid Softcover)", sub: "3 bundel didistribusikan ke dewan penguji" },
    ],
  },
  {
    id: "revisi",
    no: "03",
    title: "Revisi & Validasi",
    desc: "Pasca Sidang Akhir",
    steps: [
      { id: "matriks", label: "Matriks Perbaikan Bab 4-5", sub: "Tabel respon jawaban revisi per penguji" },
      { id: "sah", label: "Tanda Tangan Pengesahan", sub: "Persetujuan tertulis seluruh dosen penguji & pembimbing" },
      { id: "uji", label: "Notulensi Catatan Penguji", sub: "Rekap feedback dan saran perbaikan sidang" },
    ],
  },
  {
    id: "wisuda",
    no: "04",
    title: "Kelulusan & Wisuda",
    desc: "Yudisium & Ijazah Sarjana",
    steps: [
      { id: "bebas", label: "Upload Bebas Pustaka & Repositori", sub: "Unggah PDF final, source code & surat bebas pinjaman" },
      { id: "yudisium", label: "Pendaftaran Yudisium & SKL", sub: "Penetapan Surat Keterangan Lulus dari Fakultas" },
      { id: "toga", label: "Pengambilan Toga & Ijazah", sub: "Pengambilan atribut seremonial wisuda di Biro Kemahasiswaan" },
    ],
  },
];

const DEFAULT_REVISIONS: Revision[] = [
  { id: "rev-1", penguji: "Penguji 1", catatan: "Perkuat landasan teori Bab 2", selesai: false },
  { id: "rev-2", penguji: "Penguji 2", catatan: "Rapikan tata tulis & sitasi", selesai: false },
];

const inputCls =
  "h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 font-body text-sm font-medium text-brand-navy outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Saved;
    if (typeof p !== "object" || p === null) return null;
    return {
      steps: p.steps ?? {},
      revisions: Array.isArray(p.revisions) ? p.revisions : DEFAULT_REVISIONS,
      revisionStart: typeof p.revisionStart === "string" ? p.revisionStart : "",
      similarity: typeof p.similarity === "string" ? p.similarity : "",
    };
  } catch {
    return null;
  }
}

type PhaseStatus = "SELESAI" | "BERJALAN" | "MENUNGGU" | "TERKUNCI";

function phaseStatus(
  index: number,
  phase: Phase,
  steps: Record<string, boolean>,
  prevDone: boolean
): PhaseStatus {
  const done = phase.steps.filter((s) => steps[s.id]).length;
  if (done === phase.steps.length) return "SELESAI";
  if (done > 0) return "BERJALAN";
  if (index === 0 || prevDone) return "MENUNGGU";
  return "TERKUNCI";
}

const statusCls: Record<PhaseStatus, string> = {
  SELESAI: "bg-brand-blue text-white",
  BERJALAN: "bg-brand-yellow text-black",
  MENUNGGU: "bg-brand-panel text-brand-navy",
  TERKUNCI: "bg-brand-navy text-white",
};

const CTA: Array<{ href: string; icon_name: string; title: string; desc: string }> = [
  { href: "/tools/grade", icon_name: "bar_chart", title: "Kalkulator Nilai Sidang", desc: "Simulasi bobot pembimbing 40% + 2 penguji." },
  { href: "/tools/thesis-checker", icon_name: "bolt", title: "Thesis Checker", desc: "Checklist 17 item bab, struktur & bahasa." },
  { href: "/tools/ai-detector", icon_name: "smart_toy", title: "AI Detector", desc: "Uji orisinalitas sebelum pengajuan sidang." },
  { href: "/tools/study-planner", icon_name: "calendar_month", title: "Study Planner", desc: "Jadwalkan revisi (acuan umum: 14 hari) di kanban." },
];

export default function FlowchartSkripsiView() {
  const [steps, setSteps] = React.useState<Record<string, boolean>>({});
  const [revisions, setRevisions] = React.useState<Revision[]>(DEFAULT_REVISIONS);
  const [revisionStart, setRevisionStart] = React.useState("");
  const [similarity, setSimilarity] = React.useState("");
  const [revPenguji, setRevPenguji] = React.useState("");
  const [revCatatan, setRevCatatan] = React.useState("");
  const [open, setOpen] = React.useState<Record<string, boolean>>({ proposal: true });
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const all = loadTasks();
    const saved = load();
    const savedSteps = saved?.steps ?? {};
    // langkah roadmap disimpan di store bersama; step dibuat otomatis saat pertama load
    const roadmap = bySource(all, "roadmap");
    const next: Record<string, boolean> = {};
    for (const t of roadmap) if (t.roadmapStepId) next[t.roadmapStepId] = t.status === "done";
    if (roadmap.length === 0) {
      const built = all.concat(
        PHASES.flatMap((p) =>
          p.steps.map((s) => ({
            id: `roadmap:${p.id}:${s.id}`,
            source: "roadmap" as const,
            status: savedSteps[s.id] ? ("done" as const) : ("todo" as const),
            prioritas: "sedang" as const,
            title: s.label,
            description: s.sub,
            phaseId: p.id,
            roadmapStepId: s.id,
            createdAt: new Date().toISOString(),
          }))
        )
      );
      saveTasks(built);
      setSteps(savedSteps);
    } else {
      setSteps(next);
    }
    if (saved) {
      setRevisions(saved.revisions.length > 0 ? saved.revisions : DEFAULT_REVISIONS);
      setRevisionStart(saved.revisionStart);
      setSimilarity(saved.similarity);
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (ready) {
      const all = loadTasks();
      const rest = all.filter((t) => t.source !== "roadmap");
      const roadmap = PHASES.flatMap((p) =>
        p.steps.map((s) => ({
          id: `roadmap:${p.id}:${s.id}`,
          source: "roadmap" as const,
          status: steps[s.id] ? ("done" as const) : ("todo" as const),
          prioritas: "sedang" as const,
          title: s.label,
          description: s.sub,
          phaseId: p.id,
          roadmapStepId: s.id,
          createdAt: new Date().toISOString(),
        }))
      );
      saveTasks(rest.concat(roadmap));
      try {
        localStorage.setItem(KEY, JSON.stringify({ steps: {}, revisions, revisionStart, similarity }));
      } catch {
        /* abaikan */
      }
    }
  }, [steps, revisions, revisionStart, similarity, ready]);

  function toggleStep(id: string) {
    setSteps((s) => ({ ...s, [id]: !s[id] }));
  }

  const allSteps = PHASES.flatMap((p) => p.steps);
  const doneCount = allSteps.filter((s) => steps[s.id]).length;
  const pct = Math.round((doneCount / allSteps.length) * 100);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = revisionStart ? new Date(`${revisionStart}T00:00:00`) : null;
  const elapsed = startDate ? Math.floor((today.getTime() - startDate.getTime()) / 86400000) : null;
  const daysLeft = elapsed === null ? null : REVISION_LIMIT_DAYS - elapsed;

  const simN = similarity.trim() === "" ? null : Number(similarity.replace(",", "."));
  const simValid = simN !== null && !Number.isNaN(simN) && simN >= 0 && simN <= 100;
  const simTone = !simValid ? "" : simN < ORIGINALITY_MAX ? "Aman" : simN <= 40 ? "Cek Ulang" : "Revisi Mayor";
  const simDot = !simValid ? "bg-brand-muted" : simN < ORIGINALITY_MAX ? "bg-green-600" : simN <= 40 ? "bg-brand-yellow" : "bg-brand-brick";

  const revDone = revisions.filter((r) => r.selesai).length;

  // Status per fase + fase sebelumnya tuntas (untuk MENUNGGU/TERKUNCI).
  let prevAllDone = true;
  const statuses = PHASES.map((p, i) => {
    const st = phaseStatus(i, p, steps, prevAllDone);
    prevAllDone = prevAllDone && p.steps.every((s) => steps[s.id]);
    return st;
  });
  const phaseIdx = Math.min(4, Math.max(1, statuses.filter((s) => s === "SELESAI").length + 1));

  function addRevision() {
    if (!revCatatan.trim()) return;
    setRevisions((rs) => [
      ...rs,
      { id: uid(), penguji: revPenguji.trim() || "Penguji", catatan: revCatatan.trim(), selesai: false },
    ]);
    setRevPenguji("");
    setRevCatatan("");
  }

  function reset() {
    setSteps({});
    setRevisions(DEFAULT_REVISIONS);
    setRevisionStart("");
    setSimilarity("");
  }

  function salinRekap() {
    const teks = [
      "Rekap Roadmap Skripsi Cademy",
      `Progres: ${doneCount}/${allSteps.length} langkah (${pct}%)`,
      ...PHASES.map((p, i) => {
        const items = p.steps.map((s) => `  ${steps[s.id] ? "[x]" : "[ ]"} ${s.label}`).join("\n");
        return `Langkah ${p.no} ${p.title} — ${statuses[i]}\n${items}`;
      }),
      `Revisi: ${revDone}/${revisions.length} selesai${daysLeft !== null ? `, sisa ${daysLeft} hari` : ""}`,
      simValid ? `Kemiripan: ${simN}% (${simTone})` : "Kemiripan: belum diisi",
    ].join("\n\n");
    try {
      void navigator.clipboard.writeText(teks);
    } catch {
      /* abaikan */
    }
  }

  return (
    <ToolShell
      eyebrow="Hub / Alat"
      title="Roadmap Skripsi"
      description="Panduan 4 fase dari proposal hingga wisuda: checklist langkah, matriks revisi 14 hari (acuan umum), dan ambang orisinalitas (acuan umum — cek pedoman kampusmu). Tersimpan di browser."
      icon="map"
      badge="4 Fase"
      badgeTone="info"
    >
      {/* Hero progres ala Stitch */}
      <div className="mb-5 rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-brand-yellow px-3 py-1 font-label text-[11px] font-extrabold uppercase text-black shadow-brutal-sm">
            <span aria-hidden>🚩</span> Roadmap Skripsi
          </span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Progres Menuju Kelulusan
        </h2>
        <p className="mt-1 font-display text-4xl font-extrabold text-brand-blue">{pct}%</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 rounded-xl border-[3px] border-black bg-brand-panel p-3 shadow-brutal-sm">
            <span aria-hidden className="text-xl"><span className="material-symbols-outlined">check_circle</span></span>
            <div>
              <p className="font-label text-[11px] font-extrabold uppercase">Checklist Tugas</p>
              <p className="text-sm font-bold">{doneCount} / {allSteps.length} Selesai</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border-[3px] border-black bg-brand-panel p-3 shadow-brutal-sm">
            <span aria-hidden className="text-xl"><span className="material-symbols-outlined">event</span></span>
            <div>
              <p className="font-label text-[11px] font-extrabold uppercase">Target Sidang</p>
              <p className="text-sm font-bold">Akhir Semester</p>
            </div>
          </div>
        </div>
        {/* Ringkas fase — komposisi desktop */}
        <div className="mt-3 hidden grid-cols-4 gap-2 lg:grid">
          {PHASES.map((p, i) => (
            <div key={p.id} className="rounded-xl border-2 border-black bg-brand-paper px-2 py-1.5 text-center shadow-brutal-sm">
              <p className="font-label text-[10px] font-extrabold uppercase">Fase {p.no}</p>
              <p className={`font-label text-[11px] font-extrabold uppercase ${statuses[i] === "SELESAI" ? "text-brand-blue" : statuses[i] === "TERKUNCI" ? "text-brand-muted" : "text-black"}`}>
                {statuses[i]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tahapan alur */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-xl font-bold">Tahapan Alur Skripsi</h2>
        <span className="rounded-full border-[3px] border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold shadow-brutal-sm">
          {phaseIdx}/4 • {pct}%
        </span>
      </div>

      <div className="mt-3 flex flex-col">
        {PHASES.map((phase, i) => {
          const st = statuses[i];
          const n = phase.steps.filter((s) => steps[s.id]).length;
          const isOpen = !!open[phase.id];
          const locked = st === "TERKUNCI";
          return (
            <div key={phase.id} className="flex flex-col">
              <section className={`rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal sm:p-5 ${locked ? "opacity-90" : ""}`}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [phase.id]: !o[phase.id] }))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-black bg-brand-blue font-display text-sm font-extrabold text-white shadow-brutal-sm">
                      {phase.no}
                    </span>
                    <span>
                      <span className="block font-label text-[11px] font-extrabold uppercase tracking-wider text-brand-muted">
                        Langkah {phase.no} • {st === "SELESAI" ? "Tuntas" : st === "BERJALAN" ? "Sedang Dikerjakan" : st === "MENUNGGU" ? "Menunggu" : "Terkunci"}
                      </span>
                      <span className="block font-display text-lg font-bold leading-tight">{phase.title}</span>
                      <span className="block text-xs text-brand-muted">{phase.desc}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full border-2 border-black px-2 py-0.5 font-label text-[11px] font-extrabold uppercase ${statusCls[st]}`}>
                      {st}
                    </span>
                    <span aria-hidden className={`text-xl transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-3 border-t-2 border-dashed border-black/20 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">
                        Kelengkapan Dokumen
                      </span>
                      <span className="font-label text-[11px] font-extrabold">
                        {n}/{phase.steps.length} • {Math.round((n / phase.steps.length) * 100)}%
                      </span>
                    </div>
                    <div className="mb-3 h-3 overflow-hidden rounded-full border-2 border-black bg-brand-paper">
                      <div className="h-full bg-brand-blue transition-all" style={{ width: `${(n / phase.steps.length) * 100}%` }} />
                    </div>
                    <div className="space-y-2">
                      {phase.steps.map((s) => (
                        <label
                          key={s.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-xl border-2 p-3 text-sm ${
                            steps[s.id] ? "border-black/20 bg-brand-paper opacity-80" : "border-black/20 bg-white hover:border-black"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!steps[s.id]}
                            onChange={() => toggleStep(s.id)}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-black"
                            aria-label={s.label}
                          />
                          <span className="min-w-0">
                            <span className={`block font-bold ${steps[s.id] ? "line-through" : ""}`}>{s.label}</span>
                            <span className="block text-xs text-brand-muted">{s.sub}</span>
                          </span>
                          {steps[s.id] && <span aria-hidden className="ml-auto font-black text-brand-blue"><span className="material-symbols-outlined">check</span></span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>
              {i < PHASES.length - 1 && (
                <p aria-hidden className="py-1 text-center text-2xl text-brand-navy">↓</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Motivasi + rekap */}
      <Panel className="mt-5 bg-white">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-brand-yellow text-xl shadow-brutal-sm"><span className="material-symbols-outlined">school</span></span>
          <div>
            <h2 className="font-display text-lg font-bold">Tetap Semangat!</h2>
            <p className="text-sm text-brand-muted">
              Setiap centang membawamu lebih dekat ke toga kelulusan. Progres tinggal {100 - pct}% — {doneCount}/{allSteps.length} langkah tuntas.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={salinRekap}>Salin rekap</Button>
          <Button size="sm" variant="secondary" onClick={reset}>Reset</Button>
        </div>
      </Panel>

      <Panel className="mt-5 bg-white">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold">Matriks Revisi Penguji — Fase 03</h2>
            <p className="text-xs text-brand-muted">Catat setiap perbaikan, selesaikan satu per satu. {revDone}/{revisions.length} selesai.</p>
          </div>
          <span className={`w-fit rounded-full border-2 border-black px-2.5 py-1 font-label text-[11px] font-extrabold ${daysLeft !== null && daysLeft < 0 ? "bg-brand-brick text-white" : daysLeft !== null && daysLeft <= 3 ? "bg-brand-yellow text-black" : "bg-brand-panel text-brand-navy"}`}>
            {daysLeft === null ? "Batas: 14 hari, acuan umum (atur tanggal mulai)" : daysLeft < 0 ? `Terlambat ${Math.abs(daysLeft)} hari!` : daysLeft === 0 ? "Hari terakhir hari ini!" : `Sisa ${daysLeft} dari 14 hari (acuan umum)`}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <label className="block space-y-1">
            <span className="font-label text-xs font-bold uppercase">Tanggal mulai revisi</span>
            <input type="date" value={revisionStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevisionStart(e.target.value)} className={inputCls} />
          </label>
          <div className="block space-y-1">
            <span className="font-label text-xs font-bold uppercase">Kemiripan naskah (%) — ambang aman &lt;20% (acuan umum — cek pedoman kampusmu)</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                inputMode="decimal"
                value={similarity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSimilarity(e.target.value)}
                placeholder="cth: 17"
                className={inputCls}
                aria-label="Persentase kemiripan naskah"
              />
              {similarity.trim() !== "" && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-black bg-white px-2.5 py-1 font-label text-[11px] font-extrabold">
                  <span className={`h-2.5 w-2.5 rounded-full ${simDot}`} />
                  {simValid ? simTone : "0–100"}
                </span>
              )}
            </span>
            {similarity.trim() !== "" && !simValid && (
              <p className="text-xs font-bold text-brand-brick"><span className="material-symbols-outlined">warning</span>️ Isi 0–100.</p>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {revisions.map((r) => (
            <div key={r.id} className={`flex items-start gap-2 rounded-xl border-[3px] p-3 ${r.selesai ? "border-black/20 bg-brand-paper opacity-70" : "border-black bg-white shadow-brutal-sm"}`}>
              <input
                type="checkbox"
                checked={r.selesai}
                onChange={() => setRevisions((rs) => rs.map((x) => (x.id === r.id ? { ...x, selesai: !x.selesai } : x)))}
                className="mt-0.5 h-5 w-5 shrink-0 accent-black"
                aria-label="Tandai revisi selesai"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${r.selesai ? "line-through" : ""}`}>{r.catatan}</p>
                <p className="text-xs text-brand-muted">{r.penguji}</p>
              </div>
              <button
                type="button"
                onClick={() => setRevisions((rs) => rs.filter((x) => x.id !== r.id))}
                className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold"
                aria-label="Hapus revisi"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={revPenguji} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevPenguji(e.target.value)} placeholder="Penguji (cth: Penguji 1)" className={inputCls} aria-label="Nama penguji" />
          <input value={revCatatan} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevCatatan(e.target.value)} placeholder="Catatan revisi…" className={`${inputCls} sm:col-span-2`} aria-label="Catatan revisi" />
        </div>
        <Button size="sm" variant="accent" className="mt-2" onClick={addRevision}>+ Tambah revisi</Button>
      </Panel>

      <div className="mt-5">
        <h2 className="mb-2 font-display text-lg font-bold">Lanjut ke tools terkait</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CTA.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span className="material-symbols-outlined text-2xl">{c.icon_name}</span>
              <p className="mt-1 font-display text-base font-bold">{c.title}</p>
              <p className="text-xs text-brand-muted">{c.desc}</p>
              <p className="mt-2 font-label text-xs font-bold text-brand-blue">Buka →</p>
            </Link>
          ))}
        </div>
      </div>
    </ToolShell>
  );
}
