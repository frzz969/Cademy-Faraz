"use client";

import * as React from "react";
import Link from "next/link";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import {
  loadTasks,
  saveTasks,
  bySource,
  type SharedTask,
  type SubTask,
} from "../../../components/task-store";

export interface Step {
  id: string;
  label: string;
  sub: string;
  /** deadline opsional (ISO atau teks bebas) — diketik pengguna sendiri */
  dueDate?: string;
  /** catatan opsional milik pengguna */
  notes?: string;
  /** subtugas opsional untuk progres bertingkat */
  subtasks?: SubTask[];
}

export interface Phase {
  id: string;
  no: string;
  title: string;
  desc: string;
  steps: Step[];
}

interface Revision {
  id: string;
  judul: string;
  detail: string;
  penguji: string;
  /** tanggal mulai (ISO) opsional */
  mulai: string;
  /** deadline (ISO) opsional; acuan 14 hari hanya saran, bukan aturan */
  deadline: string;
  status: "belum" | "proses" | "selesai";
}

interface Saved {
  phases: Phase[];
  revisions: Revision[];
  similarity: string;
}

const KEY = "cademy:flowchart";
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
  {
    id: "rev-1",
    judul: "Perkuat landasan teori Bab 2",
    detail: "",
    penguji: "Penguji 1",
    mulai: "",
    deadline: "",
    status: "belum",
  },
  {
    id: "rev-2",
    judul: "Rapikan tata tulis & sitasi",
    detail: "",
    penguji: "Penguji 2",
    mulai: "",
    deadline: "",
    status: "belum",
  },
];

/**
 * Opsi A — flowchart satu-satunya penulis source:roadmap (murni, testable).
 * TIDAK rebuild memaksa status todo/sedang: status/dueDate/prioritas yang
 * datang dari slice dipertahankan. Toggle langkah hanya membalik done/todo
 * (doing yang sah tetap doing; createdAt stabil).
 */
export function susunRoadmap(
  phases: Phase[],
  steps: Record<string, boolean>,
  prevList: SharedTask[]
): SharedTask[] {
  const prev = new Map(
    prevList.filter((t) => t.source === "roadmap").map((t) => [t.id, t])
  );
  return phases.flatMap((p) =>
    p.steps.map((s) => {
      const id = `roadmap:${p.id}:${s.id}`;
      const lama = prev.get(id);
      return {
        id,
        source: "roadmap" as const,
        status: steps[s.id]
          ? ("done" as const)
          : lama?.status === "doing"
            ? ("doing" as const)
            : ("todo" as const),
        prioritas: lama?.prioritas ?? ("sedang" as const),
        title: s.label,
        description: s.sub,
        phaseId: p.id,
        roadmapStepId: s.id,
        ...(lama?.dueDate ? { dueDate: lama.dueDate } : {}),
        // Field tambahan milik pengguna dipetakan dari definisi fase yang
        // di-customisasi (bukan dibuang saat susun ulang).
        ...(s.dueDate ? { dueDate: s.dueDate } : {}),
        ...(s.notes ? { notes: s.notes } : {}),
        ...(lama?.notes ? { notes: lama.notes } : {}),
        ...(s.subtasks && s.subtasks.length > 0
          ? { subtasks: s.subtasks }
          : {}),
        ...(lama?.subtasks && lama.subtasks.length > 0
          ? { subtasks: lama.subtasks }
          : {}),
        createdAt: lama?.createdAt ?? new Date().toISOString(),
        ...(lama?.completedAt ? { completedAt: lama.completedAt } : {}),
      };
    })
  );
}

