"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { loadTasks, saveTasks, bySource } from "../../../components/task-store";
import { cocokFilterTugas, mondayOfWeek, toISODate } from "@cademy/utils";

type Status = "todo" | "doing" | "done";
type Prioritas = "tinggi" | "sedang" | "normal";
type Pandangan = "agenda" | "kanban";

interface Agenda {
  id: string;
  judul: string;
  deskripsi: string;
  prioritas: Prioritas;
  kategori: string;
  badge: string;
  badgeTone: "confirm" | "danger" | "room";
  jam: string;
  lokasi: string;
  tuntas: boolean;
}

interface Tugas {
  id: string;
  judul: string;
  deskripsi: string;
  tag: string;
  prioritas: Prioritas;
  status: Status;
  deadline: string;
  progres: number;
  catatan: number;
}

const KEY_TUGAS = "cademy:jadwal-tugas";
const KEY_AGENDA = "cademy:jadwal-agenda";

const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Strip pekan + deadline default dihitung dari tanggal hari ini
// (dulu statis: 14–19 / Mei 2025 — basi).
const KODE_HARI = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];

function fmtSingkat(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function geserHari(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function hariPekanIni(): { kode: string; tgl: string; dot: string }[] {
  const kini = new Date();
  const mon = mondayOfWeek(kini);
  const dots = ["bg-brand-muted", "bg-brand-yellow", "bg-brand-brick", "bg-brand-yellow", "bg-brand-muted", "bg-brand-muted"];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const samaHari = toISODate(d) === toISODate(kini);
    return {
      kode: KODE_HARI[d.getDay()],
      tgl: String(d.getDate()),
      dot: samaHari ? "bg-brand-blue" : dots[i],
    };
  });
}

function indeksHariIni(): number {
  // 0=Senin..5=Sabtu; Minggu ikut Sabtu.
  return Math.min(5, (new Date().getDay() + 6) % 7);
}

function nomorMingguIni(): number {
  const kini = new Date();
  const awal = new Date(kini.getFullYear(), 0, 1);
  const hariKe = Math.floor((kini.getTime() - awal.getTime()) / 86400000);
  return Math.ceil((hariKe + awal.getDay() + 1) / 7);
}

const HARI = hariPekanIni();

const DEFAULT_AGENDA: Agenda[] = [
  {
    id: "ag-bimbingan",
    judul: "Bimbingan Bab 4 & 5",
    deskripsi:
      "Membahas validasi instrumen kuantitatif serta pengujian hipotesis ANOVA via SPSS.",
    prioritas: "tinggi",
    kategori: "Tinggi • Dosen Pembimbing",
    badge: "DIKONFIRMASI",
    badgeTone: "confirm",
    jam: "10:00 WIB",
    lokasi: "R. Dosen 302",
    tuntas: false,
  },
  {
    id: "ag-revisi",
    judul: "Deadline Revisi Naskah Semhas",
    deskripsi:
      "Upload PDF final beserta bukti persetujuan tanda tangan kaprodi ke portal SIAKAD.",
    prioritas: "sedang",
    kategori: "Sedang • Batas Akhir",
    badge: "H-2 SUBMIT",
    badgeTone: "danger",
    jam: "23:59 WIB",
    lokasi: "Portal Akademik",
    tuntas: false,
  },
  {
    id: "ag-gladi",
    judul: "Gladi Resik Slide Sidang",
    deskripsi:
      "Latihan penyampaian 15 menit bersama teman kelompok seminar dan uji konektor HDMI.",
    prioritas: "normal",
    kategori: "Normal • Presentasi",
    badge: "LAB 204",
    badgeTone: "room",
    jam: "14:30 WIB",
    lokasi: "Teman Sejawat",
    tuntas: false,
  },
];

