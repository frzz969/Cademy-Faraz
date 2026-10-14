"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import {
  loadTasks,
  saveTasks,
  asingBaru,
  samaDaftar,
  bySource,
  createTask,
  setTaskStatus,
  pulihkanTugas,
  buatSeriBerulang,
  taskProgress,
  pushRiwayat,
  undoTask,
  bisaUndo,
  labelUndo,
  buatCadangan,
  bacaCadangan,
  gabungCadangan,
  uid,
  type SharedTask,
  type SubTask,
  type TaskSource,
  type FrekuensiBerulang,
  type InfoBerulang,
} from "../../../components/task-store";
import {
  cariLintasTugas,
  cocokFilterCepat,
  entriCariSemua,
  gridKalender,
  kunciTanggal,
  mondayOfWeek,
  parseTanggalISO,
  toISODate,
  tugasTerlambat,
  type EntriCari,
  type FilterCepat,
  type KondisiCari,
} from "@cademy/utils";

type Status = "todo" | "doing" | "done";
type Prioritas = "tinggi" | "sedang" | "rendah" | "normal";
type Sumber = "jadwal" | "roadmap" | "materi" | "pribadi";

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
  /** inisial penanggung jawab (avatar), mis. dosen pembimbing */
  inisial?: string;
  /** contoh bawaan (bukan data pengguna) — mudah dihapus sekaligus */
  contoh?: boolean;
}

export interface Tugas {
  id: string;
  judul: string;
  deskripsi: string;
  tag: string;
  prioritas: Prioritas;
  status: Status;
  deadline: string;
  progres: number;
  catatan: number;
  notes: string;
  subtasks: SubTask[];
  /** asal data — cukup dipakai sebagai metadata kecil, bukan batas edit. */
  sumber: Sumber;
  phaseTitle?: string;
  arsip?: boolean;
  /** seri berulang: id induk + label pola (tiap kejadian tugas sendiri). */
  indukId?: string;
  berulangLabel?: string;
  /** pola seri penuh (dibawa kartu baru agar tak lepas saat simpan) */
  berulang?: InfoBerulang;
  /** contoh (bukan data pengguna) — tampil berlabel, mudah dihapus */
  demo?: boolean;
  /** tetapan lama: item source roadmap tetap ditandai, tapi kini bisa diedit. */
  isRoadmap?: boolean;
}

const PRIORITAS_DARI_STORE = (p: SharedTask["prioritas"]): Prioritas =>
  p === "tinggi" || p === "sedang" || p === "rendah" || p === "normal"
    ? p
    : "sedang";

function keTugas(t: SharedTask, sumber: Sumber): Tugas {
  return {
    id: t.id,
    judul: t.title,
    deskripsi: t.description ?? "",
    tag: t.tag ?? (sumber === "roadmap" ? "ROADMAP" : "UMUM"),
    prioritas: PRIORITAS_DARI_STORE(t.prioritas),
    status: t.status,
    deadline: t.dueDate ?? "",
    progres: taskProgress(t),
    catatan: t.catatan ?? 0,
    notes: t.notes ?? "",
    subtasks: t.subtasks ?? [],
    sumber,
    ...(t.phaseTitle ? { phaseTitle: t.phaseTitle } : {}),
    ...(t.arsip ? { arsip: true } : {}),
    ...(t.demo ? { demo: true } : {}),
    ...(t.berulang
      ? {
          indukId: t.berulang.indukId,
          berulang: t.berulang,
          berulangLabel:
            t.berulang.frekuensi === "harian"
              ? "Harian"
              : t.berulang.frekuensi === "mingguan"
                ? "Mingguan"
                : `Tiap ${t.berulang.intervalHari} hari`,
        }
      : {}),
    ...(sumber === "roadmap" ? { isRoadmap: true } : {}),
  };
}

/**
 * Pemetaan tampil jadwal (murni, testable).
 * Semua sumber (jadwal, pribadi, roadmap, materi) tampil di papan yang sama
 * dan BISA diedit; roadmap ditandai sumbernya saja, bukan read-only.
 */
export function bagiTampilJadwal(all: SharedTask[]): {
  own: Tugas[];
  pribadi: Tugas[];
  roadmap: Tugas[];
  materi: Tugas[];
} {
  return {
    own: bySource(all, "jadwal").map((t) => keTugas(t, "jadwal")),
    pribadi: bySource(all, "pribadi").map((t) => keTugas(t, "pribadi")),
    roadmap: bySource(all, "roadmap").map((t) => ({
      ...keTugas(t, "roadmap"),
      tag: t.phaseTitle ?? t.tag ?? "ROADMAP",
    })),
    materi: bySource(all, "materi").map((t) => keTugas(t, "materi")),
  };
}

/**
 * Susunan simpan jadwal (murni, testable).
 * Jadwal MENULIS slice jadwal + pribadi, dan MENYINKRONKAN perubahan
 * (status, deadline, prioritas, judul, catatan, subtugas) untuk item roadmap
 * dan materi yang tampil di papan — tanpa duplikat dan tanpa merusak sumber
 * lain (planner) yang tidak tampil di sini.
 */
export function susunSimpanJadwal(
  all: SharedTask[],
  tugas: Tugas[]
): {
  keep: SharedTask[];
  jadwalSlice: SharedTask[];
  sinkronSlice: SharedTask[];
} {
  const tampil = new Map(tugas.map((t) => [t.id, t]));
  const sumberTulis = new Set<TaskSource>(["jadwal", "pribadi"]);
  const sumberSinkron = new Set<TaskSource>(["roadmap", "materi"]);
  // Setiap id yang sudah dimiliki sumber lain (roadmap/materi/planner) TIDAK
  // boleh ditulis ulang sebagai kartu jadwal — jaga dari duplikat kepemilikan.
  const idsAsing = new Set(
    all
      .filter((t) => t.source !== "jadwal" && t.source !== "pribadi")
      .map((t) => t.id)
  );

  const jadwalSlice: SharedTask[] = tugas
    .filter((t) => sumberTulis.has(t.sumber as TaskSource) && !idsAsing.has(t.id))
    .map((t) => {
      const asal = all.find((a) => a.id === t.id);
      return {
        id: t.id,
        source: t.sumber as TaskSource,
        status: t.status,
        prioritas: t.prioritas,
        title: t.judul,
        description: t.deskripsi,
        dueDate: t.deadline,
        tag: t.tag,
        progres: t.progres,
        catatan: t.catatan,
        notes: t.notes || undefined,
        subtasks: t.subtasks.length > 0 ? t.subtasks : undefined,
        // Kartu menang atas asal untuk flag aksi (arsip/demo dariklik di
        // papan); asal hanya warisan bila kartu tak menyebut (undefined).
        // Tanpa ini arsip/demo hasil klik hilang pada simpanan berikutnya.
        ...(t.arsip === true || (t.arsip === undefined && asal?.arsip)
          ? { arsip: true as const }
          : {}),
        ...(t.status === "done"
          ? { completedAt: asal?.completedAt ?? new Date().toISOString() }
          : {}),
        // Tautan seri berulang: kartu menang (seri baru hidup di state),
        // asal hanya warisan. Tanpa ini kejadian lepas dari induknya
        // pada simpanan pertama setelah seri dibuat.
        ...(t.berulang ?? asal?.berulang
          ? { berulang: (t.berulang ?? asal?.berulang) as InfoBerulang }
          : {}),
        // Flag contoh dipertahankan (kalau tidak, contoh jadi tak terbedakan
        // dari data pengguna setiap papan disimpan).
        ...(t.demo === true || (t.demo === undefined && asal?.demo)
          ? { demo: true as const }
          : {}),
        createdAt: asal?.createdAt ?? new Date().toISOString(),
      };
    });

  // Sinkronkan field yang diubah dari papan untuk sumber bersama (roadmap/materi),
  // source dan id tetap milik aslinya.
  const sinkronSlice: SharedTask[] = all
    .filter((t) => tampil.has(t.id) && sumberSinkron.has(t.source))
    .map((orig) => {
      const t = tampil.get(orig.id) as Tugas;
      return {
        ...orig,
        status: t.status,
        prioritas: t.prioritas,
        dueDate: t.deadline || undefined,
        title: t.judul,
        description: t.deskripsi,
        tag: orig.tag ?? t.tag,
        progres: t.progres,
        notes: t.notes || undefined,
        subtasks: t.subtasks.length > 0 ? t.subtasks : undefined,
        // Arsip dari kartu (klik di papan) menang atas store; false eksplisit
        // memulihkan, undefined mewarisi asal.
        ...(t.arsip === true || (t.arsip === undefined && orig.arsip)
          ? { arsip: true as const }
          : { arsip: undefined }),
      };
    });

  // Slice yang tidak tampil di papan (planner, roadmap/materi tak ter-filter)
  // dibiarkan apa adanya.
  const keep = all.filter(
    (t) => !tampil.has(t.id) && !sumberTulis.has(t.source)
  );
  return { keep, jadwalSlice, sinkronSlice };
}

/** Gabungan semua item yang tampil di papan (untuk state React). */
export function semuaTampil(part: ReturnType<typeof bagiTampilJadwal>): Tugas[] {
  return [...part.own, ...part.pribadi, ...part.roadmap, ...part.materi];
}