const inputCls =
  "h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 font-body text-sm font-medium text-brand-navy outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Saved & { revisionStart?: string };
    if (typeof p !== "object" || p === null) return null;
    // Migrasi bentuk lama: {steps, revisions[{catatan,selesai}]} → bentuk baru.
    const revisiMentah = Array.isArray(p.revisions) ? p.revisions : [];
    const revisiBaru: Revision[] = revisiMentah.map((r) => {
      const lama = r as unknown as { catatan?: string; selesai?: boolean };
      return {
        id: r.id,
        judul: lama.catatan ?? r.judul ?? "Catatan revisi",
        detail: r.detail ?? "",
        penguji: r.penguji ?? "Penguji",
        mulai: r.mulai ?? "",
        deadline: r.deadline ?? "",
        status:
          r.status ??
          (lama.selesai === true ? ("selesai" as const) : ("belum" as const)),
      };
    });
    return {
      phases: Array.isArray(p.phases) && p.phases.length > 0 ? p.phases : PHASES,
      revisions: revisiBaru.length > 0 ? revisiBaru : DEFAULT_REVISIONS,
      similarity: typeof p.similarity === "string" ? p.similarity : "",
    };
  } catch {
    return null;
  }
}

type PhaseStatus = "SELESAI" | "BERJALAN" | "MENUNGGU";

const statusCls: Record<PhaseStatus, string> = {
  SELESAI: "bg-brand-blue text-white",
  BERJALAN: "bg-brand-yellow text-black",
  MENUNGGU: "bg-brand-panel text-brand-navy",
};

const CTA: Array<{ href: string; icon_name: string; title: string; desc: string }> = [
  { href: "/tools/grade", icon_name: "bar_chart", title: "Kalkulator Nilai Sidang", desc: "Simulasi bobot pembimbing 40% + 2 penguji." },
  { href: "/tools/thesis-checker", icon_name: "bolt", title: "Thesis Checker", desc: "Checklist 17 item bab, struktur & bahasa." },
  { href: "/tools/ai-detector", icon_name: "smart_toy", title: "AI Detector", desc: "Uji orisinalitas sebelum pengajuan sidang." },
  { href: "/tools/study-planner", icon_name: "calendar_month", title: "Study Planner", desc: "Jadwalkan revisi (acuan umum: 14 hari) di kanban." },
];