const _KINI = new Date();
const DEFAULT_TUGAS: Tugas[] = [
  {
    id: "t-erd",
    judul: "Perbaiki diagram relasi ERD sesuai modul MySQL 8",
    deskripsi: "",
    tag: "BAB 3",
    prioritas: "tinggi",
    status: "todo",
    deadline: "Besok",
    progres: 0,
    catatan: 0,
  },
  {
    id: "t-lampiran",
    judul: "Format tata letak lampiran kuesioner Google Form",
    deskripsi: "",
    tag: "LAMPIRAN",
    prioritas: "normal",
    status: "todo",
    deadline: fmtSingkat(geserHari(_KINI, 4)),
    progres: 0,
    catatan: 0,
  },
  {
    id: "t-paper",
    judul: "Review 3 paper IEEE tentang transformer NLP",
    deskripsi: "",
    tag: "LITERATUR",
    prioritas: "normal",
    status: "todo",
    deadline: fmtSingkat(geserHari(_KINI, 6)),
    progres: 0,
    catatan: 0,
  },
  {
    id: "t-matriks",
    judul: "Matriks revisi tanggapan komentar Dosen Penguji 1",
    deskripsi: "",
    tag: "REVISI SEMHAS",
    prioritas: "sedang",
    status: "doing",
    deadline: fmtSingkat(geserHari(_KINI, 2)),
    progres: 75,
    catatan: 4,
  },
  {
    id: "t-ba",
    judul: "Tanda tangan Berita Acara Pelaksanaan Seminar",
    deskripsi: "",
    tag: "ADMINISTRASI",
    prioritas: "normal",
    status: "done",
    deadline: `Tuntas ${fmtSingkat(geserHari(_KINI, -2))}`,
    progres: 100,
    catatan: 0,
  },
  {
    id: "t-cetak",
    judul: "Cetak draft naskah sidang jilid lakban 3 eksemplar",
    deskripsi: "",
    tag: "LOGISTIK",
    prioritas: "normal",
    status: "done",
    deadline: `Tuntas ${fmtSingkat(geserHari(_KINI, -4))}`,
    progres: 100,
    catatan: 0,
  },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function dotPrioritas(p: Prioritas): string {
  if (p === "tinggi") return "bg-brand-brick";
  if (p === "sedang") return "bg-brand-yellow";
  return "bg-brand-muted";
}

function badgeAgenda(tone: Agenda["badgeTone"]): string {
  if (tone === "danger") return "bg-brand-brick text-white";
  return "bg-brand-panel text-brand-navy";
}

const URUTAN: Status[] = ["todo", "doing", "done"];
const LABEL_STATUS: Record<Status, string> = {
  todo: "To Do",
  doing: "Sedang Dikerjakan",
  done: "Selesai",
};

export default function JadwalView() {
  const [agenda, setAgenda] = React.useState<Agenda[]>(DEFAULT_AGENDA);
  const [tugas, setTugas] = React.useState<Tugas[]>(DEFAULT_TUGAS);
  const [pandangan, setPandangan] = React.useState<Pandangan>("agenda");
  const [hariAktif, setHariAktif] = React.useState<number>(() => indeksHariIni());
  const [filter, setFilter] = React.useState<"semua" | Prioritas>("semua");
  const [cari, setCari] = React.useState("");
  const [formTerbuka, setFormTerbuka] = React.useState(false);
  const [judul, setJudul] = React.useState("");
  const [deskripsi, setDeskripsi] = React.useState("");
  const [tag, setTag] = React.useState("BAB 4");
  const [prioritas, setPrioritas] = React.useState<Prioritas>("sedang");
  const [deadline, setDeadline] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);
  const [siap, setSiap] = React.useState(false);
  const toastTimer = React.useRef<number | null>(null);
  const firstInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setAgenda(load<Agenda[]>(KEY_AGENDA, DEFAULT_AGENDA));
    const all = loadTasks();
    const own = bySource(all, "jadwal").map((t) => ({
      id: t.id,
      judul: t.title,
      deskripsi: t.description ?? "",
      tag: t.tag ?? "TUGAS",
      prioritas:
        t.prioritas === "tinggi" ? "tinggi" : t.prioritas === "normal" ? "normal" : "sedang",
      status: t.status,
      deadline: t.dueDate ?? "",
      progres: t.progres ?? (t.status === "done" ? 100 : t.status === "doing" ? 50 : 0),
      catatan: t.catatan ?? 0,
    } satisfies Tugas));
    const roadmap = bySource(all, "roadmap").map((t) => ({
      id: t.id,
      judul: t.title,
      deskripsi: t.description ?? "",
      tag: t.phaseId ? `FASE ${t.phaseId.toUpperCase()}` : "ROADMAP",
      prioritas:
        t.prioritas === "tinggi" ? "tinggi" : t.prioritas === "normal" ? "normal" : "sedang",
      status: t.status,
      deadline: t.dueDate ?? "",
      progres: t.status === "done" ? 100 : t.status === "doing" ? 50 : 0,
      catatan: 0,
    } satisfies Tugas));
    setTugas(own.length > 0 || roadmap.length > 0 ? [...own, ...roadmap] : DEFAULT_TUGAS);
    setSiap(true);
  }, []);

  React.useEffect(() => {
    if (!siap) return;
    try {
      const all = loadTasks();
      const keep = all.filter((t) => t.source !== "jadwal" && t.source !== "roadmap");
      const jadwalSlice = tugas
        .filter((t) => !t.tag.startsWith("FASE"))
        .map((t) => ({
          id: t.id,
          source: "jadwal" as const,
          status: t.status,
          prioritas: t.prioritas,
          title: t.judul,
          description: t.deskripsi,
          dueDate: t.deadline,
          tag: t.tag,
          progres: t.progres,
          catatan: t.catatan,
          createdAt: new Date().toISOString(),
        }));
      const roadmapSlice = all
        .filter((t) => t.source === "roadmap")
        .map((orig) => {
          const hit = tugas.find((t) => t.id === orig.id);
          return hit
            ? { ...orig, status: hit.status, prioritas: hit.prioritas, dueDate: hit.deadline }
            : orig;
        });
      saveTasks([...keep, ...jadwalSlice, ...roadmapSlice]);
      localStorage.setItem(KEY_TUGAS, JSON.stringify(jadwalSlice));
    } catch {
      /* abaikan */
    }
  }, [tugas, siap]);

  React.useEffect(() => {
    if (!siap) return;
    try {
      localStorage.setItem(KEY_AGENDA, JSON.stringify(agenda));
    } catch {
      /* abaikan */
    }
  }, [agenda, siap]);

  const tampilToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  React.useEffect(() => {
    if (!formTerbuka) return;
    firstInputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFormTerbuka(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formTerbuka]);

  const todo = tugas.filter((t) => t.status === "todo").length;
  const doing = tugas.filter((t) => t.status === "doing").length;
  const done = tugas.filter((t) => t.status === "done").length;
  const persen = tugas.length === 0 ? 0 : Math.round((done / tugas.length) * 100);

  const cocokFilter = React.useCallback(
    (t: Tugas): boolean =>
      cocokFilterTugas(
        { judul: t.judul, tag: t.tag, prioritas: t.prioritas },
        filter,
        cari
      ),
    [filter, cari]
  );

  const agendaTampil = agenda.filter((a) =>
    cocokFilterTugas(
      { judul: a.judul, tag: a.deskripsi, prioritas: a.prioritas },
      filter,
      cari
    )
  );

  function toggleAgenda(id: string): void {
    setAgenda((list) =>
      list.map((a) => (a.id === id ? { ...a, tuntas: !a.tuntas } : a))
    );
    const target = agenda.find((a) => a.id === id);
    if (target && !target.tuntas) tampilToast("Agenda ditandai tuntas!");
  }

  function geserStatus(id: string, arah: -1 | 1): void {
    setTugas((list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        const idx = URUTAN.indexOf(t.status);
        const next = URUTAN[Math.min(2, Math.max(0, idx + arah))];
        return {
          ...t,
          status: next,
          progres: next === "done" ? 100 : next === "todo" ? 0 : t.progres || 50,
        };
      })
    );
    tampilToast(
      arah > 0 ? "Kartu digeser maju satu kolom!" : "Kartu dikembalikan!"
    );
  }

  function hapusTugas(id: string): void {
    setTugas((list) => list.filter((t) => t.id !== id));
    tampilToast("Tugas dihapus dari papan!");
  }

  function ubahProgres(id: string, nilai: number): void {
    const v = Math.min(100, Math.max(0, Math.round(nilai)));
    setTugas((list) =>
      list.map((t) => (t.id === id ? { ...t, progres: v } : t))
    );
  }

  function tambahTugas(e: React.FormEvent): void {
    e.preventDefault();
    const nama = judul.trim();
    if (!nama) {
      tampilToast("Isi judul tugas terlebih dahulu!");
      return;
    }
    const baru: Tugas = {
      id: uid(),
      judul: nama,
      deskripsi: deskripsi.trim(),
      tag: tag.trim().toUpperCase().slice(0, 16) || "UMUM",
      prioritas,
      status: "todo",
      deadline: deadline.trim() || "Tanpa tanggal",
      progres: 0,
      catatan: 0,
    };
    setTugas((list) => [baru, ...list]);
    setJudul("");
    setDeskripsi("");
    setDeadline("");
    setFormTerbuka(false);
    setPandangan("kanban");
    tampilToast("Tugas baru masuk kolom To Do!");
  }

  async function salinUndangan(): Promise<void> {
    // Salin URL halaman nyata (dulu string statis yang menyesatkan).
    const teks = typeof window !== "undefined" ? window.location.href : "";
    if (!teks) {
      tampilToast("Tak ada link untuk disalin!");
      return;
    }
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(teks);
        ok = true;
      } else {
        throw new Error("clipboard unavailable");
      }
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = teks;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    tampilToast(ok ? "Link halaman disalin ke clipboard!" : "Gagal menyalin — browser memblokir clipboard!");
  }

  const tabAktif =
    "flex items-center justify-center gap-2 rounded-full border-[3px] border-black bg-brand-blue px-3 py-2.5 font-label text-sm font-bold text-white shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";
  const tabPasif =
    "flex items-center justify-center gap-2 rounded-full border-[3px] border-black bg-white px-3 py-2.5 font-label text-sm font-bold text-brand-navy shadow-brutal transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

  const renderKartu = (t: Tugas): React.ReactNode => (
    <article
      key={t.id}
      className="flex flex-col gap-2 rounded-xl border-[3px] border-black bg-white p-3 shadow-brutal"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-full border-[2px] border-black px-2 py-0.5 font-label text-[11px] font-extrabold uppercase tracking-wide shadow-[1px_1px_0px_#000000] ${
            t.prioritas === "sedang" || t.tag === "REVISI SEMHAS"
              ? "bg-brand-yellow text-black"
              : "bg-brand-panel text-brand-navy"
          }`}
        >
          {t.tag}
        </span>
        <span
          className={`h-2.5 w-2.5 rounded-full border border-black ${dotPrioritas(t.prioritas)}`}
          title={t.prioritas}
        />
      </div>
      <p
        className={`font-body text-[15px] font-bold leading-snug text-brand-navy ${
          t.status === "done" ? "line-through opacity-70" : ""
        }`}
      >
        {t.judul}
      </p>
      {t.deskripsi ? (
        <p className="font-body text-xs leading-snug text-brand-muted">{t.deskripsi}</p>
      ) : null}
      {t.status === "doing" && (
        <div className="flex flex-col gap-1">
          <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-black bg-brand-panel">
            <div
              className="h-full bg-brand-blue transition-all"
              style={{ width: `${t.progres}%` }}
            />
          </div>
          <label className="flex items-center justify-between font-label text-[11px] font-bold text-brand-muted">
            <span>{t.progres}% selesai</span>
            <input
              type="range"
              min={0}
              max={100}
              value={t.progres}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                ubahProgres(t.id, Number(e.target.value))
              }
              aria-label={`Progres ${t.judul}`}
              className="h-2 w-24 cursor-pointer accent-[#0E4A6E]"
            />
          </label>
        </div>
      )}
      <div className="flex items-center justify-between border-t-2 border-black/10 pt-2">
        <span className="flex items-center gap-1 font-label text-xs font-bold text-brand-muted">
          <span aria-hidden className="material-symbols-outlined text-[15px]">
            event
          </span>
          {t.deadline}
        </span>
        {t.status === "doing" ? (
          <span className="flex items-center gap-1 font-label text-xs font-bold text-brand-muted">
            <span aria-hidden className="material-symbols-outlined text-[15px]">
              chat
            </span>
            {t.catatan} Catatan
          </span>
        ) : t.status === "done" ? (
          <span
            aria-hidden
            className="material-symbols-outlined text-[18px] text-brand-blue"
          >
            verified
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => geserStatus(t.id, -1)}
          disabled={t.status === "todo"}
          aria-label={`Mundur: ${t.judul}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-brand-navy shadow-[2px_2px_0px_#000000] transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30"
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            chevron_left
          </span>
        </button>
        <button
          type="button"
          onClick={() => geserStatus(t.id, 1)}
          disabled={t.status === "done"}
          aria-label={`Maju: ${t.judul}`}
          className="flex h-8 flex-1 items-center justify-center gap-1 rounded-full border-2 border-black bg-brand-blue px-2 font-label text-[11px] font-extrabold uppercase text-white shadow-[2px_2px_0px_#000000] transition-all hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30"
        >
          {t.status === "todo" ? (
            <>
              Kerjakan
              <span aria-hidden className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </>
          ) : t.status === "doing" ? (
            <>
              Selesaikan
              <span aria-hidden className="material-symbols-outlined text-[16px]">
                check
              </span>
            </>
          ) : (
            "Tuntas"
          )}
        </button>
        <button
          type="button"
          onClick={() => hapusTugas(t.id)}
          aria-label={`Hapus: ${t.judul}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-brand-brick text-white shadow-[2px_2px_0px_#000000] transition-all hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            delete
          </span>
        </button>
      </div>
    </article>
  );

  const kolom: { status: Status; hint: string }[] = [
    { status: "todo", hint: "Antrian awal" },
    { status: "doing", hint: "Fokus aktif" },
    { status: "done", hint: "Arsip tuntas" },
  ];

  return (
    <ToolShell
      eyebrow="Alat Studi"
      title="Jadwal & Task Board"
      description="Manajemen timeline bimbingan, deadline sidang, dan pelacak tugas skripsi secara terintegrasi."
      icon="calendar_month"
      badge="Kanban Aktif"
      badgeTone="beta"
    >
      {/* Banner target kelulusan */}
      <div className="flex flex-col gap-4 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-brand-yellow shadow-[2px_2px_0px_#000000]">
            <span aria-hidden className="material-symbols-outlined text-[24px] text-brand-navy">
              auto_stories
            </span>
          </div>
          <div>
            <span className="font-label text-[11px] font-extrabold uppercase tracking-wider text-brand-navy">
              Target Kelulusan
            </span>
            <p className="font-display text-lg font-bold leading-tight text-brand-navy sm:text-xl">
              Sidang Akhir Semester Genap
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 py-1.5 font-label text-xs font-bold text-brand-navy shadow-[2px_2px_0px_#000000]">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-brand-yellow ring-1 ring-black" />
            Hari ini • {fmtSingkat(new Date())}
          </span>
          <div className="min-w-[160px] flex-1 sm:min-w-[200px]">
            <div className="flex items-center justify-between font-label text-[11px] font-extrabold uppercase text-brand-muted">
              <span>Progress Skripsi</span>
              <span className="text-brand-navy">{persen}%</span>
            </div>
            <div className="mt-1 h-4 w-full overflow-hidden rounded-full border-2 border-black bg-brand-panel p-0.5">
              <div
                className="h-full rounded-full border border-black bg-brand-blue transition-all"
                style={{ width: `${persen}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Switcher agenda / kanban (mobile) + filter */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border-[3px] border-black bg-brand-panel p-1.5 shadow-brutal">
        <button
          type="button"
          onClick={() => setPandangan("agenda")}
          className={pandangan === "agenda" ? tabAktif : tabPasif}
          aria-pressed={pandangan === "agenda"}
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            calendar_month
          </span>
          Agenda
        </button>
        <button
          type="button"
          onClick={() => setPandangan("kanban")}
          className={pandangan === "kanban" ? tabAktif : tabPasif}
          aria-pressed={pandangan === "kanban"}
        >
          <span aria-hidden className="material-symbols-outlined text-[18px]">
            view_kanban
          </span>
          Kanban
        </button>
      </div>

      {/* Pencarian + filter prioritas */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-xl border-[3px] border-black bg-white px-3 shadow-[3px_3px_0px_#000000] focus-within:bg-brand-paper">
          <span aria-hidden className="material-symbols-outlined text-[20px] text-brand-muted">
            search
          </span>
          <input
            value={cari}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCari(e.target.value)
            }
            placeholder="Cari tugas atau agenda…"
            className="w-full bg-transparent font-body text-sm text-brand-navy outline-none placeholder:text-brand-muted"
            aria-label="Cari tugas atau agenda"
          />
          {cari && (
            <button
              type="button"
              onClick={() => setCari("")}
              aria-label="Bersihkan pencarian"
              className="font-label text-xs font-bold text-brand-brick underline"
            >
              Hapus
            </button>
          )}
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter prioritas">
          {(["semua", "tinggi", "sedang", "normal"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`shrink-0 rounded-full border-2 border-black px-3 py-1.5 font-label text-xs font-extrabold uppercase shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                filter === f
                  ? "bg-brand-blue text-white"
                  : "bg-white text-brand-navy hover:bg-brand-panel"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace: agenda + kanban */}
      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Kolom agenda */}
        <div
          className={`flex-col gap-4 lg:col-span-5 ${
            pandangan === "agenda" ? "flex" : "hidden"
          } lg:flex`}
        >
          <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
                <span aria-hidden className="material-symbols-outlined text-[22px] text-brand-blue">
                  today
                </span>
                Pekan Ini • {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </h2>
              <span className="rounded-full border-[2px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold uppercase text-brand-navy shadow-[2px_2px_0px_#000000]">
                Minggu ke-{nomorMingguIni()}
              </span>
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 sm:gap-2 lg:grid lg:grid-cols-6 lg:overflow-visible">
              {HARI.map((h, i) => (
                <button
                  key={h.kode}
                  type="button"
                  onClick={() => setHariAktif(i)}
                  aria-pressed={hariAktif === i}
                  className={`flex min-w-[60px] flex-1 flex-col items-center rounded-xl border-[3px] border-black px-1 py-2 transition-all active:translate-y-0.5 active:shadow-none ${
                    hariAktif === i
                      ? "scale-105 bg-brand-blue text-white shadow-brutal"
                      : "bg-white text-brand-navy shadow-brutal hover:bg-brand-panel"
                  }`}
                >
                  <span
                    className={`font-label text-[11px] font-bold ${
                      hariAktif === i ? "text-white" : "text-brand-muted"
                    }`}
                  >
                    {h.kode.slice(0, 3)}
                  </span>
                  <span className="font-display text-lg font-bold">{h.tgl}</span>
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full ${h.dot} ring-1 ring-black`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
              Agenda Terdekat
              <span className="rounded-full border-[2px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold text-brand-navy shadow-[2px_2px_0px_#000000]">
                {agendaTampil.length} Agenda
              </span>
            </h2>
          </div>

          {agendaTampil.length === 0 && (
            <p className="rounded-xl border-2 border-dashed border-black/30 bg-white p-4 text-center font-body text-sm text-brand-muted">
              Tak ada agenda/task yang cocok — coba ubah kata kunci atau filter prioritas.
            </p>
          )}

          {agendaTampil.map((a) => (
            <article
              key={a.id}
              className={`flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal ${
                a.tuntas ? "opacity-75" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleAgenda(a.id)}
                    aria-pressed={a.tuntas}
                    aria-label={`Tandai tuntas: ${a.judul}`}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-black shadow-[2px_2px_0px_#000000] transition-all active:translate-y-0.5 active:shadow-none ${
                      a.tuntas ? "bg-brand-blue text-white" : "bg-brand-panel"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`material-symbols-outlined text-[16px] ${
                        a.tuntas ? "" : "invisible"
                      }`}
                    >
                      check
                    </span>
                  </button>
                  <div>
                    <span className="flex items-center gap-1.5 font-label text-[11px] font-extrabold uppercase tracking-wide text-brand-brick">
                      <span className={`h-2.5 w-2.5 rounded-full ring-1 ring-black ${dotPrioritas(a.prioritas)}`} />
                      {a.kategori}
                    </span>
                    <h3
                      className={`mt-0.5 font-display text-lg font-bold text-brand-navy ${
                        a.tuntas ? "line-through" : ""
                      }`}
                    >
                      {a.judul}
                    </h3>
                  </div>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full border-[2px] border-black px-2.5 py-1 font-label text-[11px] font-extrabold uppercase shadow-[2px_2px_0px_#000000] ${badgeAgenda(a.badgeTone)}`}
                >
                  {a.badge}
                </span>
              </div>
              <p className="pl-9 font-body text-sm text-brand-muted">{a.deskripsi}</p>
              <div className="flex items-center justify-between gap-2 pl-9 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 font-label text-xs font-bold text-brand-navy">
                    <span aria-hidden className="material-symbols-outlined text-[18px] text-brand-blue">
                      schedule
                    </span>
                    {a.jam}
                  </span>
                  <span className="flex items-center gap-1 font-label text-xs text-brand-muted">
                    <span aria-hidden className="material-symbols-outlined text-[18px]">
                      room
                    </span>
                    {a.lokasi}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Kolom kanban */}
        <div
          className={`flex-col gap-4 lg:col-span-7 ${
            pandangan === "kanban" ? "flex" : "hidden"
          } lg:flex`}
        >
          <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black pb-3">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-brand-navy">
                <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-brand-blue text-white shadow-[2px_2px_0px_#000000]">
                  <span className="material-symbols-outlined text-[20px]">dashboard</span>
                </span>
                Papan Skripsi
                <span className="rounded-full border-2 border-black bg-brand-yellow px-2 py-0.5 font-label text-[11px] font-extrabold uppercase text-black shadow-[2px_2px_0px_#000000]">
                  Kanban Aktif
                </span>
              </h2>
              <span className="font-label text-xs font-bold text-brand-muted">
                Total: {tugas.length} Kartu • {done} tuntas
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {kolom.map((k) => {
                const isi = tugas.filter(
                  (t) => t.status === k.status && cocokFilter(t)
                );
                const jumlah =
                  k.status === "todo" ? todo : k.status === "doing" ? doing : done;
                return (
                  <section
                    key={k.status}
                    aria-label={LABEL_STATUS[k.status]}
                    className="flex flex-col gap-3 rounded-xl border-[3px] border-black bg-brand-panel p-3"
                  >
                    <header className="flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 font-display text-base font-bold text-brand-navy">
                        <span
                          className={`h-3 w-3 rounded-full border-2 border-black ${
                            k.status === "todo"
                              ? "bg-white"
                              : k.status === "doing"
                                ? "bg-brand-blue"
                                : "bg-white"
                          }`}
                        />
                        {LABEL_STATUS[k.status]}
                        <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 font-label text-[11px] font-extrabold text-brand-navy shadow-[2px_2px_0px_#000000]">
                          {jumlah}
                        </span>
                      </h3>
                      {k.status === "doing" ? (
                        <span aria-hidden className="material-symbols-outlined text-[20px] text-brand-blue">
                          refresh
                        </span>
                      ) : k.status === "done" ? (
                        <span aria-hidden className="material-symbols-outlined text-[20px] text-brand-blue">
                          task_alt
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFormTerbuka(true)}
                          aria-label="Tambah kartu To Do"
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white text-brand-navy shadow-[2px_2px_0px_#000000] transition-all hover:bg-brand-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        >
                          <span aria-hidden className="material-symbols-outlined text-[18px]">
                            add
                          </span>
                        </button>
                      )}
                    </header>
                    <p className="font-label text-[11px] font-bold uppercase text-brand-muted">
                      {k.hint}
                    </p>
                    {isi.length === 0 && (
                      <p className="rounded-lg border-2 border-dashed border-black/30 bg-white/70 p-3 text-center font-body text-xs text-brand-muted">
                        {tugas.length === 0
                          ? "Belum ada kartu. Tambah tugas pertama!"
                          : "Tak ada agenda/task yang cocok — coba ubah filter atau pencarian."}
                      </p>
                    )}
                    {isi.map(renderKartu)}
                  </section>
                );
              })}
            </div>
          </div>

          {/* Strip kolaborasi */}
          <div className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden className="material-symbols-outlined text-[20px] text-brand-blue">
                groups
              </span>
              <span className="font-label text-sm font-bold text-brand-navy">
                Tim Penguji & Rekan Sejawat
              </span>
              <span className="rounded-full border-2 border-black bg-brand-panel px-2 py-0.5 font-label text-[10px] font-extrabold uppercase text-brand-navy shadow-[2px_2px_0px_#000000]">
                Baca & Komentar
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center" aria-label="Anggota tim">
                {["SD", "NH", "RF", "SA"].map((inisial, i) => (
                  <span
                    key={inisial}
                    title={inisial}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-[2px] border-black font-label text-xs font-extrabold text-brand-navy shadow-[2px_2px_0px_#000000] ${
                      i > 0 ? "-ml-2" : ""
                    } ${i < 2 ? "bg-brand-panel" : i === 2 ? "bg-brand-yellow text-black" : "bg-white"}`}
                  >
                    {inisial}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={salinUndangan}
                className="flex h-10 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3.5 font-label text-xs font-bold text-brand-navy shadow-[3px_3px_0px_#000000] transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span aria-hidden className="material-symbols-outlined text-[18px] text-brand-blue">
                  person_add
                </span>
                Undang
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form tambah tugas */}
      {formTerbuka && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Tambah tugas baru"
          onClick={() => setFormTerbuka(false)}
        >
          <form
            onSubmit={tambahTugas}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0px_#000000]"
          >
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-brand-navy">
              <span aria-hidden className="material-symbols-outlined text-[22px] text-brand-blue">
                add_task
              </span>
              Tugas Baru
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block font-label text-xs font-extrabold uppercase text-brand-navy">
                  Judul tugas
                </span>
                <input
                  ref={firstInputRef}
                  value={judul}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setJudul(e.target.value)
                  }
                  placeholder="cth. Susun instrumen kuesioner Bab 3"
                  className="h-12 w-full rounded-xl border-[3px] border-black bg-white px-3 font-body text-sm text-brand-navy shadow-[3px_3px_0px_#000000] outline-none placeholder:text-brand-muted focus:bg-brand-paper"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-label text-xs font-extrabold uppercase text-brand-navy">
                  Catatan (opsional)
                </span>
                <textarea
                  value={deskripsi}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDeskripsi(e.target.value)
                  }
                  rows={2}
                  placeholder="Detail singkat tugas…"
                  className="w-full rounded-xl border-[3px] border-black bg-white px-3 py-2 font-body text-sm text-brand-navy shadow-[3px_3px_0px_#000000] outline-none placeholder:text-brand-muted focus:bg-brand-paper"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-label text-xs font-extrabold uppercase text-brand-navy">
                    Label
                  </span>
                  <input
                    value={tag}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTag(e.target.value)
                    }
                    placeholder="BAB 4"
                    maxLength={16}
                    className="h-12 w-full rounded-xl border-[3px] border-black bg-white px-3 font-label text-sm font-bold uppercase text-brand-navy shadow-[3px_3px_0px_#000000] outline-none focus:bg-brand-paper"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-label text-xs font-extrabold uppercase text-brand-navy">
                    Deadline
                  </span>
                  <input
                    value={deadline}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDeadline(e.target.value)
                    }
                    placeholder="cth. 22 Mei"
                    className="h-12 w-full rounded-xl border-[3px] border-black bg-white px-3 font-body text-sm text-brand-navy shadow-[3px_3px_0px_#000000] outline-none placeholder:text-brand-muted focus:bg-brand-paper"
                  />
                </label>
              </div>
              <fieldset>
                <legend className="mb-1 font-label text-xs font-extrabold uppercase text-brand-navy">
                  Prioritas
                </legend>
                <div className="flex gap-2">
                  {(["tinggi", "sedang", "normal"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioritas(p)}
                      aria-pressed={prioritas === p}
                      className={`flex-1 rounded-full border-2 border-black px-2 py-2 font-label text-xs font-extrabold uppercase shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                        prioritas === p
                          ? "bg-brand-blue text-white"
                          : "bg-white text-brand-navy hover:bg-brand-panel"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setFormTerbuka(false)}
                className="h-12 flex-1 rounded-full border-[3px] border-black bg-white font-label text-xs font-extrabold uppercase text-brand-navy shadow-brutal transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full border-[3px] border-black bg-brand-yellow font-label text-xs font-extrabold uppercase text-black shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span aria-hidden className="material-symbols-outlined text-[18px]">
                  check
                </span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CTA tambah */}
      <button
        type="button"
        onClick={() => setFormTerbuka(true)}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full border-[3px] border-black bg-brand-yellow font-label text-sm font-extrabold uppercase text-brand-navy shadow-brutal transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
      >
        <span aria-hidden className="material-symbols-outlined text-[22px]">
          add_task
        </span>
        Tambah Tugas Baru
      </button>

      {toast && (
        <div aria-live="polite" className="fixed bottom-6 left-4 right-4 z-50 flex items-center justify-between gap-2 rounded-2xl border-[3px] border-black bg-brand-navy px-4 py-3 text-white shadow-brutal sm:left-auto sm:right-6 sm:w-auto sm:min-w-[280px]">
          <span className="flex items-center gap-2 font-body text-sm">
            <span aria-hidden className="material-symbols-outlined text-[20px] text-brand-yellow">
              check_circle
            </span>
            {toast}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="font-label text-xs font-bold underline"
          >
            Tutup
          </button>
        </div>
      )}
    </ToolShell>
  );
}