/**
 * Papan kosong = papan bersih (tak ada seed otomatis). Contoh hanya masuk
 * lewat tombol "Coba contoh" — berflag demo, berlabel di UI, dan terpisah
 * dari data pengguna (hapus contoh tak menyentuh record non-demo).
 */
export function pilihTugasAwal(tampil: Tugas[]): Tugas[] {
  return tampil;
}

/** Ada kartu contoh di papan? */
export function adaContoh(list: Tugas[]): boolean {
  return list.some((t) => t.demo === true);
}

/** Buang kartu contoh saja — data pengguna utuh. */
export function hapusContoh(list: Tugas[]): Tugas[] {
  return list.filter((t) => t.demo !== true);
}

/**
 * Contoh untuk dicoba (salinan baru tiap panggil — tenggat relatif ke hari
 * ini, bukan memori modul basi). ID stabil awalan "contoh-" supaya mudah
 * dikenali dan tak menabrak ID data pengguna (awalan sumber + acak).
 */
export function tugasContoh(): Tugas[] {
  const kini = new Date();
  return [
    tugasDasar({
      id: "contoh-erd",
      judul: "Perbaiki diagram relasi ERD sesuai modul MySQL 8",
      tag: "BAB 3",
      prioritas: "tinggi",
      deadline: "Besok",
      demo: true,
    }),
    tugasDasar({
      id: "contoh-lampiran",
      judul: "Format tata letak lampiran kuesioner Google Form",
      tag: "LAMPIRAN",
      prioritas: "normal",
      deadline: fmtSingkat(geserHari(kini, 4)),
      demo: true,
    }),
    tugasDasar({
      id: "contoh-paper",
      judul: "Review 3 paper IEEE tentang transformer NLP",
      tag: "LITERATUR",
      prioritas: "normal",
      deadline: fmtSingkat(geserHari(kini, 6)),
      demo: true,
    }),
    tugasDasar({
      id: "contoh-matriks",
      judul: "Matriks revisi tanggapan komentar Dosen Penguji 1",
      tag: "REVISI SEMHAS",
      prioritas: "sedang",
      status: "doing",
      deadline: fmtSingkat(geserHari(kini, 2)),
      progres: 75,
      catatan: 4,
      demo: true,
    }),
    tugasDasar({
      id: "contoh-ba",
      judul: "Tanda tangan Berita Acara Pelaksanaan Seminar",
      tag: "ADMINISTRASI",
      prioritas: "normal",
      status: "done",
      deadline: `Tuntas ${fmtSingkat(geserHari(kini, -2))}`,
      progres: 100,
      demo: true,
    }),
    tugasDasar({
      id: "contoh-cetak",
      judul: "Cetak draft naskah sidang jilid lakban 3 eksemplar",
      tag: "LOGISTIK",
      prioritas: "normal",
      status: "done",
      deadline: `Tuntas ${fmtSingkat(geserHari(kini, -4))}`,
      progres: 100,
      demo: true,
    }),
  ];
}

const KEY_TUGAS = "cademy:jadwal-tugas";
const KEY_AGENDA = "cademy:jadwal-agenda";

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
    inisial: "SD",
    tuntas: false,
    contoh: true,
  },
  {
    id: "ag-revisi",
    judul: "Tenggat Revisi Naskah Semhas",
    deskripsi:
      "Upload PDF final beserta bukti persetujuan tanda tangan kaprodi ke portal SIAKAD.",
    prioritas: "sedang",
    kategori: "Sedang • Batas Akhir",
    badge: "H-2 SUBMIT",
    badgeTone: "danger",
    jam: "23:59 WIB",
    lokasi: "Portal Akademik",
    inisial: "SA",
    tuntas: false,
    contoh: true,
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
    inisial: "DN",
    tuntas: false,
    contoh: true,
  },
];

function tugasDasar(t: Partial<Tugas> & Pick<Tugas, "id" | "judul">): Tugas {
  return {
    deskripsi: "",
    tag: "UMUM",
    prioritas: "sedang",
    status: "todo",
    deadline: "",
    progres: 0,
    catatan: 0,
    notes: "",
    subtasks: [],
    sumber: "jadwal",
    ...t,
  };
}

const DEFAULT_TUGAS: Tugas[] = tugasContoh();

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

/** Warna teks label prioritas (referensi jadwal_task_board: tinggi=brick, sedang=navy, normal=muted). */
function labelPrioritas(p: Prioritas): string {
  if (p === "tinggi") return "text-brand-brick";
  if (p === "sedang") return "text-brand-navy";
  return "text-brand-muted";
}

/** Ribbon tag kartu kanban: kunyi untuk tag revisi/lampiran, sisanya panel sky. */
function tagTone(tag: string): string {
  return tag === "REVISI SEMHAS" || tag === "LAMPIRAN"
    ? "bg-brand-yellow text-brand-navy"
    : "bg-brand-panel text-brand-navy";
}

/** Badge agenda: confirm=panel/teks biru, danger=putih/teks brick, room=panel/teks navy. */
function badgeAgenda(tone: Agenda["badgeTone"]): string {
  if (tone === "danger") return "bg-white text-brand-brick";
  if (tone === "confirm") return "bg-brand-panel text-brand-blue";
  return "bg-brand-panel text-brand-navy";
}

const URUTAN: Status[] = ["todo", "doing", "done"];
const LABEL_STATUS: Record<Status, string> = {
  todo: "Belum Dikerjakan",
  doing: "Sedang Dikerjakan",
  done: "Selesai",
};