export default function FlowchartSkripsiView() {
  const [phases, setPhases] = React.useState<Phase[]>(PHASES);
  const [steps, setSteps] = React.useState<Record<string, boolean>>({});
  const [revisions, setRevisions] = React.useState<Revision[]>(DEFAULT_REVISIONS);
  const [similarity, setSimilarity] = React.useState("");
  const [open, setOpen] = React.useState<Record<string, boolean>>({ proposal: true });
  const [ready, setReady] = React.useState(false);
  const [tambahFase, setTambahFase] = React.useState(false);
  const [faseJudul, setFaseJudul] = React.useState("");
  const [faseDesc, setFaseDesc] = React.useState("");
  const [konfirmasiHapusFase, setKonfirmasiHapusFase] = React.useState<string | null>(null);
  const [editFase, setEditFase] = React.useState<string | null>(null);
  const [draftFaseJudul, setDraftFaseJudul] = React.useState("");
  const [draftFaseDesc, setDraftFaseDesc] = React.useState("");

  // Form revisi baru
  const [revJudul, setRevJudul] = React.useState("");
  const [revDetail, setRevDetail] = React.useState("");
  const [revPenguji, setRevPenguji] = React.useState("");
  const [revMulai, setRevMulai] = React.useState("");
  const [revDeadline, setRevDeadline] = React.useState("");
  const [catatanFase, setCatatanFase] = React.useState<Record<string, string>>({});
  const [stepBaru, setStepBaru] = React.useState<Record<string, { label: string; sub: string; deadline: string }>>({});

  React.useEffect(() => {
    const all = loadTasks();
    const saved = load();
    // Fase boleh dikustomisasi — template bawaan hanya awal.
    const faseAwal = saved && saved.phases.length > 0 ? saved.phases : PHASES;
    setPhases(faseAwal);
    const roadmap = bySource(all, "roadmap");
    const next: Record<string, boolean> = {};
    for (const t of roadmap) if (t.roadmapStepId) next[t.roadmapStepId] = t.status === "done";
    if (roadmap.length === 0) {
      saveTasks(all.concat(susunRoadmap(faseAwal, {}, all)));
    }
    setSteps(next);
    if (saved) {
      setRevisions(saved.revisions.length > 0 ? saved.revisions : DEFAULT_REVISIONS);
      setSimilarity(saved.similarity);
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (ready) {
      const all = loadTasks();
      const rest = all.filter((t) => t.source !== "roadmap");
      saveTasks(rest.concat(susunRoadmap(phases, steps, all)));
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({ phases, revisions, similarity } satisfies Saved)
        );
      } catch {
        /* abaikan */
      }
    }
  }, [phases, steps, revisions, similarity, ready]);

  function toggleStep(id: string) {
    setSteps((s) => ({ ...s, [id]: !s[id] }));
  }

  // ── Kelola fase: tambah, ubah, hapus, pindah urutan ────────────────────
  function tambahFaseBaru() {
    const judul = faseJudul.trim();
    if (!judul) return;
    const no = String(phases.length + 1).padStart(2, "0");
    const id = `fase-${uid()}`;
    setPhases((ps) => [...ps, { id, no, title: judul, desc: faseDesc.trim() || "Fase kustom", steps: [] }]);
    setFaseJudul("");
    setFaseDesc("");
    setTambahFase(false);
  }

  function ubahFase(id: string, patch: Partial<Phase>) {
    setPhases((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function geserFase(id: string, arah: -1 | 1) {
    setPhases((ps) => {
      const i = ps.findIndex((p) => p.id === id);
      const j = i + arah;
      if (i < 0 || j < 0 || j >= ps.length) return ps;
      const salinan = [...ps];
      [salinan[i], salinan[j]] = [salinan[j], salinan[i]];
      return salinan.map((p, idx) => ({ ...p, no: String(idx + 1).padStart(2, "0") }));
    });
  }

  function hapusFase(id: string) {
    setKonfirmasiHapusFase(id);
  }

  function yakinHapusFase(id: string) {
    setPhases((ps) => ps.filter((p) => p.id !== id));
    setKonfirmasiHapusFase(null);
    // Langkah teori yang terkait fase itu tetap tercatat: dipindah ke
    // penanda selesai agar progres pengguna tidak hilang diam-diam.
    setSteps((s) => {
      const salinan = { ...s };
      for (const k of Object.keys(salinan)) if (k.startsWith(`${id}:`)) delete salinan[k];
      return salinan;
    });
  }

  // ── Kelola langkah/tugas dalam fase ────────────────────────────────────
  function tambahStep(phaseId: string) {
    const form = stepBaru[phaseId];
    const label = form?.label.trim() ?? "";
    if (!label) return;
    const sub = form?.sub.trim() ?? "";
    const stepId = `langkah-${uid()}`;
    setPhases((ps) =>
      ps.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              steps: [
                ...p.steps,
                { id: stepId, label, sub: sub || "Tanpa keterangan" },
              ],
            }
          : p
      )
    );
    setStepBaru((f) => ({ ...f, [phaseId]: { label: "", sub: "", deadline: "" } }));
  }

  function ubahStep(phaseId: string, stepId: string, patch: Partial<Step>) {
    setPhases((ps) =>
      ps.map((p) =>
        p.id === phaseId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }
          : p
      )
    );
  }

  function hapusStep(phaseId: string, stepId: string) {
    setPhases((ps) =>
      ps.map((p) =>
        p.id === phaseId ? { ...p, steps: p.steps.filter((s) => s.id !== stepId) } : p
      )
    );
    setSteps((s) => {
      const salinan = { ...s };
      delete salinan[stepId];
      return salinan;
    });
  }

  const allSteps = phases.flatMap((p) => p.steps);
  const doneCount = allSteps.filter((s) => steps[s.id]).length;
  const pct = allSteps.length === 0 ? 0 : Math.round((doneCount / allSteps.length) * 100);

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);

  const simN = similarity.trim() === "" ? null : Number(similarity.replace(",", "."));
  const simValid = simN !== null && !Number.isNaN(simN) && simN >= 0 && simN <= 100;
  const simTone = !simValid ? "" : simN < ORIGINALITY_MAX ? "Aman" : simN <= 40 ? "Cek Ulang" : "Revisi Mayor";
  const simDot = !simValid ? "bg-brand-muted" : simN < ORIGINALITY_MAX ? "bg-green-600" : simN <= 40 ? "bg-brand-yellow" : "bg-brand-brick";

  const revDone = revisions.filter((r) => r.status === "selesai").length;

  // Status fase: SELESAI / BERJALAN / MENUNGGU — tidak ada lagi TERKUNCI.
  const statuses: PhaseStatus[] = phases.map((p) => {
    const done = p.steps.filter((s) => steps[s.id]).length;
    if (p.steps.length > 0 && done === p.steps.length) return "SELESAI";
    if (done > 0) return "BERJALAN";
    return "MENUNGGU";
  });

  function tambahRevisi() {
    if (!revJudul.trim() && !revDetail.trim()) return;
    setRevisions((rs) => [
      ...rs,
      {
        id: `rev-${uid()}`,
        judul: revJudul.trim() || "Catatan revisi",
        detail: revDetail.trim(),
        penguji: revPenguji.trim() || "Penguji",
        mulai: revMulai.trim(),
        deadline: revDeadline.trim(),
        status: "belum",
      },
    ]);
    setRevJudul("");
    setRevDetail("");
    setRevPenguji("");
    setRevMulai("");
    setRevDeadline("");
  }

  function reset() {
    setSteps({});
    setPhases(PHASES);
    setRevisions(DEFAULT_REVISIONS);
    setSimilarity("");
    setCatatanFase({});
  }

  function salinRekap() {
    const teks = [
      "Rekap Roadmap Skripsi Cademy",
      `Progres: ${doneCount}/${allSteps.length} langkah (${pct}%)`,
      ...phases.map((p, i) => {
        const items = p.steps.map((s) => `  ${steps[s.id] ? "[x]" : "[ ]"} ${s.label}`).join("\n");
        return `Fase ${p.no} ${p.title} — ${statuses[i]}\n${items}`;
      }),
      `Revisi: ${revDone}/${revisions.length} selesai`,
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
          <span className="rounded-full border-[3px] border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold uppercase text-brand-navy shadow-brutal-sm">
            {phases.length} Fase
          </span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Progres Menuju Kelulusan
        </h2>
        <p className="mt-1 font-display text-4xl font-extrabold text-brand-blue">{pct}%</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 rounded-xl border-[3px] border-black bg-brand-panel p-3 shadow-brutal-sm">
            <span aria-hidden className="inline-flex shrink-0 items-center text-xl leading-none"><span className="material-symbols-outlined shrink-0 leading-none">check_circle</span></span>
            <div>
              <p className="font-label text-[11px] font-extrabold uppercase">Checklist Tugas</p>
              <p className="text-sm font-bold">{doneCount} / {allSteps.length} Selesai</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border-[3px] border-black bg-brand-panel p-3 shadow-brutal-sm">
            <span aria-hidden className="inline-flex shrink-0 items-center text-xl leading-none"><span className="material-symbols-outlined shrink-0 leading-none">event</span></span>
            <div>
              <p className="font-label text-[11px] font-extrabold uppercase">Status Fase</p>
              <p className="text-sm font-bold">
                {statuses.filter((s) => s === "SELESAI").length}/{phases.length} tuntas
              </p>
            </div>
          </div>
        </div>
        {/* Ringkas fase — komposisi desktop */}
        <div className="mt-3 hidden gap-2 sm:grid" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, phases.length))}, minmax(0, 1fr))` }}>
          {phases.map((p, i) => (
            <div key={p.id} className="rounded-xl border-2 border-black bg-brand-paper px-2 py-1.5 text-center shadow-brutal-sm">
              <p className="font-label text-[10px] font-extrabold uppercase">Fase {p.no}</p>
              <p className={`font-label text-[11px] font-extrabold uppercase ${statuses[i] === "SELESAI" ? "text-brand-blue" : "text-brand-muted"}`}>
                {statuses[i]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tahapan alur */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="font-display text-xl font-bold">Tahapan Alur Skripsi</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border-[3px] border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold shadow-brutal-sm">
            {pct}%
          </span>
          <Button
            size="sm"
            variant="accent"
            onClick={() => setTambahFase((v) => !v)}
            aria-expanded={tambahFase}
          >
            + Tambah Fase
          </Button>
        </div>
      </div>

      {tambahFase && (
        <div className="mt-2 rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-label text-xs font-extrabold uppercase">Nama fase</span>
              <input
                value={faseJudul}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFaseJudul(e.target.value)}
                placeholder="cth: Analisis Data"
                className={inputCls}
                aria-label="Nama fase baru"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-label text-xs font-extrabold uppercase">Deskripsi</span>
              <input
                value={faseDesc}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFaseDesc(e.target.value)}
                placeholder="cth: Pengolahan & uji hipotesis"
                className={inputCls}
                aria-label="Deskripsi fase baru"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setTambahFase(false); setFaseJudul(""); setFaseDesc(""); }}>
              Batal
            </Button>
            <Button size="sm" variant="accent" onClick={tambahFaseBaru}>
              Simpan Fase
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col">
        {phases.map((phase, i) => {
          const st = statuses[i];
          const n = phase.steps.filter((s) => steps[s.id]).length;
          const isOpen = !!open[phase.id];
          const formStep = stepBaru[phase.id] ?? { label: "", sub: "", deadline: "" };
          const catatan = catatanFase[phase.id] ?? "";
          return (
            <div key={phase.id} className="flex flex-col">
              <section className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [phase.id]: !o[phase.id] }))}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-brand-blue font-display text-sm font-extrabold text-white shadow-brutal-sm">
                      {phase.no}
                    </span>
                    <span className="min-w-0">
                      {editFase === phase.id ? (
                        <span className="flex flex-col gap-1">
                          <input
                            value={draftFaseJudul}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftFaseJudul(e.target.value)}
                            className="h-9 w-full rounded-lg border-2 border-black bg-white px-2 font-display text-base font-bold text-brand-navy outline-none focus:bg-brand-paper"
                            aria-label={`Nama fase ${phase.title}`}
                          />
                          <input
                            value={draftFaseDesc}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftFaseDesc(e.target.value)}
                            className="h-9 w-full rounded-lg border-2 border-black bg-white px-2 font-body text-xs text-brand-navy outline-none focus:bg-brand-paper"
                            aria-label={`Deskripsi fase ${phase.title}`}
                          />
                        </span>
                      ) : (
                        <span>
                          <span className="block font-label text-[11px] font-extrabold uppercase tracking-wider text-brand-muted">
                            Fase {phase.no} • {st === "SELESAI" ? "Tuntas" : st === "BERJALAN" ? "Sedang Dikerjakan" : "Menunggu"}
                          </span>
                          <span className="block font-display text-lg font-bold leading-tight">{phase.title}</span>
                          <span className="block text-xs text-brand-muted">{phase.desc}</span>
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full border-2 border-black px-2 py-0.5 font-label text-[11px] font-extrabold uppercase ${statusCls[st]}`}>
                        {st}
                      </span>
                      <span aria-hidden className={`text-xl transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {editFase === phase.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          ubahFase(phase.id, { title: draftFaseJudul.trim() || phase.title, desc: draftFaseDesc.trim() || phase.desc });
                          setEditFase(null);
                        }}
                        className="rounded-lg border-2 border-black bg-brand-yellow px-2 py-1 font-label text-[10px] font-extrabold uppercase"
                      >
                        Simpan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditFase(phase.id);
                          setDraftFaseJudul(phase.title);
                          setDraftFaseDesc(phase.desc);
                        }}
                        aria-label={`Ubah fase ${phase.title}`}
                        className="rounded-lg border-2 border-black bg-white px-2 py-1 font-label text-[10px] font-extrabold uppercase"
                      >
                        Ubah
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => geserFase(phase.id, -1)}
                      disabled={i === 0}
                      aria-label={`Naikkan fase ${phase.title}`}
                      className="rounded-lg border-2 border-black bg-white px-2 py-1 font-label text-[10px] font-extrabold uppercase disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => geserFase(phase.id, 1)}
                      disabled={i === phases.length - 1}
                      aria-label={`Turunkan fase ${phase.title}`}
                      className="rounded-lg border-2 border-black bg-white px-2 py-1 font-label text-[10px] font-extrabold uppercase disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => hapusFase(phase.id)}
                      aria-label={`Hapus fase ${phase.title}`}
                      className="rounded-lg border-2 border-black bg-brand-brick px-2 py-1 font-label text-[10px] font-extrabold uppercase text-white"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                {konfirmasiHapusFase === phase.id && (
                  <div className="mt-2 rounded-lg border-2 border-black bg-brand-panel p-2.5">
                    <p className="font-label text-[11px] font-extrabold uppercase text-brand-navy">
                      Hapus fase “{phase.title}” beserta {phase.steps.length} langkahnya?
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setKonfirmasiHapusFase(null)}
                        className="h-9 rounded-full border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold uppercase"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => yakinHapusFase(phase.id)}
                        className="h-9 rounded-full border-2 border-black bg-brand-navy px-3 font-label text-[11px] font-extrabold uppercase text-white"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
                {isOpen && (
                  <div className="mt-3 border-t-2 border-dashed border-black/20 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">
                        Kelengkapan Dokumen
                      </span>
                      <span className="font-label text-[11px] font-extrabold">
                        {n}/{phase.steps.length} •{" "}
                        {phase.steps.length === 0
                          ? "0%"
                          : Math.round((n / phase.steps.length) * 100).toString() + "%"}
                      </span>
                    </div>
                    <div className="mb-3 h-3 overflow-hidden rounded-full border-2 border-black bg-brand-paper">
                      <div
                        className="h-full bg-brand-blue transition-all"
                        style={{
                          width:
                            phase.steps.length === 0
                              ? "0%"
                              : `${(n / phase.steps.length) * 100}%`,
                        }}
                      />
                    </div>
                    {phase.steps.length === 0 ? (
                      <p className="mb-3 rounded-xl border-2 border-dashed border-black/30 bg-white p-4 text-center font-body text-sm text-brand-muted">
                        Belum ada tugas di fase ini. Tambahkan langkah pertama di bawah.
                      </p>
                    ) : (
                    <div className="space-y-2">
                      {phase.steps.map((s) => (
                        <div key={s.id} className="rounded-xl border-2 border-black/20 bg-white">
                          <label
                            className={`flex cursor-pointer items-start gap-2.5 p-3 text-sm ${
                              steps[s.id] ? "opacity-80" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!steps[s.id]}
                              onChange={() => toggleStep(s.id)}
                              className="mt-0.5 h-5 w-5 shrink-0 accent-black"
                              aria-label={s.label}
                            />
                            <span className="min-w-0 flex-1">
                              <span className={`block font-bold ${steps[s.id] ? "line-through" : ""}`}>{s.label}</span>
                              <span className="block text-xs text-brand-muted">{s.sub}</span>
                            </span>
                            {steps[s.id] && (
                              <span aria-hidden className="ml-auto shrink-0 font-black leading-none text-brand-blue">
                                <span className="material-symbols-outlined shrink-0 leading-none">check</span>
                              </span>
                            )}
                          </label>
                          <div className="flex flex-wrap items-center gap-2 border-t-2 border-dashed border-black/15 p-2.5">
                            <input
                              type="date"
                              value={/^\d{4}-\d{2}-\d{2}/.test(s.dueDate ?? "") ? (s.dueDate as string).slice(0, 10) : ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                ubahStep(phase.id, s.id, { dueDate: e.target.value })
                              }
                              className="h-9 rounded-lg border-2 border-black bg-white px-2 font-label text-xs"
                              aria-label={`Deadline ${s.label}`}
                            />
                            <input
                              value={s.notes ?? ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                ubahStep(phase.id, s.id, { notes: e.target.value })
                              }
                              placeholder="Catatan tugas…"
                              className="h-9 min-w-[140px] flex-1 rounded-lg border-2 border-black bg-white px-2 font-body text-xs outline-none focus:bg-brand-paper"
                              aria-label={`Catatan ${s.label}`}
                            />
                            <button
                              type="button"
                              onClick={() => hapusStep(phase.id, s.id)}
                              aria-label={`Hapus langkah ${s.label}`}
                              className="rounded-lg border-2 border-black bg-brand-brick px-2 py-1 font-label text-[10px] font-extrabold uppercase text-white"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                    <div className="mt-3 rounded-xl border-2 border-black/20 bg-brand-panel p-2.5">
                      <p className="mb-2 font-label text-[11px] font-extrabold uppercase text-brand-navy">
                        + Tambah Tugas
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          value={formStep.label}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setStepBaru((f) => ({
                              ...f,
                              [phase.id]: { ...formStep, label: e.target.value },
                            }))
                          }
                          placeholder="Judul tugas…"
                          className="h-10 w-full rounded-lg border-2 border-black bg-white px-2 font-body text-sm outline-none focus:bg-brand-paper"
                          aria-label={`Judul tugas baru di fase ${phase.title}`}
                        />
                        <input
                          value={formStep.sub}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setStepBaru((f) => ({
                              ...f,
                              [phase.id]: { ...formStep, sub: e.target.value },
                            }))
                          }
                          placeholder="Keterangan singkat…"
                          className="h-10 w-full rounded-lg border-2 border-black bg-white px-2 font-body text-sm outline-none focus:bg-brand-paper"
                          aria-label={`Keterangan tugas baru di fase ${phase.title}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => tambahStep(phase.id)}
                        className="mt-2 h-10 rounded-full border-2 border-black bg-brand-yellow px-3 font-label text-[11px] font-extrabold uppercase text-black shadow-[2px_2px_0px_#000000]"
                      >
                        Simpan Tugas
                      </button>
                    </div>
                    <label className="mt-3 block">
                      <span className="mb-1 block font-label text-[11px] font-extrabold uppercase text-brand-muted">
                        Catatan fase (opsional)
                      </span>
                      <textarea
                        value={catatan}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setCatatanFase((c) => ({ ...c, [phase.id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Ide, hasil bimbingan, catatan pribadi…"
                        className="w-full rounded-lg border-2 border-black bg-white px-2 py-1.5 font-body text-sm outline-none focus:bg-brand-paper"
                        aria-label={`Catatan fase ${phase.title}`}
                      />
                    </label>
                  </div>
                )}
              </section>
              {i < phases.length - 1 && (
                <p aria-hidden className="py-1 text-center text-2xl text-brand-navy">↓</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Motivasi + rekap */}
      <Panel className="mt-5 bg-white">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-brand-yellow text-xl shadow-brutal-sm"><span className="material-symbols-outlined shrink-0 leading-none">school</span></span>
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
            <h2 className="font-display text-lg font-bold">Matriks Revisi Penguji</h2>
            <p className="text-xs text-brand-muted">
              Catat setiap revisi tanpa batas jumlah. {revDone}/{revisions.length} selesai.
            </p>
          </div>
          <span className="w-fit rounded-full border-2 border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold text-brand-navy">
            Batas 14 hari hanya acuan bebas — tentukan tanggalmu sendiri
          </span>
        </div>

        {revisions.length === 0 && (
          <p className="mt-3 rounded-xl border-2 border-dashed border-black/30 bg-white p-4 text-center font-body text-sm text-brand-muted">
            Belum ada catatan revisi. Tambahkan di bawah — misalnya catatan Penguji 1.
          </p>
        )}

        <div className="mt-3 space-y-2">
          {revisions.map((r) => {
            const akhir = r.deadline ? new Date(`${r.deadline}T00:00:00`) : null;
            const sisa = akhir
              ? Math.ceil((akhir.getTime() - hariIni.getTime()) / 86400000)
              : null;
            const late = r.status !== "selesai" && sisa !== null && sisa < 0;
            const statusLbl =
              r.status === "selesai"
                ? "Selesai"
                : r.status === "proses"
                  ? "Sedang Dikerjakan"
                  : "Belum Dikerjakan";
            return (
              <div
                key={r.id}
                className={`rounded-xl border-[3px] p-3 ${
                  r.status === "selesai"
                    ? "border-black/20 bg-brand-paper opacity-70"
                    : "border-black bg-white shadow-brutal-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold ${
                        r.status === "selesai" ? "line-through" : ""
                      }`}
                    >
                      {r.judul}
                    </p>
                    {r.detail && (
                      <p className="mt-0.5 text-xs text-brand-muted">{r.detail}</p>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-label text-[11px] text-brand-muted">
                      <span>Penguji: {r.penguji}</span>
                      {r.mulai && <span>• Mulai {r.mulai}</span>}
                      {r.deadline && <span>• Deadline {r.deadline}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full border-2 border-black px-2 py-0.5 font-label text-[10px] font-extrabold uppercase ${
                        late
                          ? "bg-brand-brick text-white"
                          : r.status === "selesai"
                            ? "bg-brand-blue text-white"
                            : r.status === "proses"
                              ? "bg-brand-yellow text-black"
                              : "bg-white text-brand-navy"
                      }`}
                    >
                      {late && sisa !== null
                        ? `Terlambat ${Math.abs(sisa)} hari`
                        : statusLbl}
                    </span>
                    {!late && r.status !== "selesai" && sisa !== null && sisa >= 0 && (
                      <span className="font-label text-[10px] font-extrabold text-brand-blue">
                        Sisa {sisa} hari
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <select
                    value={r.status}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setRevisions((rs) =>
                        rs.map((x) =>
                          x.id === r.id
                            ? { ...x, status: e.target.value as Revision["status"] }
                            : x
                        )
                      )
                    }
                    aria-label={`Status revisi: ${r.judul}`}
                    className="h-9 rounded-lg border-2 border-black bg-white px-2 font-label text-[11px] font-bold"
                  >
                    <option value="belum">Belum Dikerjakan</option>
                    <option value="proses">Sedang Dikerjakan</option>
                    <option value="selesai">Selesai</option>
                  </select>
                  <label className="flex items-center gap-1 font-label text-[11px] font-bold">
                    Deadline
                    <input
                      type="date"
                      value={/^\d{4}-\d{2}-\d{2}/.test(r.deadline) ? r.deadline : ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRevisions((rs) =>
                          rs.map((x) =>
                            x.id === r.id ? { ...x, deadline: e.target.value } : x
                          )
                        )
                      }
                      aria-label={`Deadline revisi: ${r.judul}`}
                      className="h-9 rounded-lg border-2 border-black bg-white px-2 font-label text-[11px]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setRevisions((rs) => rs.filter((x) => x.id !== r.id))}
                    className="rounded-lg border-2 border-black bg-brand-brick px-2 py-1 font-label text-[10px] font-extrabold uppercase text-white"
                    aria-label={`Hapus revisi: ${r.judul}`}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-label text-xs font-extrabold uppercase">Judul revisi</span>
            <input
              value={revJudul}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevJudul(e.target.value)}
              placeholder="cth: Perkuat landasan teori"
              className={inputCls}
              aria-label="Judul revisi"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-label text-xs font-extrabold uppercase">Nama penguji</span>
            <input
              value={revPenguji}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevPenguji(e.target.value)}
              placeholder="cth: Penguji 1"
              className={inputCls}
              aria-label="Nama penguji"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block font-label text-xs font-extrabold uppercase">Detail revisi</span>
            <textarea
              value={revDetail}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRevDetail(e.target.value)}
              rows={2}
              placeholder="Apa yang harus diperbaiki…"
              className="w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 py-2 font-body text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue"
              aria-label="Detail revisi"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-label text-xs font-extrabold uppercase">Tanggal mulai</span>
            <input
              type="date"
              value={revMulai}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevMulai(e.target.value)}
              className={inputCls}
              aria-label="Tanggal mulai revisi"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-label text-xs font-extrabold uppercase">Deadline</span>
            <input
              type="date"
              value={revDeadline}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevDeadline(e.target.value)}
              className={inputCls}
              aria-label="Deadline revisi"
            />
          </label>
        </div>
        <Button size="sm" variant="accent" className="mt-2" onClick={tambahRevisi}>
          + Tambah revisi
        </Button>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="font-label text-xs font-bold uppercase">Kemiripan naskah (%) — acuan umum, ikuti pedoman kampusmu</span>
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
              <p className="flex items-center gap-1 text-xs font-bold text-brand-brick"><span className="material-symbols-outlined shrink-0 leading-none">warning</span>️ Isi 0–100.</p>
            )}
          </label>
        </div>
      </Panel>

      <div className="mt-5">
        <h2 className="mb-2 font-display text-lg font-bold">Lanjut ke tools terkait</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CTA.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="flex flex-col items-start rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span className="material-symbols-outlined shrink-0 text-2xl leading-none">{c.icon_name}</span>
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