export default function JadwalView() {
  const [agenda, setAgenda] = React.useState<Agenda[]>(DEFAULT_AGENDA);
  const [tugas, setTugas] = React.useState<Tugas[]>(DEFAULT_TUGAS);
  const [hariAktif, setHariAktif] = React.useState<number>(() => indeksHariIni());
  const [filter, setFilter] = React.useState<FilterCepat>("semua");
  const [cari, setCari] = React.useState("");
  const [formTerbuka, setFormTerbuka] = React.useState(false);
  const [judul, setJudul] = React.useState("");
  const [deskripsi, setDeskripsi] = React.useState("");
  const [tag, setTag] = React.useState("BAB 4");
  const [prioritas, setPrioritas] = React.useState<Prioritas>("sedang");
  const [deadline, setDeadline] = React.useState("");
  const [statusBaru, setStatusBaru] = React.useState<Status>("todo");
  const [ulang, setUlang] = React.useState<"tidak" | FrekuensiBerulang>("tidak");
  const [ulangInterval, setUlangInterval] = React.useState("3");
  const [ulangJumlah, setUlangJumlah] = React.useState("5");
  const [toast, setToast] = React.useState<string | null>(null);
  const [siap, setSiap] = React.useState(false);
  const [undoTersedia, setUndoTersedia] = React.useState(false);
  const [undoLabel, setUndoLabel] = React.useState<string | null>(null);
  const [subTerbuka, setSubTerbuka] = React.useState<string | null>(null);
  const [subJudul, setSubJudul] = React.useState("");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = React.useState<string | null>(null);
  const [ccQ, setCcQ] = React.useState("");
  const [ccKondisi, setCcKondisi] = React.useState<KondisiCari>("semua");
  const [blnTahun, setBlnTahun] = React.useState(() => {
    const k = new Date();
    return { tahun: k.getFullYear(), bulan: k.getMonth() };
  });
  const [tglPilih, setTglPilih] = React.useState<string | null>(null);
  const fileImporRef = React.useRef<HTMLInputElement>(null);
  const toastTimer = React.useRef<number | null>(null);
  // ID yang pernah dikenal tab ini (mount + tiap tulis/baca segar).
  // Bedakan "dihapus pengguna" (dikenal, boleh hilang) dari "ditambah tab
  // lain" (asing, wajib dipertahankan) saat slice ditulis ulang utuh.
  const dikenalRef = React.useRef<Set<string>>(new Set());
  const firstInputRef = React.useRef<HTMLInputElement>(null);
  const dialogRef = React.useRef<HTMLFormElement>(null);
  const pemicuRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setAgenda(load<Agenda[]>(KEY_AGENDA, DEFAULT_AGENDA));
    // Papan bersih default: tak ada seed otomatis. Contoh hanya lewat
    // tombol "Coba contoh" (berflag demo, terpisah dari data pengguna).
    const segar = loadTasks();
    const part = bagiTampilJadwal(segar);
    const tampil = pilihTugasAwal(semuaTampil(part));
    setTugas(tampil);
    dikenalRef.current = new Set(segar.map((t) => t.id));
    setSiap(true);
  }, []);

  React.useEffect(() => {
    if (!siap) return;
    try {
      const all = loadTasks();
      // Jadwal menulis slice jadwal+pribadi dan menyinkronkan perubahan
      // roadmap/materi yang tampil di papan (satu sumber kebenaran).
      // Record asing (ditambah tab lain, belum dikenal) ikut dibawa agar
      // tulis-ulang dari state tak membuangnya.
      const { keep, jadwalSlice, sinkronSlice } = susunSimpanJadwal(all, tugas);
      const asing = asingBaru(all, dikenalRef.current).filter(
        (t) => t.source === "jadwal" || t.source === "pribadi"
      );
      const tulis = [...keep, ...jadwalSlice, ...sinkronSlice, ...asing];
      // Lewati tulis bila sama (anti gema lintas-tab: tulis = event =
      // refresh = tulis lagi, tanpa henti).
      if (!samaDaftar(tulis, all)) {
        saveTasks(tulis);
        localStorage.setItem(KEY_TUGAS, JSON.stringify(jadwalSlice));
      }
      tulis.forEach((t) => dikenalRef.current.add(t.id));
    } catch {
      /* abaikan */
    }
  }, [tugas, siap]);

  // Segarkan papan saat tab kembali fokus / storage berubah (pola sama
  // seperti planner): suntingan tab lain tak lagi tertimpa kartu basi.
  React.useEffect(() => {
    if (!siap) return;
    function segar() {
      try {
        const segarTasks = loadTasks();
        // Kembalikan prev bila sama: React batal render → efek simpan tak
        // ikut menyala → gema lintas-tab berhenti setelah konvergen.
        setTugas((dulu) => {
          const jadi = semuaTampil(bagiTampilJadwal(segarTasks));
          return JSON.stringify(jadi) === JSON.stringify(dulu) ? dulu : jadi;
        });
        segarTasks.forEach((t) => dikenalRef.current.add(t.id));
      } catch {
        /* abaikan */
      }
    }
    window.addEventListener("focus", segar);
    window.addEventListener("storage", segar);
    return () => {
      window.removeEventListener("focus", segar);
      window.removeEventListener("storage", segar);
    };
  }, [siap]);

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
    pemicuRef.current = document.activeElement as HTMLElement | null;
    firstInputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFormTerbuka(false);
        return;
      }
      // Trap-fokus sederhana: Tab berputar di dalam dialog.
      if (e.key !== "Tab") return;
      const box = dialogRef.current;
      if (!box) return;
      const daftar = Array.from(
        box.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      );
      if (daftar.length === 0) {
        e.preventDefault();
        return;
      }
      const awal = daftar[0];
      const akhir = daftar[daftar.length - 1];
      if (e.shiftKey && document.activeElement === awal) {
        e.preventDefault();
        akhir.focus();
      } else if (!e.shiftKey && document.activeElement === akhir) {
        e.preventDefault();
        awal.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    // Kunci scroll latar agar modal saja yang bergulir (tanpa lib baru).
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
      pemicuRef.current?.focus?.();
    };
  }, [formTerbuka]);

  // Arsip disembunyikan dari papan & statistik (hanya di seksi Arsip).
  const aktif = tugas.filter((t) => !t.arsip);
  const arsip = tugas.filter((t) => t.arsip);
  // Contoh tampil berlabel di papan; progres % hanya datamu
  // (contoh tak dihitung — terpisah dari data pengguna).
  const milikku = aktif.filter((t) => !t.demo);
  const adaDemo = adaContoh(tugas);
  const todo = aktif.filter((t) => t.status === "todo").length;
  const doing = aktif.filter((t) => t.status === "doing").length;
  const done = aktif.filter((t) => t.status === "done").length;
  const terlambat = aktif.filter((t) =>
    tugasTerlambat(t.status, t.deadline)
  ).length;
  const persen = milikku.length === 0 ? 0 : Math.round((milikku.filter((t) => t.status === "done").length / milikku.length) * 100);

  const cocokFilter = React.useCallback(
    (t: Tugas): boolean =>
      cocokFilterCepat(
        {
          judul: t.judul,
          tag: t.tag,
          prioritas: t.prioritas,
          status: t.status,
          dueDate: t.deadline,
        },
        filter,
        cari
      ),
    [filter, cari]
  );

  // Cari Semua Tugas: baca store bersama apa adanya (semua sumber, arsip
  // ikut hanya bila kondisi arsip). Hasil menunjuk record yang sama.
  const hasilCari: EntriCari[] = React.useMemo(() => {
    if (!siap) return [];
    try {
      return cariLintasTugas(entriCariSemua(loadTasks()), {
        q: ccQ,
        kondisi: ccKondisi,
      });
    } catch {
      return [];
    }
  }, [siap, tugas, ccQ, ccKondisi]);

  function resetCari(): void {
    setCcQ("");
    setCcKondisi("semua");
  }

  // Kalender bulanan: kisi Senin–Minggu murni (waktu lokal, tanpa UTC).
  // Hanya tenggat ISO yang cocok yang dihitung — tanpa-tenggat tak dipalsukan.
  const kalenderSel = React.useMemo(
    () => gridKalender(blnTahun.tahun, blnTahun.bulan),
    [blnTahun]
  );
  const namaBulan = new Date(blnTahun.tahun, blnTahun.bulan, 1).toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" }
  );
  const isoHariIni = toISODate(new Date());

  function geserBulan(delta: number): void {
    setBlnTahun((b) => {
      const d = new Date(b.tahun, b.bulan + delta, 1);
      return { tahun: d.getFullYear(), bulan: d.getMonth() };
    });
  }

  function keHariIni(): void {
    const k = new Date();
    setBlnTahun({ tahun: k.getFullYear(), bulan: k.getMonth() });
    setTglPilih(toISODate(k));
  }

  const tugasTglPilih = tglPilih
    ? aktif.filter((t) => parseTanggalISO(t.deadline) === tglPilih)
    : [];

  const agendaTampil = agenda.filter((a) =>
    cocokFilterCepat(
      {
        judul: a.judul,
        tag: a.deskripsi,
        prioritas: a.prioritas,
        status: a.tuntas ? "done" : "todo",
      },
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

  // Semua mutasi papan cukup mengubah state lokal (Tugas[]); efek [tugas,siap]
  // menulisnya ke store bersama. Riwayat undo menyimpan snapshot store.
  function catatUndo(label: string): void {
    pushRiwayat(label, loadTasks());
    setUndoTersedia(bisaUndo());
    setUndoLabel(labelUndo());
  }

  function geserStatus(id: string, arah: -1 | 1): void {
    // Semua sumber bisa digeser — perubahan tersinkron ke store bersama.
    catatUndo("geser status tugas");
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
    tampilToast(arah > 0 ? "Kartu digeser maju satu kolom!" : "Kartu dikembalikan!");
  }

  function setStatusLangsung(id: string, status: Status): void {
    catatUndo("ubah status tugas");
    setTugas((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              progres:
                status === "done" ? 100 : status === "todo" ? 0 : t.progres || 50,
            }
          : t
      )
    );
    tampilToast(`Status diubah ke ${LABEL_STATUS[status]}.`);
  }

  function hapusTugas(id: string): void {
    catatUndo("hapus tugas");
    setTugas((list) => list.filter((t) => t.id !== id));
    setKonfirmasiHapus(null);
    tampilToast("Tugas dihapus — bisa dibatalkan dengan Urungkan!");
  }

  function tandaiArsip(list: Tugas[], id: string, nilai: boolean): Tugas[] {
    return list.map((t) => (t.id === id ? { ...t, arsip: nilai } : t));
  }

  function arsipkan(id: string): void {
    catatUndo("arsipkan tugas");
    setTugas((list) => tandaiArsip(list, id, true));
    tampilToast("Tugas diarsipkan — lihat seksi Arsip untuk memulihkan!");
  }

  function pulihkanArsip(id: string): void {
    catatUndo("pulihkan arsip");
    setTugas((list) => tandaiArsip(list, id, false));
    tampilToast("Tugas dikembalikan ke papan!");
  }

  function hapusPermanenArsip(id: string): void {
    const target = tugas.find((t) => t.id === id);
    if (
      !window.confirm(
        `Hapus permanen "${target?.judul ?? "tugas ini"}" dari Arsip? Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    catatUndo("hapus permanen");
    setTugas((list) => list.filter((t) => t.id !== id));
    tampilToast("Tugas dihapus permanen dari Arsip.");
  }

  // Aksi hasil Cari Semua Tugas: tulis langsung ke store bersama (sama
  // record, tanpa salinan), lalu segarkan papan.
  function segarkanDariStore(): void {
    try {
      const segar = loadTasks();
      setTugas((dulu) => {
        const jadi = semuaTampil(bagiTampilJadwal(segar));
        return JSON.stringify(jadi) === JSON.stringify(dulu) ? dulu : jadi;
      });
      segar.forEach((t) => dikenalRef.current.add(t.id));
    } catch {
      /* abaikan */
    }
  }

  function geserHasilLintas(id: string, arah: -1 | 1): void {
    catatUndo("geser status tugas");
    try {
      const all = loadTasks();
      const cur = all.find((t) => t.id === id);
      if (!cur || cur.arsip) return;
      const next = URUTAN[Math.min(2, Math.max(0, URUTAN.indexOf(cur.status) + arah))];
      saveTasks(setTaskStatus(all, id, next));
      segarkanDariStore();
      tampilToast(arah > 0 ? "Kartu digeser maju satu kolom!" : "Kartu dikembalikan!");
    } catch {
      /* abaikan */
    }
  }

  function pulihkanHasilLintas(id: string): void {
    catatUndo("pulihkan arsip");
    try {
      saveTasks(pulihkanTugas(loadTasks(), id));
      segarkanDariStore();
      tampilToast("Tugas dikembalikan ke papan!");
    } catch {
      /* abaikan */
    }
  }

  function ubahProgres(id: string, nilai: number): void {
    const v = Math.min(100, Math.max(0, Math.round(nilai)));
    setTugas((list) => list.map((t) => (t.id === id ? { ...t, progres: v } : t)));
  }

  function ubahField(
    id: string,
    patch: Partial<Pick<Tugas, "judul" | "deskripsi" | "deadline" | "prioritas" | "tag" | "notes">>
  ): void {
    catatUndo("edit tugas");
    setTugas((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function subToggle(id: string, subId: string): void {
    catatUndo("ubah subtugas");
    setTugas((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              subtasks: (t.subtasks ?? []).map((s) =>
                s.id === subId ? { ...s, done: !s.done } : s
              ),
            }
          : t
      )
    );
  }

  function subTambah(id: string, title: string): void {
    if (!title.trim()) return;
    catatUndo("tambah subtugas");
    setTugas((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              subtasks: [
                ...(t.subtasks ?? []),
                { id: uid("sub"), title: title.trim(), done: false },
              ],
            }
          : t
      )
    );
  }

  function subHapus(id: string, subId: string): void {
    catatUndo("hapus subtugas");
    setTugas((list) =>
      list.map((t) =>
        t.id === id
          ? { ...t, subtasks: (t.subtasks ?? []).filter((s) => s.id !== subId) }
          : t
      )
    );
  }

  function undo(): void {
    const kembali = undoTask();
    if (!kembali) {
      tampilToast("Tidak ada aksi yang bisa dibatalkan.");
      return;
    }
    const tampil = semuaTampil(bagiTampilJadwal(kembali));
    setTugas(tampil);
    saveTasks(kembali);
    dikenalRef.current = new Set(kembali.map((t) => t.id));
    setUndoTersedia(bisaUndo());
    setUndoLabel(labelUndo());
    tampilToast("Aksi terakhir dibatalkan.");
  }

  function eksporData(): void {
    const semua = loadTasks();
    const json = JSON.stringify(buatCadangan(semua), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cademy-tugas-${toISODate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    tampilToast(`Cadangan ${semua.length} tugas diunduh.`);
  }

  async function imporData(file: File): Promise<void> {
    const teks = await file.text();
    const hasil = bacaCadangan(teks);
    if (!hasil.ok) {
      tampilToast(`Impor gagal: ${hasil.error}`);
      return;
    }
    const aktif = loadTasks();
    const digabung = gabungCadangan(aktif, hasil.tasks, "gabung");
    saveTasks(digabung);
    setTugas(semuaTampil(bagiTampilJadwal(digabung)));
    dikenalRef.current = new Set(digabung.map((t) => t.id));
    tampilToast(`${hasil.total} tugas dari file diterapkan (data lama aman).`);
  }

  function tambahTugas(e: React.FormEvent): void {
    e.preventDefault();
    const nama = judul.trim();
    if (!nama) {
      tampilToast("Isi judul tugas terlebih dahulu!");
      return;
    }
    if (ulang !== "tidak") {
      tambahSeri(nama);
      return;
    }
    const baru = createTask({
      id: uid("jadwal"),
      source: "jadwal",
      title: nama,
      description: deskripsi.trim(),
      tag: tag.trim().toUpperCase().slice(0, 16) || "UMUM",
      prioritas,
      status: statusBaru,
      dueDate: deadline.trim(),
    });
    setTugas((list) => [
      {
        ...keTugas(baru, "jadwal"),
        progres: taskProgress(baru),
        catatan: 0,
      },
      ...list,
    ]);
    tutupFormTambah();
    tampilToast(
      statusBaru === "todo"
        ? "Tugas baru masuk kolom Belum Dikerjakan!"
        : `Tugas baru masuk kolom ${LABEL_STATUS[statusBaru]}!`
    );
  }

  function tutupFormTambah(): void {
    setJudul("");
    setDeskripsi("");
    setDeadline("");
    setFormTerbuka(false);
    setStatusBaru("todo");
    setUlang("tidak");
    setUlangInterval("3");
    setUlangJumlah("5");
  }

  // Tugas berulang: validasi jujur, tiap kejadian tugas sendiri.
  // Mulai = tenggat yang dipilih (wajib). Tanpa scheduler: kejadian
  // di-materialisasi di depan (maks 31 termasuk induk).
  function tambahSeri(nama: string): void {
    if (ulang === "tidak") return;
    const mulai = deadline.trim();
    if (!mulai) {
      tampilToast("Pilih tenggat dulu sebagai tanggal mulai seri!");
      return;
    }
    const jumlah = Math.floor(Number(ulangJumlah));
    if (!Number.isInteger(jumlah) || jumlah < 2 || jumlah > 31) {
      tampilToast("Jumlah kejadian harus 2–31!");
      return;
    }
    let intervalHari: number | undefined;
    if (ulang === "interval") {
      intervalHari = Math.floor(Number(ulangInterval));
      if (!Number.isInteger(intervalHari) || intervalHari < 1 || intervalHari > 365) {
        tampilToast("Interval harus bilangan bulat 1–365 hari!");
        return;
      }
    }
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: nama,
      description: deskripsi.trim(),
      tag: tag.trim().toUpperCase().slice(0, 16) || "UMUM",
      prioritas,
      frekuensi: ulang,
      ...(intervalHari !== undefined ? { intervalHari } : {}),
      mulai,
      jumlah,
    });
    if (!hasil.ok) {
      tampilToast(hasil.galat);
      return;
    }
    const kartu: Tugas[] = hasil.tugas.map((t) => ({
      ...keTugas(t, "jadwal"),
      progres: taskProgress(t),
      catatan: 0,
    }));
    setTugas((list) => [...kartu, ...list]);
    tutupFormTambah();
    tampilToast(`Seri berulang dibuat: ${kartu.length} kejadian, tiap tugas sendiri!`);
  }

  function hapusSeriTugas(indukId: string, judulSeri: string): void {
    if (
      !window.confirm(
        `Hapus 1 seri utuh "${judulSeri}" (semua kejadiannya)? Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    catatUndo("hapus seri berulang");
    setTugas((list) => list.filter((t) => t.id !== indukId && t.indukId !== indukId));
    tampilToast("Seri berulang dihapus — bisa dibatalkan dengan Urungkan!");
  }

  // Contoh: opt-in eksplisit, berflag demo, hapus tak sentuh data asli.
  // Anti-ganda: klik "Coba contoh" berulang tak menumpuk kartu.
  function muatContoh(): void {
    if (adaContoh(tugas)) {
      tampilToast("Contoh sudah ada di papan!");
      return;
    }
    catatUndo("muat contoh");
    setTugas((list) => (adaContoh(list) ? list : [...tugasContoh(), ...list]));
    tampilToast("Contoh dimuat — berlabel Demo, bebas diubah/dihapus!");
  }

  function hapusSemuaContoh(): void {
    const n = tugas.filter((t) => t.demo).length;
    if (n === 0) return;
    if (
      !window.confirm(
        `Hapus ${n} kartu contoh (Demo)? Datamu yang asli tidak ikut terhapus.`
      )
    )
      return;
    catatUndo("hapus contoh");
    setTugas((list) => hapusContoh(list));
    setAgenda((list) => list.filter((a) => !a.contoh));
    tampilToast("Contoh dihapus — datamu utuh.");
  }

  function hapusSemuaArsip(): void {    const n = arsip.length;
    if (n === 0) return;
    if (
      !window.confirm(
        `Hapus permanen ${n} tugas dari Arsip? Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    catatUndo("kosongkan arsip");
    setTugas((list) => list.filter((t) => !t.arsip));
    tampilToast("Arsip dikosongkan.");
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

  const renderKartu = (t: Tugas): React.ReactNode => {
    return (
    <article
      key={t.id}
      className="flex flex-col gap-2 rounded-2xl border-[3px] border-black bg-white p-3 shadow-brutal"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-full border-[3px] border-black px-2 py-0.5 font-label text-[11px] font-extrabold uppercase tracking-wider shadow-[1px_1px_0px_#000000] ${tagTone(t.tag)}`}
        >
          {t.tag}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {tugasTerlambat(t.status, t.deadline) && (
            <span className="rounded-full border-2 border-black bg-brand-brick px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-wider text-white">
              Terlambat
            </span>
          )}
          {t.berulangLabel && (
            <span
              title="Tugas berulang — tiap kejadian tugas sendiri"
              className="shrink-0 rounded-full border-2 border-black bg-brand-yellow px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-wider text-black"
            >
              🔁 {t.berulangLabel}
            </span>
          )}
          <span className="shrink-0 rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-wider text-brand-navy shadow-[2px_2px_0px_#000000]">
            {t.sumber === "roadmap" ? "Roadmap" : t.sumber === "materi" ? "Materi" : t.sumber === "pribadi" ? "Pribadi" : "Jadwal"}
          </span>
          {t.demo && (
            <span
              title="Data contoh — bukan datamu. Hapus sekaligus dari banner Demo."
              className="shrink-0 rounded-full border-2 border-dashed border-black bg-white px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-wider text-brand-muted"
            >
              Demo
            </span>
          )}
          {t.status === "done" ? (
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none text-brand-blue">
              verified
            </span>
          ) : (
            <span
              aria-hidden
              className="material-symbols-outlined shrink-0 cursor-grab text-[18px] leading-none text-brand-muted"
            >
              drag_indicator
            </span>
          )}
        </span>
      </div>
      {editId === t.id ? (
        <div className="flex flex-col gap-2">
          <label className="block">
            <span className="mb-1 block font-label text-[11px] font-extrabold uppercase text-brand-navy">Judul</span>
            <input
              value={t.judul}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                ubahField(t.id, { judul: e.target.value })
              }
              className="h-10 w-full rounded-lg border-2 border-black bg-white px-2 font-body text-sm text-brand-navy outline-none focus:bg-brand-paper"
              aria-label={`Judul ${t.judul}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-label text-[11px] font-extrabold uppercase text-brand-navy">Catatan</span>
            <textarea
              value={t.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                ubahField(t.id, { notes: e.target.value })
              }
              rows={2}
              className="w-full rounded-lg border-2 border-black bg-white px-2 py-1.5 font-body text-sm text-brand-navy outline-none focus:bg-brand-paper"
              aria-label={`Catatan ${t.judul}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-label text-[11px] font-extrabold uppercase text-brand-navy">Tenggat</span>
            <input
              type="date"
              value={/^\d{4}-\d{2}-\d{2}/.test(t.deadline) ? t.deadline.slice(0, 10) : ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                ubahField(t.id, { deadline: e.target.value })
              }
              className="h-10 w-full rounded-lg border-2 border-black bg-white px-2 font-body text-sm text-brand-navy outline-none focus:bg-brand-paper"
              aria-label={`Tenggat ${t.judul}`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["tinggi", "sedang", "rendah", "normal"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => ubahField(t.id, { prioritas: p })}
                aria-pressed={t.prioritas === p}
                className={`rounded-full border-2 border-black px-2.5 py-1 font-label text-[11px] font-extrabold uppercase ${
                  t.prioritas === p ? "bg-brand-blue text-white" : "bg-white text-brand-navy"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEditId(null)}
            className="self-start rounded-full border-2 border-black bg-brand-yellow px-3 py-1.5 font-label text-[11px] font-extrabold uppercase text-black"
          >
            Selesai edit
          </button>
        </div>
      ) : (
        <>
      <p
        className={`font-body text-base font-medium leading-snug text-brand-navy ${
          t.status === "done" ? "line-through opacity-70" : ""
        }`}
      >
        {t.judul}
      </p>
      {t.deskripsi ? (
        <p className="font-body text-sm leading-snug text-brand-muted">{t.deskripsi}</p>
      ) : null}
      {t.notes ? (
        <p className="rounded-lg border-2 border-dashed border-black/25 bg-brand-paper px-2 py-1.5 font-body text-xs text-brand-muted">
          {t.notes}
        </p>
      ) : null}
      {t.status === "doing" && (
        <>
          <div className="my-1 h-2 w-full overflow-hidden rounded-full border-2 border-black bg-brand-panel shadow-[1px_1px_0px_#000000]">
            <div
              className="h-full bg-brand-blue transition-all"
              style={{ width: `${t.progres}%` }}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-label text-xs font-bold text-brand-blue">{t.progres}% Selesai</span>
            <span className="flex items-center gap-1 font-label text-xs text-brand-muted">
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[15px] leading-none">
                chat
              </span>
              {t.catatan} Catatan
            </span>
          </div>
          <label className="flex items-center gap-2">
            <span className="sr-only">Progres {t.judul}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={t.progres}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                ubahProgres(t.id, Number(e.target.value))
              }
              aria-label={`Progres ${t.judul}`}
              className="h-2 w-full cursor-pointer accent-[#0E4A6E]"
            />
          </label>
        </>
      )}
      {t.status === "done" ? (
        <span className="font-label text-xs text-brand-muted">
          {t.deadline || "Tuntas"}
        </span>
      ) : (
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 font-label text-xs text-brand-muted">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[15px] leading-none">
              event
            </span>
            {t.deadline}
          </span>
          <span
            className={`h-2 w-2 rounded-full ${dotPrioritas(t.prioritas)}`}
            title={t.prioritas}
          />
        </div>
      )}
      {t.subtasks.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg border-2 border-black/20 bg-brand-paper p-2">
          <div className="flex items-center justify-between">
            <span className="font-label text-[11px] font-extrabold uppercase text-brand-navy">
              Subtugas {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
            </span>
            <div className="h-2 w-24 overflow-hidden rounded-full border border-black bg-white">
              <div
                className="h-full bg-brand-blue"
                style={{
                  width: `${Math.round(
                    (t.subtasks.filter((s) => s.done).length / t.subtasks.length) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
          {t.subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => subToggle(t.id, s.id)}
                className="h-4 w-4 shrink-0 accent-black"
                aria-label={`Subtugas: ${s.title}`}
              />
              <span className={`min-w-0 flex-1 text-xs ${s.done ? "line-through opacity-70" : ""}`}>
                {s.title}
              </span>
              <button
                type="button"
                onClick={() => subHapus(t.id, s.id)}
                aria-label={`Hapus subtugas: ${s.title}`}
                className="shrink-0 text-brand-brick"
              >
                <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
      {subTerbuka === t.id && (
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            subTambah(t.id, subJudul);
            setSubJudul("");
          }}
          className="flex items-center gap-2"
        >
          <input
            value={subJudul}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubJudul(e.target.value)}
            placeholder="Judul subtugas…"
            className="h-9 min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-2 font-body text-xs outline-none focus:bg-brand-paper"
            aria-label={`Subtugas baru untuk ${t.judul}`}
          />
          <button type="submit" className="h-9 shrink-0 rounded-full border-2 border-black bg-brand-yellow px-3 font-label text-[11px] font-extrabold uppercase">
            Tambah
          </button>
        </form>
      )}
      {konfirmasiHapus === t.id ? (
        <div className="rounded-lg border-2 border-black bg-brand-brick p-2.5 text-white">
          <p className="font-label text-[11px] font-extrabold uppercase">
            Hapus “{t.judul}”?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setKonfirmasiHapus(null)}
              className="h-9 flex-1 rounded-full border-2 border-black bg-white font-label text-[11px] font-extrabold uppercase text-brand-navy"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => hapusTugas(t.id)}
              className="h-9 flex-1 rounded-full border-2 border-black bg-brand-navy font-label text-[11px] font-extrabold uppercase"
            >
              Hapus
            </button>
          </div>
        </div>
      ) : (
      <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-black/10 pt-2">
        <button
          type="button"
          onClick={() => geserStatus(t.id, -1)}
          disabled={t.status === "todo"}
          aria-label={`Mundur: ${t.judul}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-brand-navy shadow-[2px_2px_0px_#000000] transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30"
        >
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">
            chevron_left
          </span>
        </button>
        <button
          type="button"
          onClick={() => geserStatus(t.id, 1)}
          aria-label={`Maju: ${t.judul}`}
          className="flex h-11 flex-1 items-center justify-center gap-1 rounded-full border-2 border-black bg-brand-blue px-2 font-label text-[11px] font-extrabold uppercase text-white shadow-[2px_2px_0px_#000000] transition-all hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {t.status === "todo" ? (
            <>
              Kerjakan
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">
                arrow_forward
              </span>
            </>
          ) : (
            <>
              Selesaikan
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">
                check
              </span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditId(editId === t.id ? null : t.id);
            setSubTerbuka(null);
          }}
          aria-label={`Edit: ${t.judul}`}
          aria-pressed={editId === t.id}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
            editId === t.id ? "bg-brand-yellow text-black" : "bg-white text-brand-navy"
          }`}
        >
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">
            edit
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTerbuka(subTerbuka === t.id ? null : t.id);
            setEditId(null);
          }}
          aria-label={`Subtugas: ${t.judul}`}
          aria-pressed={subTerbuka === t.id}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
            subTerbuka === t.id ? "bg-brand-yellow text-black" : "bg-white text-brand-navy"
          }`}
        >
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">
            checklist
          </span>
        </button>
        <button
          type="button"
          onClick={() => arsipkan(t.id)}
          aria-label={`Arsipkan: ${t.judul}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-brand-navy shadow-[2px_2px_0px_#000000] transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">
            archive
          </span>
        </button>
        <button
          type="button"
          onClick={() => setKonfirmasiHapus(t.id)}
          aria-label={`Hapus: ${t.judul}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-brand-brick text-white shadow-[2px_2px_0px_#000000] transition-all hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">
            delete
          </span>
        </button>
      </div>
      )}
      {t.indukId && (
        <button
          type="button"
          onClick={() => t.indukId && hapusSeriTugas(t.indukId, t.judul)}
          className="h-10 w-full rounded-full border-2 border-black bg-white font-label text-[11px] font-extrabold uppercase text-brand-brick"
        >
          Hapus 1 seri utuh ({t.berulangLabel ?? "berulang"})
        </button>
      )}
      {t.status === "done" && (
        <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-black/10 pt-2">
          <button
            type="button"
            onClick={() => geserStatus(t.id, -1)}
            aria-label={`Kembalikan: ${t.judul}`}
            className="h-11 rounded-full border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold uppercase text-brand-navy shadow-[2px_2px_0px_#000000]"
          >
            Kembalikan
          </button>
          <button
            type="button"
            onClick={() => {
              setEditId(editId === t.id ? null : t.id);
              setSubTerbuka(null);
            }}
            aria-pressed={editId === t.id}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-black ${
              editId === t.id ? "bg-brand-yellow text-black" : "bg-white text-brand-navy"
            }`}
            aria-label={`Edit: ${t.judul}`}
          >
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">edit</span>
          </button>
          <button
            type="button"
            onClick={() => arsipkan(t.id)}
            aria-label={`Arsipkan: ${t.judul}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-white text-brand-navy"
          >
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">archive</span>
          </button>
          <button
            type="button"
            onClick={() => setKonfirmasiHapus(t.id)}
            aria-label={`Hapus: ${t.judul}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-brand-brick text-white"
          >
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">delete</span>
          </button>
        </div>
      )}
        </>
      )}
    </article>
    );
  };

  const kolom: { status: Status }[] = [
    { status: "todo" },
    { status: "doing" },
    { status: "done" },
  ];

  return (
    <ToolShell
      eyebrow="Alat Studi"
      title="Jadwal & Task Board"
      description="Manajemen linimasa bimbingan, tenggat sidang, dan pelacak tugas skripsi secara terintegrasi."
      icon="calendar_month"
      badge="Kanban Aktif"
      badgeTone="beta"
    >
      {/* Banner target kelulusan — referensi: panel sky + badge putih */}
      <div className="flex flex-col gap-4 rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-brand-yellow shadow-[2px_2px_0px_#000000]">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[24px] leading-none text-brand-navy">
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
          </span>          <div className="min-w-[160px] flex-1 sm:min-w-[200px]">
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

      {/* Pencarian + filter (prioritas & pintar) — reset filter disediakan */}
      <div className="mt-4 flex flex-col gap-3">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-xl border-[3px] border-black bg-white px-3 shadow-[3px_3px_0px_#000000] focus-within:bg-brand-paper">
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-muted">
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
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter pintar">
          {(
            [
              ["semua", "Semua"],
              ["hari-ini", "Hari ini"],
              ["minggu-ini", "Minggu ini"],
              ["terlambat", "Terlambat"],
              ["belum", "Belum"],
              ["selesai", "Selesai"],
              ["tinggi", "Prio tinggi"],
            ] as const
          ).map(([f, label]) => (
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
              {label}
            </button>
          ))}
          {(filter !== "semua" || cari) && (
            <button
              type="button"
              onClick={() => {
                setFilter("semua");
                setCari("");
              }}
              className="shrink-0 rounded-full border-2 border-black bg-brand-brick px-3 py-1.5 font-label text-xs font-extrabold uppercase text-white"
            >
              Atur Ulang
            </button>
          )}
        </div>

        {/* Aksi data dilipat agar ringkas — fitur tetap tersedia */}
        <details className="rounded-xl border-[3px] border-black bg-white px-3 py-2 shadow-[2px_2px_0px_#000000]">
          <summary className="cursor-pointer font-label text-xs font-extrabold uppercase text-brand-navy">
            Lainnya: Urungkan, Ekspor, Impor
          </summary>
          <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={undo}
            disabled={!undoTersedia}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 font-label text-xs font-extrabold uppercase text-brand-navy shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40"
          >
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">undo</span>
            Urungkan{undoLabel ? `: ${undoLabel}` : ""}
          </button>
          <button
            type="button"
            onClick={eksporData}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 font-label text-xs font-extrabold uppercase text-brand-navy shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">download</span>
            Ekspor
          </button>
          <button
            type="button"
            onClick={() => fileImporRef.current?.click()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 font-label text-xs font-extrabold uppercase text-brand-navy shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">upload</span>
            Impor
          </button>
          <input
            ref={fileImporRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Impor cadangan"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (file) void imporData(file);
              e.target.value = "";
            }}
          />
          </div>
        </details>

        {/* Ringkasan statistik satu baris ringkas */}
        <p aria-live="polite" className="rounded-xl border-[3px] border-black bg-white px-3 py-2 font-label text-xs font-bold text-brand-navy shadow-brutal-sm">
          Belum Dikerjakan {todo} • Dikerjakan {doing} • Selesai {done} • Terlambat {terlambat}
        </p>
        <p className="font-body text-[11px] text-brand-muted">
          Progres {persen}% dihitung dari tugasmu (kartu Demo tak ikut).
        </p>
        {adaDemo && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-[3px] border-dashed border-black bg-brand-yellow/20 px-3 py-2">
            <p className="font-body text-xs text-brand-navy">
              <strong>Mode contoh:</strong> kartu berlabel Demo bukan datamu — bebas diubah/dihapus.
            </p>
            <button
              type="button"
              onClick={hapusSemuaContoh}
              className="h-10 rounded-full border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold uppercase text-brand-navy shadow-[2px_2px_0px_#000000]"
            >
              Hapus contoh
            </button>
          </div>
        )}
      </div>

      {/* Satu kolom vertikal: kalender → agenda → kanban → tim → form */}
      <div className="mt-5 flex flex-col gap-5">
        {/* Bagian agenda */}
        <div className="flex flex-col gap-4">
          {/* Header pekan di luar kartu — referensi: baris label + pill minggu */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="flex items-center gap-2 font-label text-sm font-bold text-brand-navy">
                <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-blue">
                  today
                </span>
                Pekan Ini • {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </h2>
              <span className="shrink-0 rounded-full border-[3px] border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold uppercase tracking-wider text-brand-navy shadow-[2px_2px_0px_#000000]">
                Minggu ke-{nomorMingguIni()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-1">
              {HARI.map((h, i) => (
                <button
                  key={h.kode}
                  type="button"
                  onClick={() => setHariAktif(i)}
                  aria-pressed={hariAktif === i}
                  className={`flex min-w-[50px] flex-1 flex-col items-center justify-center rounded-2xl border-[3px] border-black px-1 py-2.5 transition-transform active:translate-y-1 active:shadow-none ${
                    hariAktif === i
                      ? "scale-105 bg-brand-blue text-white shadow-brutal"
                      : "bg-white text-brand-navy shadow-brutal hover:bg-brand-panel"
                  }`}
                >
                  <span
                    className={`font-label text-xs font-bold ${
                      hariAktif === i ? "text-white" : "text-brand-muted"
                    }`}
                  >
                    {h.kode.slice(0, 3)}
                  </span>
                  <span className="font-display text-xl font-bold">{h.tgl}</span>
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ring-1 ring-black ${
                      hariAktif === i ? "bg-brand-yellow" : h.dot
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Kalender Bulanan — melengkapi strip pekan, bukan mengganti */}
          <section aria-label="Kalender bulanan" className="rounded-2xl border-[3px] border-black bg-white p-3.5 shadow-brutal">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => geserBulan(-1)}
                  aria-label="Bulan sebelumnya"
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white text-brand-navy shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">chevron_left</span>
                </button>
                <h2 className="min-w-[140px] text-center font-display text-base font-bold capitalize text-brand-navy">
                  {namaBulan}
                </h2>
                <button
                  type="button"
                  onClick={() => geserBulan(1)}
                  aria-label="Bulan berikutnya"
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white text-brand-navy shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">chevron_right</span>
                </button>
              </div>
              <button
                type="button"
                onClick={keHariIni}
                className="rounded-full border-2 border-black bg-brand-panel px-3 py-1.5 font-label text-[11px] font-extrabold uppercase text-brand-navy shadow-[2px_2px_0px_#000000]"
              >
                Hari ini
              </button>
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1" role="grid" aria-label={`Kalender ${namaBulan}`}>
              {["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"].map((h) => (
                <span key={h} className="py-1 text-center font-label text-[10px] font-extrabold text-brand-muted">
                  {h}
                </span>
              ))}
              {kalenderSel.map((d) => {
                const iso = kunciTanggal(d);
                const diBulan = d.getMonth() === blnTahun.bulan;
                const daftar = aktif.filter((t) => parseTanggalISO(t.deadline) === iso);
                const adaTerlambat = daftar.some((t) => tugasTerlambat(t.status, t.deadline));
                const dipilih = tglPilih === iso;
                const hariIni = iso === isoHariIni;
                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    onClick={() => setTglPilih((s) => (s === iso ? null : iso))}
                    aria-pressed={dipilih}
                    aria-label={`${d.getDate()} ${namaBulan}${daftar.length > 0 ? `, ${daftar.length} tugas` : ""}${adaTerlambat ? ", ada terlambat" : ""}`}
                    className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl border-2 px-0.5 py-1 transition-all active:translate-y-0.5 ${
                      dipilih
                        ? "border-black bg-brand-blue text-white shadow-[2px_2px_0px_#000000]"
                        : hariIni
                          ? "border-black bg-brand-yellow text-black shadow-[2px_2px_0px_#000000]"
                          : adaTerlambat
                            ? "border-brand-brick bg-white text-brand-navy"
                            : "border-black/20 bg-white text-brand-navy"
                    } ${diBulan ? "" : "opacity-40"}`}
                  >
                    <span className="font-display text-sm font-bold leading-none">{d.getDate()}</span>
                    {daftar.length > 0 && (
                      <span
                        className={`mt-1 rounded-full px-1.5 font-label text-[10px] font-extrabold leading-4 ${
                          dipilih ? "bg-white text-brand-navy" : adaTerlambat ? "bg-brand-brick text-white" : "bg-brand-panel text-brand-navy"
                        }`}
                      >
                        {daftar.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 font-body text-[11px] text-brand-muted">
              Angka = tugas aktif bertenggat tanggal itu (bukan arsip). Tugas tanpa tenggat tak masuk kalender — lihat papan.
              {terlambat > 0 ? ` Ada ${terlambat} terlambat — saring "Terlambat" di atas.` : ""}
            </p>
            {tglPilih && (
              <div className="mt-2 rounded-xl border-2 border-black bg-brand-paper p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-label text-xs font-extrabold uppercase text-brand-navy">
                    {tugasTglPilih.length} tugas • {tglPilih}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTglPilih(null)}
                    className="font-label text-[11px] font-bold text-brand-brick underline"
                  >
                    Tutup
                  </button>
                </div>
                {tugasTglPilih.length === 0 ? (
                  <p className="mt-1 font-body text-xs text-brand-muted">
                    Tak ada tugas bertenggat tanggal ini.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {tugasTglPilih.map((t) => (
                      <li key={t.id} className="rounded-lg border-2 border-black bg-white px-2.5 py-1.5">
                        <p className={`font-body text-sm font-bold text-brand-navy ${t.status === "done" ? "line-through opacity-70" : ""}`}>
                          {t.judul}
                        </p>
                        <p className="font-body text-[11px] text-brand-muted">
                          {t.sumber === "roadmap" ? "Roadmap" : t.sumber === "materi" ? "Materi" : t.sumber === "pribadi" ? "Pribadi" : "Jadwal"}
                          {" • "}
                          {t.status === "done" ? "Selesai" : t.status === "doing" ? "Dikerjakan" : "Belum Dikerjakan"}
                          {tugasTerlambat(t.status, t.deadline) ? " • Terlambat" : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Agenda Terdekat */}
          <div className="flex flex-col items-start justify-between gap-3 px-1 sm:flex-row sm:items-center">
            <h2 className="flex flex-wrap items-center gap-2 font-display text-xl font-bold text-brand-navy">
              Agenda Terdekat
              <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-xs font-extrabold text-brand-blue shadow-[2px_2px_0px_#000000]">
                {agendaTampil.length} Agenda
              </span>
            </h2>
            <div className="flex flex-wrap gap-1">
              {(["semua", "tinggi", "sedang", "normal"] as const).map((f) => (
                <button
                  key={`agenda-filter-${f}`}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                  }}
                  className={`rounded-full border-2 border-black px-2 py-1 font-label text-[11px] font-bold ${filter === f ? "bg-brand-blue text-white" : "bg-white"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {agendaTampil.length === 0 && (
            <p className="rounded-xl border-2 border-dashed border-black/30 bg-white p-4 text-center font-body text-sm text-brand-muted">
              Tak ada agenda/tugas yang cocok — coba ubah kata kunci atau filter prioritas.
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
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleAgenda(a.id)}
                    aria-pressed={a.tuntas}
                    aria-label={`Tandai tuntas: ${a.judul}`}
                    className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-md border-2 border-black shadow-[2px_2px_0px_#000000] transition-transform active:translate-y-0.5 active:shadow-none ${
                      a.tuntas ? "bg-brand-blue text-white" : "bg-brand-panel"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`material-symbols-outlined shrink-0 text-[16px] leading-none ${
                        a.tuntas ? "" : "text-transparent"
                      }`}
                    >
                      check
                    </span>
                  </button>
                  <div>
                    <span
                      className={`flex items-center gap-2 font-label text-[11px] font-extrabold uppercase tracking-wider ${labelPrioritas(
                        a.prioritas
                      )}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shadow-[1px_1px_0px_#000000] ${dotPrioritas(a.prioritas)}`} />
                      {a.kategori}
                    </span>
                    <h3
                      className={`mt-1 font-display text-xl font-bold text-brand-navy ${
                        a.tuntas ? "line-through" : ""
                      }`}
                    >
                      {a.judul}
                    </h3>
                  </div>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full border-[3px] border-black px-2.5 py-1 font-label text-[11px] font-extrabold uppercase tracking-wider shadow-[2px_2px_0px_#000000] ${badgeAgenda(a.badgeTone)}`}
                >
                  {a.badge}
                </span>
                {a.contoh && (
                  <span
                    title="Agenda contoh — ikut terhapus lewat Hapus contoh"
                    className="shrink-0 whitespace-nowrap rounded-full border-2 border-dashed border-black bg-white px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-wider text-brand-muted"
                  >
                    Contoh
                  </span>
                )}
              </div>
              <p className="pl-9 font-body text-sm text-brand-muted">{a.deskripsi}</p>
              <div className="flex items-center justify-between gap-2 pl-9 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 font-label text-xs font-bold text-brand-navy">
                    <span
                      aria-hidden
                      className={`material-symbols-outlined shrink-0 text-[18px] leading-none ${
                        a.badgeTone === "danger" ? "text-brand-brick" : "text-brand-blue"
                      }`}
                    >
                      {a.badgeTone === "danger" ? "alarm" : "schedule"}
                    </span>
                    {a.jam}
                  </span>
                  <span className="flex items-center gap-1 font-label text-xs text-brand-muted">
                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">
                      room
                    </span>
                    {a.lokasi}
                  </span>
                </div>
                {a.inisial ? (
                  <span
                    title={a.kategori}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-black bg-brand-panel font-label text-[11px] font-extrabold text-brand-navy shadow-[2px_2px_0px_#000000]"
                  >
                    {a.inisial}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {/* Bagian kanban */}
        <div className="flex flex-col gap-4">
          {/* Header papan — referensi: judul + badge + total, tanpa wrapper kartu */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-brand-blue text-white shadow-[2px_2px_0px_#000000]"
              >
                <span className="material-symbols-outlined shrink-0 text-[20px] leading-none">dashboard</span>
              </span>
              <h2 className="font-display text-xl font-bold text-brand-navy">Papan Skripsi</h2>
              <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold uppercase tracking-wider text-brand-navy shadow-[2px_2px_0px_#000000]">
                Kanban Aktif
              </span>
            </div>
            <span className="font-label text-xs font-bold text-brand-muted">
              Total: {aktif.length} Kartu • {done} tuntas{arsip.length > 0 ? ` • ${arsip.length} arsip` : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
                {kolom.map((k) => {
                  const isi = aktif.filter(
                    (t) => t.status === k.status && cocokFilter(t)
                  );
                  const jumlah =
                    k.status === "todo" ? todo : k.status === "doing" ? doing : done;
                  return (
                    <section
                      key={k.status}
                      aria-label={LABEL_STATUS[k.status]}
                      className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-brand-panel p-3.5 shadow-brutal"
                    >
                      <header className="flex items-center justify-between gap-2 px-1 pb-1">
                        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
                          <span
                            className={`h-3.5 w-3.5 rounded-full border-2 border-black shadow-[1px_1px_0px_#000000] ${
                              k.status === "doing"
                                ? "bg-brand-blue"
                                : k.status === "done"
                                  ? "bg-brand-blue"
                                  : "bg-white"
                            }`}
                          />
                          {LABEL_STATUS[k.status]}
                          <span className="rounded-full border-[3px] border-black bg-white px-2 py-0.5 font-label text-xs font-extrabold text-brand-navy shadow-[2px_2px_0px_#000000]">
                            {jumlah}
                          </span>
                        </h3>
                        {k.status === "doing" ? (
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-blue">
                            refresh
                          </span>
                        ) : k.status === "done" ? (
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-blue">
                            task_alt
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setFormTerbuka(true)}
                            aria-label="Tambah kartu Belum Dikerjakan"
                            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-white text-brand-navy shadow-[2px_2px_0px_#000000] transition-all hover:bg-brand-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          >
                            <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">
                              add
                            </span>
                          </button>
                        )}
                      </header>
                      {isi.length === 0 && (
                        <div className="rounded-lg border-2 border-dashed border-black/30 bg-white/70 p-3 text-center">
                          <p className="font-body text-xs text-brand-muted">
                          {aktif.length === 0
                            ? "Papan kosong — mulai dari nol, tambah tugas pertamamu, atau coba contoh dulu."
                            : "Tak ada agenda/tugas yang cocok — coba ubah filter atau pencarian."}
                          </p>
                          {aktif.length === 0 && (
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setFormTerbuka(true)}
                                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-brand-yellow px-4 font-label text-xs font-extrabold text-brand-navy shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                              >
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">add</span>
                                Tambah tugas pertama
                              </button>
                              <button
                                type="button"
                                onClick={muatContoh}
                                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-4 font-label text-xs font-extrabold text-brand-navy shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                              >
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">science</span>
                                Coba contoh
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {isi.map(renderKartu)}
                    </section>
                  );
                })}
          </div>

          {/* Strip kolaborasi */}
          <div className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-blue">
                groups
              </span>
              <span className="font-label text-sm font-bold text-brand-navy">
                Tim Penguji & Rekan Sejawat
              </span>
              <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[10px] font-extrabold uppercase tracking-wider text-brand-navy shadow-[2px_2px_0px_#000000]">
                Akses Baca &amp; Komentar
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
                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none text-brand-blue">
                  person_add
                </span>
                Undang
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cari Semua Tugas — lintas sumber, record yang sama, tanpa salinan */}
      <section aria-label="Cari semua tugas" className="mt-5 rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-brand-navy">Cari Semua Tugas</h2>
          <span className="rounded-full border-[3px] border-black bg-white px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
            {hasilCari.length} Cocok
          </span>
        </div>
        <p className="mt-1 font-body text-xs text-brand-muted">
          Mencari di judul, catatan, sumber, status, prioritas, dan tenggat — semua sumber (Jadwal, Roadmap, Materi, Planner, Pribadi). Aksi di bawah mengubah tugas yang sama.
        </p>
        <label className="mt-3 flex h-12 items-center gap-2 rounded-xl border-[3px] border-black bg-white px-3 shadow-[3px_3px_0px_#000000] focus-within:bg-brand-paper">
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-muted">
            search
          </span>
          <input
            value={ccQ}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCcQ(e.target.value)}
            placeholder="Cari semua tugas…"
            className="w-full bg-transparent font-body text-sm text-brand-navy outline-none placeholder:text-brand-muted"
            aria-label="Cari semua tugas"
          />
          {ccQ && (
            <button
              type="button"
              onClick={() => setCcQ("")}
              aria-label="Bersihkan pencarian semua tugas"
              className="font-label text-xs font-bold text-brand-brick underline"
            >
              Hapus
            </button>
          )}
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Kondisi pencarian">
          {(["semua", "aktif", "selesai", "terlambat", "arsip"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setCcKondisi(k)}
              aria-pressed={ccKondisi === k}
              className={`shrink-0 rounded-full border-2 border-black px-3 py-1.5 font-label text-xs font-extrabold uppercase shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                ccKondisi === k ? "bg-brand-blue text-white" : "bg-white text-brand-navy hover:bg-brand-paper"
              }`}
            >
              {k === "semua" ? "Semua" : k === "aktif" ? "Aktif" : k === "selesai" ? "Selesai" : k === "terlambat" ? "Terlambat" : "Arsip"}
            </button>
          ))}
          {(ccKondisi !== "semua" || ccQ) && (
            <button
              type="button"
              onClick={resetCari}
              className="shrink-0 rounded-full border-2 border-black bg-brand-brick px-3 py-1.5 font-label text-xs font-extrabold uppercase text-white"
            >
              Atur Ulang
            </button>
          )}
        </div>
        {hasilCari.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-black/30 bg-white p-3 text-center font-body text-xs text-brand-muted">
            Tak ada tugas yang cocok — coba ubah kata kunci atau kondisi.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {hasilCari.map((h) => (
              <li key={h.id} className="rounded-xl border-2 border-black bg-white px-3 py-2 shadow-[2px_2px_0px_#000000]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-sm font-bold text-brand-navy">{h.judul}</span>
                    <span className="mt-0.5 block font-body text-xs text-brand-muted">
                      {h.sumber} • {h.status === "done" ? "Selesai" : h.status === "doing" ? "Dikerjakan" : "Belum Dikerjakan"} • {h.prioritas}{h.dueDate ? ` • ${h.dueDate}` : ""}{h.demo ? " • Demo" : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {h.arsip ? (
                      <button
                        type="button"
                        onClick={() => pulihkanHasilLintas(h.id)}
                        className="h-9 rounded-full border-2 border-black bg-brand-yellow px-2.5 font-label text-[10px] font-extrabold uppercase text-black"
                      >
                        Pulihkan
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => geserHasilLintas(h.id, -1)}
                          disabled={h.status === "todo"}
                          aria-label={`Mundur: ${h.judul}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white disabled:opacity-30"
                        >
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">chevron_left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => geserHasilLintas(h.id, 1)}
                          disabled={h.status === "done"}
                          aria-label={`Maju: ${h.judul}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-brand-blue text-white disabled:opacity-30"
                        >
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">chevron_right</span>
                        </button>
                      </>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Arsip — disembunyikan dari papan & statistik, bisa dipulihkan */}
      <section aria-label="Arsip tugas" className="mt-5 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-brand-navy">Arsip</h2>
          <span className="flex items-center gap-2">
            <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
              {arsip.length} Arsip
            </span>
            {arsip.length > 0 && (
              <button
                type="button"
                onClick={hapusSemuaArsip}
                className="h-9 rounded-full border-2 border-black bg-brand-brick px-2.5 font-label text-[10px] font-extrabold uppercase text-white"
              >
                Hapus semua
              </button>
            )}
          </span>
        </div>
        <p className="mt-1 font-body text-xs text-brand-muted">
          Tugas yang diarsipkan tidak dihitung di statistik dan tidak tampil di papan. Pulihkan untuk mengembalikan, atau hapus permanen bila benar-benar tak perlu.
        </p>
        {arsip.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-black/30 bg-white p-3 text-center font-body text-xs text-brand-muted">
            Arsip kosong — pakai tombol arsip pada kartu untuk menyingkirkan tugas tanpa menghapus.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {arsip.map((t) => (
              <li key={t.id} className="rounded-xl border-2 border-black bg-brand-paper px-3 py-2 shadow-[2px_2px_0px_#000000]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-sm font-bold text-brand-navy">{t.judul}</span>
                    <span className="mt-0.5 block font-body text-xs text-brand-muted">
                      {t.sumber === "roadmap" ? "Roadmap" : t.sumber === "materi" ? "Materi" : t.sumber === "pribadi" ? "Pribadi" : "Jadwal"} • {t.status === "done" ? "Selesai" : t.status === "doing" ? "Dikerjakan" : "Belum Dikerjakan"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => pulihkanArsip(t.id)}
                      className="h-9 rounded-full border-2 border-black bg-brand-yellow px-2.5 font-label text-[10px] font-extrabold uppercase text-black"
                    >
                      Pulihkan
                    </button>
                    <button
                      type="button"
                      onClick={() => hapusPermanenArsip(t.id)}
                      className="h-9 rounded-full border-2 border-black bg-brand-brick px-2.5 font-label text-[10px] font-extrabold uppercase text-white"
                    >
                      Hapus permanen
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Form tambah tugas */}
      {formTerbuka && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Tambah tugas baru"
          onClick={() => setFormTerbuka(false)}
        >
          <form
            ref={dialogRef}
            onSubmit={tambahTugas}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0px_#000000]"
          >
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-brand-navy">
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[22px] leading-none text-brand-blue">
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
                    Tenggat (opsional)
                  </span>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDeadline(e.target.value)
                    }
                    className="h-12 w-full rounded-xl border-[3px] border-black bg-white px-3 font-body text-sm text-brand-navy shadow-[3px_3px_0px_#000000] outline-none focus:bg-brand-paper"
                  />
                </label>
              </div>
              <fieldset>
                <legend className="mb-1 font-label text-xs font-extrabold uppercase text-brand-navy">
                  Status
                </legend>
                <div className="flex gap-2">
                  {(["todo", "doing", "done"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusBaru(s)}
                      aria-pressed={statusBaru === s}
                      className={`flex-1 rounded-full border-2 border-black px-2 py-2 font-label text-xs font-extrabold uppercase shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                        statusBaru === s
                          ? "bg-brand-blue text-white"
                          : "bg-white text-brand-navy hover:bg-brand-panel"
                      }`}
                    >
                      {LABEL_STATUS[s]}
                    </button>
                  ))}
                </div>
              </fieldset>
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
              <fieldset>
                <legend className="mb-1 font-label text-xs font-extrabold uppercase text-brand-navy">
                  Berulang
                </legend>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Pola berulang">
                  {(
                    [
                      ["tidak", "Sekali"],
                      ["harian", "Harian"],
                      ["mingguan", "Mingguan"],
                      ["interval", "Tiap N hari"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setUlang(v)}
                      aria-pressed={ulang === v}
                      className={`rounded-full border-2 border-black px-3 py-2 font-label text-xs font-extrabold uppercase shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                        ulang === v
                          ? "bg-brand-blue text-white"
                          : "bg-white text-brand-navy hover:bg-brand-panel"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {ulang !== "tidak" && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {ulang === "interval" && (
                      <label className="block">
                        <span className="mb-1 block font-label text-xs font-extrabold uppercase text-brand-navy">
                          Tiap berapa hari
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={ulangInterval}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUlangInterval(e.target.value)
                          }
                          className="h-12 w-full rounded-xl border-[3px] border-black bg-white px-3 font-body text-sm text-brand-navy shadow-[3px_3px_0px_#000000] outline-none focus:bg-brand-paper"
                        />
                      </label>
                    )}
                    <label className="block">
                      <span className="mb-1 block font-label text-xs font-extrabold uppercase text-brand-navy">
                        Jumlah kejadian (2–31)
                      </span>
                      <input
                        type="number"
                        min={2}
                        max={31}
                        value={ulangJumlah}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUlangJumlah(e.target.value)
                        }
                        className="h-12 w-full rounded-xl border-[3px] border-black bg-white px-3 font-body text-sm text-brand-navy shadow-[3px_3px_0px_#000000] outline-none focus:bg-brand-paper"
                      />
                    </label>
                  </div>
                )}
                <p className="mt-1 font-body text-[11px] text-brand-muted">
                  {ulang === "tidak"
                    ? "Satu tugas biasa."
                    : "Tenggat jadi tanggal mulai seri. Tiap kejadian tugas sendiri — selesaikan satu per satu."}
                </p>
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
                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">
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
        <span aria-hidden className="material-symbols-outlined shrink-0 text-[22px] leading-none">
          add_task
        </span>
        Tambah Tugas Baru
      </button>

      {toast && (
        <div aria-live="polite" className="fixed bottom-24 left-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center justify-between gap-2 rounded-2xl border-[3px] border-black bg-brand-navy px-4 py-3 text-white shadow-brutal md:bottom-6 md:left-auto md:right-6 md:w-auto md:min-w-[280px]">
          <span className="flex items-center gap-2 font-body text-sm">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-yellow">
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
