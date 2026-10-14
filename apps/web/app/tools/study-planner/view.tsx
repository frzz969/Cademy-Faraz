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
  removeTask,
  setTaskStatus,
  arsipkanTugas,
  pulihkanTugas,
  pushRiwayat,
  undoTask,
  bisaUndo,
  labelUndo,
  buatCadangan,
  bacaCadangan,
  gabungCadangan,
  type SharedTask,
  type TaskSource,
} from "../../../components/task-store";
import {
  cariLintasTugas,
  entriCariSemua,
  mondayOfWeek,
  toISODate,
  tugasTerlambat,
  type EntriCari,
  type KondisiCari,
} from "@cademy/utils";

// Taksonomi prioritas disatukan dengan jadwal: tinggi / sedang / normal.
type Prioritas = "normal" | "sedang" | "tinggi";
type Kolom = "todo" | "doing" | "done";

interface Task {
  id: string;
  nama: string;
  deadline: string;
  jam: string;
  ruang: string;
  deskripsi: string;
  prioritas: Prioritas;
  durasi: number;
  kolom: Kolom;
  selesai: boolean;
  arsip?: boolean;
}

/** Tugas lintas-sumber: sumber aslinya tetap, perubahan tersinkron balik. */
interface Lintas {
  id: string;
  nama: string;
  source: TaskSource;
  sumber: string;
  deadline: string;
  status: Kolom;
  prioritas: Prioritas;
  tag: string;
  notes: string;
  arsip?: boolean;
  demo?: boolean;
}

interface Target {
  label: string;
  date: string;
}

const LABEL_SUMBER: Record<string, string> = {
  jadwal: "Jadwal",
  roadmap: "Roadmap",
  materi: "Materi",
  planner: "Planner",
  pribadi: "Pribadi",
};

const KEY = "cademy:planner";
const TARGET_KEY = "cademy:planner-target";
const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function initials(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0].slice(0, 2) || "?").toUpperCase();
  return `${parts[0][0] ?? "?"}${parts[parts.length - 1][0] ?? "?"}`.toUpperCase();
}

function seedTasks(): Task[] {
  return [
    { id: uid(), nama: "Bimbingan Bab 4 & 5", deadline: "", jam: "10:00", ruang: "R. Dosen 302", deskripsi: "Validasi instrumen kuantitatif serta pengujian hipotesis ANOVA via SPSS.", prioritas: "tinggi", durasi: 60, kolom: "todo", selesai: false },
    { id: uid(), nama: "Tenggat Revisi Naskah Semhas", deadline: "", jam: "23:59", ruang: "Portal Akademik", deskripsi: "Upload PDF final beserta persetujuan kaprodi ke SIAKAD.", prioritas: "sedang", durasi: 120, kolom: "doing", selesai: false },
    { id: uid(), nama: "Gladi Resik Slide Sidang", deadline: "", jam: "14:30", ruang: "Lab 204", deskripsi: "Latihan 15 menit bersama kelompok seminar dan uji konektor HDMI.", prioritas: "normal", durasi: 45, kolom: "todo", selesai: false },
  ];
}

const inputCls =
  "h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 font-body text-sm font-medium text-brand-navy outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

export default function PlannerPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  // Tugas lintas-sumber (jadwal/roadmap/materi) — SAMA-SAMA BISA DIEDIT.
  // Perubahan status/deadline/judul ditulis balik ke store bersama, jadi
  // tercermin di Jadwal dan Roadmap. Disimpan terpisah dari `tasks` agar
  // slice planner-only tidak tercampur.
  const [lintas, setLintas] = React.useState<Lintas[]>([]);
  const [target, setTarget] = React.useState<Target>({ label: "Sidang Akhir Semester Genap", date: "" });
  const [view, setView] = React.useState<"agenda" | "kanban">("agenda");
  const [filterP, setFilterP] = React.useState<"semua" | Prioritas>("semua");
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [undoTersedia, setUndoTersedia] = React.useState(false);
  const [undoLabel, setUndoLabel] = React.useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = React.useState<string | null>(null);
  const fileImporRef = React.useRef<HTMLInputElement>(null);
  const toastTimer = React.useRef<number | null>(null);
  const dragId = React.useRef<string | null>(null);

  // ── Mutasi bersama: catat riwayat, tulis ke store, sinkronkan tampilan ────
  function catatUndo(label: string): void {
    pushRiwayat(label, loadTasks());
    setUndoTersedia(bisaUndo());
    setUndoLabel(labelUndo());
  }

  function muatLintas(all: SharedTask[]): Lintas[] {
    const seen = new Set<string>();
    return all
      .filter(
        (t) => t.source === "jadwal" || t.source === "roadmap" || t.source === "materi"
      )
      .filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .map((t) => ({
        id: t.id,
        nama: t.title,
        source: t.source,
        sumber: LABEL_SUMBER[t.source] ?? t.source,
        deadline: t.dueDate ?? "",
        status: t.status,
        prioritas:
          t.prioritas === "tinggi"
            ? "tinggi"
            : t.prioritas === "normal" || t.prioritas === "rendah"
              ? "normal"
              : "sedang",
        tag: t.tag ?? (t.phaseTitle ? t.phaseTitle : ""),
        notes: t.notes ?? "",
        ...(t.arsip ? { arsip: true as const } : {}),
        ...(t.demo ? { demo: true as const } : {}),
      }));
  }

  function undo(): void {
    const kembali = undoTask();
    if (!kembali) {
      showToast("Tidak ada aksi yang bisa dibatalkan.");
      return;
    }
    saveTasks(kembali);
    const all = kembali;
    dikenalRef.current = new Set(
      all.filter((t) => t.source === "planner").map((t) => t.id)
    );
    setTasks(
      bySource(all, "planner").map((t) => ({
        id: t.id,
        nama: t.title,
        deadline: t.dueDate ?? "",
        jam: t.jam ?? "",
        ruang: t.ruang ?? "",
        deskripsi: t.description ?? "",
        prioritas:
          t.prioritas === "tinggi"
            ? "tinggi"
            : t.prioritas === "normal" || t.prioritas === "rendah"
              ? "normal"
              : "sedang",
        durasi: t.durasi ?? 60,
        kolom: t.status,
        selesai: t.status === "done",
        ...(t.arsip ? { arsip: true as const } : {}),
      }))
    );
    setLintas(muatLintas(all));
    setUndoTersedia(bisaUndo());
    setUndoLabel(labelUndo());
    showToast("Aksi terakhir dibatalkan.");
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
    showToast(`Cadangan ${semua.length} tugas diunduh.`);
  }

  async function imporData(file: File): Promise<void> {
    const teks = await file.text();
    const hasil = bacaCadangan(teks);
    if (!hasil.ok) {
      showToast(`Impor gagal: ${hasil.error}`);
      return;
    }
    const digabung = gabungCadangan(loadTasks(), hasil.tasks, "gabung");
    saveTasks(digabung);
    dikenalRef.current = new Set(
      digabung.filter((t) => t.source === "planner").map((t) => t.id)
    );
    setTasks(
      bySource(digabung, "planner").map((t) => ({
        id: t.id,
        nama: t.title,
        deadline: t.dueDate ?? "",
        jam: t.jam ?? "",
        ruang: t.ruang ?? "",
        deskripsi: t.description ?? "",
        prioritas:
          t.prioritas === "tinggi"
            ? "tinggi"
            : t.prioritas === "normal" || t.prioritas === "rendah"
              ? "normal"
              : "sedang",
        durasi: t.durasi ?? 60,
        kolom: t.status,
        selesai: t.status === "done",
        ...(t.arsip ? { arsip: true as const } : {}),
      }))
    );
    setLintas(muatLintas(digabung));
    showToast(`${hasil.total} tugas dari file diterapkan (data lama aman).`);
  }

  const [fNama, setFNama] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const [fJam, setFJam] = React.useState("");
  const [fRuang, setFRuang] = React.useState("");
  const [fPrioritas, setFPrioritas] = React.useState<Prioritas>("sedang");
  const [fDurasi, setFDurasi] = React.useState("60");
  const [fDeskripsi, setFDeskripsi] = React.useState("");
  const firstInputRef = React.useRef<HTMLInputElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const pemicuRef = React.useRef<HTMLElement | null>(null);
  // ID planner yang pernah dikenal tab ini (bedakan hapus vs tambah-tab-lain).
  const dikenalRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    try {
      const all = loadTasks();
      setTasks(
        bySource(all, "planner").map((t) => ({
          id: t.id,
          nama: t.title,
          deadline: t.dueDate ?? "",
          jam: t.jam ?? "",
          ruang: t.ruang ?? "",
          deskripsi: t.description ?? "",
          // "rendah" lama dipetakan ke "normal" agar selaras dengan jadwal.
          prioritas:
            t.prioritas === "tinggi"
              ? "tinggi"
              : t.prioritas === "normal" || t.prioritas === "rendah"
                ? "normal"
                : "sedang",
          durasi: t.durasi ?? 60,
          kolom: t.status,
          selesai: t.status === "done",
          ...(t.arsip ? { arsip: true as const } : {}),
        } satisfies Task))
      );
      setLintas(muatLintas(all));
      all
        .filter((t) => t.source === "planner")
        .forEach((t) => dikenalRef.current.add(t.id));
      const t = localStorage.getItem(TARGET_KEY);
      if (t) {
        const parsed = JSON.parse(t) as Target;
        if (parsed && typeof parsed.label === "string") setTarget({ label: parsed.label, date: parsed.date ?? "" });
      }
    } catch {
      /* abaikan */
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (ready) {
      try {
        const all = loadTasks();
        const keep = all.filter((t) => t.source !== "planner");
        const ownSlice = tasks.map((t) => {
          const asal = all.find((a) => a.id === t.id);
          return {
            id: t.id,
            source: "planner" as const,
            status: t.kolom,
            prioritas: t.prioritas,
            title: t.nama,
            description: t.deskripsi,
            dueDate: t.deadline,
            jam: t.jam,
            ruang: t.ruang,
            durasi: t.durasi,
            // Arsip & stempel selesai milik data — jangan dibuang saat simpan.
            ...(t.arsip || asal?.arsip ? { arsip: true as const } : {}),
            ...(asal?.completedAt ? { completedAt: asal.completedAt } : {}),
            createdAt: asal?.createdAt ?? new Date().toISOString(),
          };
        });
        // Record planner asing (tab lain) ikut dibawa — bukan dihapus.
        const asing = asingBaru(all, dikenalRef.current).filter(
          (t) => t.source === "planner"
        );
        const tulis = [...keep, ...ownSlice, ...asing];
        // Lewati tulis bila sama (anti gema lintas-tab).
        if (!samaDaftar(tulis, all)) {
          saveTasks(tulis);
          localStorage.setItem(KEY, JSON.stringify(ownSlice));
        }
        tulis
          .filter((t) => t.source === "planner")
          .forEach((t) => dikenalRef.current.add(t.id));
      } catch {
        /* abaikan */
      }
    }
  }, [tasks, ready]);

  React.useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(TARGET_KEY, JSON.stringify(target));
      } catch {
        /* abaikan */
      }
    }
  }, [target, ready]);
  // Segarkan daftar lintas-sumber saat tab kembali fokus / storage berubah.
  // Perubahan dari sini ikut tercermin di Jadwal & Roadmap (satu sumber data).
  React.useEffect(() => {
    if (!ready) return;
    function refreshLintas() {
      try {
        const jadi = muatLintas(loadTasks());
        // Kembalikan prev bila sama (cukup render ulang, tanpa efek lanjutan).
        setLintas((dulu) =>
          JSON.stringify(jadi) === JSON.stringify(dulu) ? dulu : jadi
        );
      } catch {
        /* abaikan */
      }
    }
    window.addEventListener("focus", refreshLintas);
    window.addEventListener("storage", refreshLintas);
    return () => {
      window.removeEventListener("focus", refreshLintas);
      window.removeEventListener("storage", refreshLintas);
    };
  }, [ready]);

  // ── Tindakan pada tugas lintas-sumber (tersinkron ke store bersama) ───────
  function geserLintas(id: string, arah: -1 | 1): void {
    catatUndo("geser status tugas");
    const urutan: Kolom[] = ["todo", "doing", "done"];
    const all = loadTasks();
    const cur = all.find((t) => t.id === id);
    if (!cur) return;
    const next = urutan[Math.min(2, Math.max(0, urutan.indexOf(cur.status) + arah))];
    const diperbarui = setTaskStatus(all, id, next);
    saveTasks(diperbarui);
    setLintas(muatLintas(diperbarui));
    showToast(arah > 0 ? "Kartu digeser maju!" : "Kartu dikembalikan!");
  }

  function ubahLintas(
    id: string,
    patch: Partial<{ nama: string; deadline: string; notes: string; prioritas: Prioritas }>
  ): void {
    catatUndo("edit tugas");
    const all = loadTasks().map((t) =>
      t.id === id
        ? {
            ...t,
            ...(patch.nama !== undefined ? { title: patch.nama } : {}),
            ...(patch.deadline !== undefined
              ? { dueDate: patch.deadline || undefined }
              : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            ...(patch.prioritas !== undefined ? { prioritas: patch.prioritas } : {}),
          }
        : t
    );
    saveTasks(all);
    setLintas(muatLintas(all));
  }

  function hapusLintas(id: string): void {
    catatUndo("hapus tugas");
    const diperbarui = removeTask(loadTasks(), id);
    saveTasks(diperbarui);
    setLintas(muatLintas(diperbarui));
    setKonfirmasiHapus(null);
    showToast("Tugas dihapus — bisa dibatalkan dengan Urungkan!");
  }

  function arsipkanLintas(id: string): void {
    catatUndo("arsipkan tugas");
    const diperbarui = arsipkanTugas(loadTasks(), id);
    saveTasks(diperbarui);
    setLintas(muatLintas(diperbarui));
    showToast("Tugas diarsipkan — lihat seksi Arsip untuk memulihkan!");
  }

  // Arsip & Cari Semua Tugas: segarkan kedua state dari store bersama.
  // Kembalikan prev bila sama agar efek simpan tak ikut menyala (anti gema).
  function segarkanPlannerDariStore(): void {
    try {
      const semua = loadTasks();
      setLintas((dulu) => {
        const jadi = muatLintas(semua);
        return JSON.stringify(jadi) === JSON.stringify(dulu) ? dulu : jadi;
      });
      semua
        .filter((t) => t.source === "planner")
        .forEach((t) => dikenalRef.current.add(t.id));
      setTasks((dulu) => {
        const jadi: Task[] = bySource(semua, "planner").map((t) => ({
          id: t.id,
          nama: t.title,
          deadline: t.dueDate ?? "",
          jam: t.jam ?? "",
          ruang: t.ruang ?? "",
          deskripsi: t.description ?? "",
          prioritas:
            t.prioritas === "tinggi"
              ? "tinggi"
              : t.prioritas === "normal" || t.prioritas === "rendah"
                ? "normal"
                : "sedang",
          durasi: t.durasi ?? 60,
          kolom: t.status,
          selesai: t.status === "done",
          ...(t.arsip ? { arsip: true as const } : {}),
        }));
        return JSON.stringify(jadi) === JSON.stringify(dulu) ? dulu : jadi;
      });
    } catch {
      /* abaikan */
    }
  }

  function arsipkanOwn(id: string): void {
    catatUndo("arsipkan tugas");
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, arsip: true } : t)));
    showToast("Tugas diarsipkan — lihat seksi Arsip untuk memulihkan!");
  }

  function pulihkanArsipSemua(id: string): void {
    catatUndo("pulihkan arsip");
    try {
      saveTasks(pulihkanTugas(loadTasks(), id));
      segarkanPlannerDariStore();
      showToast("Tugas dikembalikan ke papan!");
    } catch {
      /* abaikan */
    }
  }

  function hapusPermanenArsip(id: string): void {
    let nama = id;
    try {
      nama = loadTasks().find((t) => t.id === id)?.title ?? id;
    } catch {
      /* abaikan */
    }
    if (
      !window.confirm(
        `Hapus permanen "${nama}" dari Arsip? Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return;
    catatUndo("hapus permanen");
    try {
      saveTasks(removeTask(loadTasks(), id));
      segarkanPlannerDariStore();
      showToast("Tugas dihapus permanen dari Arsip.");
    } catch {
      /* abaikan */
    }
  }

  function geserHasilCari(id: string, arah: -1 | 1): void {
    catatUndo("geser status tugas");
    try {
      const semua = loadTasks();
      const cur = semua.find((t) => t.id === id);
      if (!cur || cur.arsip) return;
      const urutan: Kolom[] = ["todo", "doing", "done"];
      const next = urutan[Math.min(2, Math.max(0, urutan.indexOf(cur.status) + arah))];
      saveTasks(setTaskStatus(semua, id, next));
      segarkanPlannerDariStore();
      showToast(arah > 0 ? "Kartu digeser maju!" : "Kartu dikembalikan!");
    } catch {
      /* abaikan */
    }
  }

  // Arsip disembunyikan dari daftar lintas (hanya di seksi Arsip).
  const lintasAktif = lintas.filter((t) => !t.arsip);

  // Cari Semua Tugas: store bersama apa adanya; hasil menunjuk record sama.
  const [ccQ, setCcQ] = React.useState("");
  const [ccKondisi, setCcKondisi] = React.useState<KondisiCari>("semua");
  const hasilCari: EntriCari[] = React.useMemo(() => {
    if (!ready) return [];
    try {
      return cariLintasTugas(entriCariSemua(loadTasks()), {
        q: ccQ,
        kondisi: ccKondisi,
      });
    } catch {
      return [];
    }
  }, [ready, tasks, lintas, ccQ, ccKondisi]);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  React.useEffect(() => {
    if (!showForm) return;
    pemicuRef.current = document.activeElement as HTMLElement | null;
    firstInputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowForm(false);
        return;
      }
      // Trap-fokus sederhana: Tab berputar di dalam sheet.
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
    // Kunci scroll latar agar sheet saja yang bergulir (tanpa lib baru).
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
  }, [showForm]);

  async function copyLinkWithFallback(text: string): Promise<boolean> {
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

  const week = React.useMemo(() => {
    const mon = mondayOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }, []);

  const todayISO = toISODate(new Date());

  const countdown = React.useMemo(() => {
    if (!target.date) return null;
    const diff = Math.ceil((new Date(target.date).getTime() - new Date(todayISO).getTime()) / 86400000);
    return diff;
  }, [target.date, todayISO]);

  // Arsip disembunyikan dari agenda/kanban/progres (hanya di seksi Arsip).
  const tugasAktifOwn = tasks.filter((t) => !t.arsip);
  const tugasArsipOwn = tasks.filter((t) => t.arsip);

  const agenda = React.useMemo(() => {
    return tugasAktifOwn
      .filter((t) => t.kolom !== "done")
      .filter((t) => (filterP === "semua" ? true : t.prioritas === filterP))
      .filter((t) => (selectedDay ? t.deadline === selectedDay : true))
      .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999") || a.jam.localeCompare(b.jam));
  }, [tasks, filterP, selectedDay]);

  const cols: Array<{ id: Kolom; title: string }> = [
    { id: "todo", title: "Belum Dikerjakan" },
    { id: "doing", title: "Sedang Dikerjakan" },
    { id: "done", title: "Selesai" },
  ];
  const doneCount = tugasAktifOwn.filter((t) => t.kolom === "done").length;
  const progress = tugasAktifOwn.length > 0 ? Math.round((doneCount / tugasAktifOwn.length) * 100) : 0;

  function openAdd() {
    setEditingId(null);
    setFNama("");
    setFDate(selectedDay ?? "");
    setFJam("");
    setFRuang("");
    setFPrioritas("sedang");
    setFDurasi("60");
    setFDeskripsi("");
    setShowForm(true);
  }

  function openEdit(t: Task) {
    setEditingId(t.id);
    setFNama(t.nama);
    setFDate(t.deadline);
    setFJam(t.jam);
    setFRuang(t.ruang);
    setFPrioritas(t.prioritas);
    setFDurasi(String(t.durasi));
    setFDeskripsi(t.deskripsi);
    setShowForm(true);
  }

  function saveForm() {
    if (!fNama.trim()) {
      showToast("Isi nama tugas dulu!");
      return;
    }
    if (editingId) {
      setTasks((ts) => ts.map((t) => (t.id === editingId ? { ...t, nama: fNama.trim(), deadline: fDate, jam: fJam, ruang: fRuang, prioritas: fPrioritas, durasi: Number(fDurasi) || 30, deskripsi: fDeskripsi } : t)));
      showToast("Tugas diperbarui!");
    } else {
      setTasks((ts) => [...ts, { id: uid(), nama: fNama.trim(), deadline: fDate, jam: fJam, ruang: fRuang, deskripsi: fDeskripsi, prioritas: fPrioritas, durasi: Number(fDurasi) || 30, kolom: "todo", selesai: false }]);
      showToast("Tugas baru ditambahkan!");
    }
    setShowForm(false);
  }

  function move(id: string, dir: -1 | 1) {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const order: Kolom[] = ["todo", "doing", "done"];
        const next = order[Math.min(2, Math.max(0, order.indexOf(t.kolom) + dir))];
        return { ...t, kolom: next, selesai: next === "done" };
      })
    );
  }

  function dropTo(kolom: Kolom) {
    const id = dragId.current;
    if (!id) return;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, kolom, selesai: kolom === "done" } : t)));
    dragId.current = null;
    showToast("Kartu dipindahkan!");
  }

  function toggleDone(id: string) {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const next: Kolom = t.kolom === "done" ? "todo" : "done";
        return { ...t, kolom: next, selesai: next === "done" };
      })
    );
    showToast("Tugas ditandai tuntas!");
  }

  const dotColor = (iso: string) => {
    const day = tasks.filter((t) => t.deadline === iso && t.kolom !== "done");
    if (day.some((t) => t.prioritas === "tinggi")) return "bg-brand-brick";
    if (day.some((t) => t.prioritas === "sedang")) return "bg-brand-yellow";
    if (day.length > 0) return "bg-brand-muted";
    return "bg-transparent";
  };

  const prioritasLabel = (p: Prioritas) =>
    p === "tinggi" ? "Tinggi" : p === "sedang" ? "Sedang" : "Normal";
  const dotP = (p: Prioritas) => (p === "tinggi" ? "bg-brand-brick" : p === "sedang" ? "bg-brand-yellow" : "bg-brand-panel border border-black");

  return (
    <ToolShell
      eyebrow="Alat Studi"
      title="Perencana Belajar"
      description="Agenda, linimasa, dan papan kanban belajar — tersimpan lokal di browser."
      icon="calendar_month"
      badge={`${tugasAktifOwn.filter((t) => t.kolom !== "done").length} aktif • ${progress}%`}
      badgeTone="info"
    >
      {/* Hero countdown target */}
      <div className="flex w-full items-center justify-between rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-brand-yellow shadow-brutal-sm">
            <span aria-hidden className="material-symbols-outlined text-xl">auto_stories</span>
          </div>
          <div>
            <span className="block font-label text-[11px] font-extrabold uppercase tracking-wider">Target Kelulusan</span>
            <input
              value={target.label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTarget((t) => ({ ...t, label: e.target.value }))}
              className="w-full max-w-55 bg-transparent font-display text-lg font-bold outline-none border-b-2 border-dashed border-transparent focus:border-brand-blue"
              aria-label="Label target"
            />
            <input
              type="date"
              value={target.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTarget((t) => ({ ...t, date: e.target.value }))}
              className="mt-1 rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold"
              aria-label="Tanggal target"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 py-1.5 shadow-brutal-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-yellow" />
          <span className="font-label text-xs font-bold">
            {countdown === null ? "Atur tanggal" : countdown < 0 ? `Lewat ${Math.abs(countdown)} hari` : countdown === 0 ? "Hari H!" : `H-${countdown} Hari`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border-[3px] border-black bg-brand-panel p-1.5 shadow-brutal">
        <button
          type="button"
          onClick={() => setView("agenda")}
          className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 font-label text-xs font-bold shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
            view === "agenda" ? "border-[3px] border-black bg-brand-blue text-white" : "border-[3px] border-black bg-white text-brand-navy"
          }`}
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">calendar_month</span> Agenda & Linimasa
        </button>
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 font-label text-xs font-bold shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
            view === "kanban" ? "border-[3px] border-black bg-brand-blue text-white" : "border-[3px] border-black bg-white text-brand-navy"
          }`}
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">view_kanban</span> Papan Kanban
        </button>
      </div>

      {/* Strip minggu */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-1 font-label text-xs font-bold"><span aria-hidden className="material-symbols-outlined text-[18px]">today</span> Pekan Ini</span>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-[3px] border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold shadow-brutal-sm">
              {progress}% SELESAI
            </span>
            {selectedDay && (
              <button type="button" onClick={() => setSelectedDay(null)} className="text-xs font-bold text-brand-blue underline">
                Atur Ulang hari
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto px-0.5 py-1 sm:justify-between">
          {week.map((d) => {
            const iso = toISODate(d);
            const active = iso === todayISO;
            const picked = selectedDay === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDay((s) => (s === iso ? null : iso))}
                className={`flex min-w-12 flex-1 flex-col items-center justify-center rounded-2xl border-[3px] border-black px-1 py-2.5 shadow-brutal transition-transform active:translate-y-1 active:shadow-none ${
                  picked ? "scale-105 bg-brand-yellow" : active ? "bg-brand-blue text-white" : "bg-white"
                }`}
              >
                <span className={`font-label text-xs font-bold ${active && !picked ? "text-white" : "text-brand-muted"}`}>{HARI[d.getDay()]}</span>
                <span className={`font-display text-lg font-bold ${active && !picked ? "text-white" : ""}`}>{d.getDate()}</span>
                <div className={`mt-1 h-1.5 w-1.5 rounded-full ${dotColor(iso)}`} />
              </button>
            );
          })}
        </div>
      </div>

      {view === "agenda" ? (
        <div className="mt-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold">Agenda Terdekat</span>
              <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-xs font-bold shadow-brutal-sm">
                {agenda.length} Agenda
              </span>
            </div>
            <div className="flex gap-1">
              {(["semua", "tinggi", "sedang", "normal"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterP(f)}
                  className={`rounded-full border-2 border-black px-2 py-1 font-label text-[11px] font-bold ${filterP === f ? "bg-brand-blue text-white" : "bg-white"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {agenda.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-black/30 bg-white p-4 text-center text-sm text-brand-muted">
              Tak ada agenda/task yang cocok — coba ubah filter prioritas atau pilih hari lain.
            </p>
          )}
          {agenda.map((t) => (
            <div key={t.id} className="flex flex-col space-y-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDone(t.id)}
                    aria-label="Tandai selesai"
                    className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border-2 border-black bg-brand-panel shadow-brutal-sm transition-transform active:translate-y-0.5"
                  >
                    <span aria-hidden className="material-symbols-outlined text-base font-bold">check</span>
                  </button>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full shadow-brutal-sm ${dotP(t.prioritas)}`} />
                      <span className="font-label text-[11px] font-extrabold uppercase tracking-wider">
                        {prioritasLabel(t.prioritas)}{t.deadline ? ` • ${t.deadline}` : ""}
                      </span>
                    </div>
                    <h2 className="mt-0.5 font-display text-lg font-bold">{t.nama}</h2>
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-full border-[3px] border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold shadow-brutal-sm">
                  {(t.jam || "—") + (t.ruang ? ` • ${t.ruang}` : "")}
                </span>
              </div>
              {t.deskripsi && <p className="pl-9 font-body text-sm text-brand-muted">{t.deskripsi}</p>}
              <div className="flex items-center justify-between pl-9 pt-1">
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span>⏱️ {t.jam || "Fleksibel"}</span>
                  <span className="text-brand-muted">📍 {t.ruang || "—"}</span>
                  <span className="text-brand-muted">⏳ {t.durasi} mnt</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-brand-panel font-label text-[11px] font-extrabold shadow-brutal-sm" title={t.nama}>
                    {initials(t.nama)}
                  </div>
                  <button type="button" onClick={() => openEdit(t)} className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold" aria-label="Edit">
                    ✏️
                  </button>
                  <button type="button" onClick={() => arsipkanOwn(t.id)} className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold" aria-label="Arsipkan">
                    🗃️
                  </button>
                  <button type="button" onClick={() => { setTasks((ts) => ts.filter((x) => x.id !== t.id)); showToast("Tugas dihapus!"); }} className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold" aria-label="Hapus">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col space-y-5">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold">Papan Belajar</span>
              <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
                KANBAN AKTIF
              </span>
            </div>
            <span className="font-label text-xs font-bold text-brand-muted">Total: {tugasAktifOwn.length} Kartu</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-white">
            <div className="h-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
          </div>
          {cols.map((c) => {
            const list = tugasAktifOwn.filter((t) => t.kolom === c.id);
            return (
              <div
                key={c.id}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
                onDrop={() => dropTo(c.id)}
                className="flex flex-col space-y-3 rounded-2xl border-[3px] border-black bg-brand-panel p-3.5 shadow-brutal"
              >
                <div className="flex items-center justify-between pb-1">
                  <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">
                    <span aria-hidden className={`h-3 w-3 rounded-full border-2 border-black ${c.id === "todo" ? "bg-white" : c.id === "doing" ? "bg-brand-blue" : "bg-brand-yellow"}`} />
                    {c.id === "todo" ? "Belum Dikerjakan" : c.id === "doing" ? "Sedang Dikerjakan" : "Selesai"} ({list.length})
                  </h3>
                </div>
                {list.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => {
                      dragId.current = t.id;
                    }}
                    className={`flex cursor-grab flex-col space-y-2 rounded-2xl border-[3px] border-black bg-white p-3 shadow-brutal ${t.kolom === "done" ? "opacity-90" : ""}`}
                  >
                    <p className={`font-body text-sm font-medium ${t.kolom === "done" ? "line-through" : ""}`}>{t.nama}</p>
                    <div className="flex items-center justify-between pt-1 text-xs text-brand-muted">
                      <span>📅 {t.deadline || "Tanpa tanggal"}{t.jam ? ` • ${t.jam}` : ""}</span>
                      <span className={`h-2 w-2 rounded-full ${t.prioritas === "tinggi" ? "bg-brand-brick" : "bg-brand-muted"}`} />
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => move(t.id, -1)} disabled={t.kolom === "todo"} className="flex-1 rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold disabled:opacity-40" aria-label="Pindah kiri">
                        ←
                      </button>
                      <button type="button" onClick={() => move(t.id, 1)} disabled={t.kolom === "done"} className="flex-1 rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold disabled:opacity-40" aria-label="Pindah kanan">
                        →
                      </button>
                      <button type="button" onClick={() => openEdit(t)} className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold" aria-label="Edit">
                        ✏️
                      </button>
                      <button type="button" onClick={() => arsipkanOwn(t.id)} className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold" aria-label="Arsipkan">
                        🗃️
                      </button>
                    </div>
                  </div>
                ))}
                {list.length === 0 && <p className="rounded-xl border-2 border-dashed border-black/30 p-3 text-center text-xs text-brand-muted">Seret kartu ke sini atau pakai tombol →.</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Tugas lintas-sumber — hanya di tab kanban agar tidak duplikat. */}
      {view === "kanban" && (
      <section aria-label="Tugas lintas-sumber" className="mt-5 rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Tugas Lintas-Sumber</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border-[3px] border-black bg-white px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
              {lintasAktif.length} Tugas
            </span>
            <button
              type="button"
              onClick={undo}
              disabled={!undoTersedia}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 font-label text-[11px] font-extrabold uppercase text-brand-navy shadow-brutal-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">undo</span>
              Urungkan{undoLabel ? `: ${undoLabel}` : ""}
            </button>
            <button
              type="button"
              onClick={eksporData}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 font-label text-[11px] font-extrabold uppercase text-brand-navy shadow-brutal-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">download</span>
              Ekspor
            </button>
            <button
              type="button"
              onClick={() => fileImporRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 font-label text-[11px] font-extrabold uppercase text-brand-navy shadow-brutal-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
        </div>
        <p className="mt-1 font-body text-xs text-brand-muted">
          Tugas dari Jadwal, Roadmap, dan Materi bisa dikelola langsung di sini. Perubahan status,
          tenggat, judul, atau catatan otomatis tercermin di halaman asalnya (satu sumber data).
        </p>
        {lintasAktif.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-black/30 bg-white p-3 text-center text-xs text-brand-muted">
            Belum ada tugas lintas-sumber — buat di Jadwal, Roadmap, atau pakai tombol Tambah Tugas di bawah.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lintasAktif.map((t) => (
              <li key={t.id} className="rounded-xl border-2 border-black bg-white px-3 py-2 shadow-[2px_2px_0px_#000000]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    {editingId === t.id ? (
                      <input
                        value={t.nama}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          ubahLintas(t.id, { nama: e.target.value })
                        }
                        className="h-9 w-full rounded-lg border-2 border-black bg-white px-2 font-body text-sm outline-none focus:bg-brand-paper"
                        aria-label={`Judul ${t.nama}`}
                      />
                    ) : (
                      <span className="block truncate font-body text-sm font-bold text-brand-navy">{t.nama}</span>
                    )}
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-body text-xs text-brand-muted">
                      <span className="font-label text-[10px] font-extrabold uppercase">
                        {t.sumber}
                        {t.tag ? ` • ${t.tag}` : ""}
                      </span>
                      {t.demo && (
                        <span className="rounded-full border-2 border-dashed border-black bg-white px-1.5 py-0 font-label text-[10px] font-extrabold uppercase text-brand-muted">
                          Demo
                        </span>
                      )}
                      {tugasTerlambat(t.status, t.deadline) && (
                        <span className="rounded-full border-2 border-black bg-brand-brick px-1.5 py-0 font-label text-[10px] font-extrabold uppercase text-white">
                          Terlambat
                        </span>
                      )}
                      <span>{t.status === "done" ? "Selesai" : t.status === "doing" ? "Dikerjakan" : "Belum Dikerjakan"}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {konfirmasiHapus === t.id ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setKonfirmasiHapus(null)}
                          className="h-9 rounded-full border-2 border-black bg-white px-2.5 font-label text-[10px] font-extrabold uppercase"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => hapusLintas(t.id)}
                          className="h-9 rounded-full border-2 border-black bg-brand-navy px-2.5 font-label text-[10px] font-extrabold uppercase text-white"
                        >
                          Hapus
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => geserLintas(t.id, -1)}
                          disabled={t.status === "todo"}
                          aria-label={`Mundur: ${t.nama}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white disabled:opacity-30"
                        >
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">chevron_left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => geserLintas(t.id, 1)}
                          aria-label={`Maju: ${t.nama}`}
                          className="flex h-9 items-center justify-center rounded-full border-2 border-black bg-brand-blue px-2 font-label text-[10px] font-extrabold uppercase text-white"
                        >
                          {t.status === "todo" ? "Kerjakan" : "Selesaikan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                          aria-pressed={editingId === t.id}
                          aria-label={`Edit: ${t.nama}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-black ${
                            editingId === t.id ? "bg-brand-yellow text-black" : "bg-white"
                          }`}
                        >
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => arsipkanLintas(t.id)}
                          aria-label={`Arsipkan: ${t.nama}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white"
                        >
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">archive</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setKonfirmasiHapus(t.id)}
                          aria-label={`Hapus: ${t.nama}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-brand-brick text-white"
                        >
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">delete</span>
                        </button>
                      </>
                    )}
                  </span>
                </div>
                {editingId === t.id && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block font-label text-[10px] font-extrabold uppercase text-brand-navy">Tenggat</span>
                      <input
                        type="date"
                        value={/^\d{4}-\d{2}-\d{2}/.test(t.deadline) ? t.deadline.slice(0, 10) : ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          ubahLintas(t.id, { deadline: e.target.value })
                        }
                        className="h-9 w-full rounded-lg border-2 border-black bg-white px-2 font-label text-xs"
                        aria-label={`Tenggat ${t.nama}`}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-label text-[10px] font-extrabold uppercase text-brand-navy">Prioritas</span>
                      <select
                        value={t.prioritas}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          ubahLintas(t.id, { prioritas: e.target.value as Prioritas })
                        }
                        className="h-9 w-full rounded-lg border-2 border-black bg-white px-2 font-label text-xs"
                        aria-label={`Prioritas ${t.nama}`}
                      >
                        <option value="tinggi">Tinggi</option>
                        <option value="sedang">Sedang</option>
                        <option value="normal">Normal</option>
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block font-label text-[10px] font-extrabold uppercase text-brand-navy">Catatan</span>
                      <textarea
                        value={t.notes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          ubahLintas(t.id, { notes: e.target.value })
                        }
                        rows={2}
                        placeholder="Catatan tugas…"
                        className="w-full rounded-lg border-2 border-black bg-white px-2 py-1.5 font-body text-sm outline-none focus:bg-brand-paper"
                        aria-label={`Catatan ${t.nama}`}
                      />
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {/* Cari Semua Tugas — lintas sumber, record yang sama, tanpa salinan */}
      <section aria-label="Cari semua tugas" className="mt-5 rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Cari Semua Tugas</h2>
          <span className="rounded-full border-[3px] border-black bg-white px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
            {hasilCari.length} Cocok
          </span>
        </div>
        <p className="mt-1 font-body text-xs text-brand-muted">
          Mencari di judul, catatan, sumber, status, prioritas, dan tenggat — semua sumber. Aksi di bawah mengubah tugas yang sama.
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
              onClick={() => { setCcQ(""); setCcKondisi("semua"); }}
              className="shrink-0 rounded-full border-2 border-black bg-brand-brick px-3 py-1.5 font-label text-xs font-extrabold uppercase text-white"
            >
              Atur Ulang
            </button>
          )}
        </div>
        {hasilCari.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-black/30 bg-white p-3 text-center text-xs text-brand-muted">
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
                        onClick={() => pulihkanArsipSemua(h.id)}
                        className="h-9 rounded-full border-2 border-black bg-brand-yellow px-2.5 font-label text-[10px] font-extrabold uppercase text-black"
                      >
                        Pulihkan
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => geserHasilCari(h.id, -1)}
                          disabled={h.status === "todo"}
                          aria-label={`Mundur: ${h.judul}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white disabled:opacity-30"
                        >
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">chevron_left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => geserHasilCari(h.id, 1)}
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

      {/* Arsip — gabungan tugas sendiri + lintas; tak ikut progres */}
      <section aria-label="Arsip tugas" className="mt-5 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Arsip</h2>
          <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
            {tugasArsipOwn.length + lintas.filter((t) => t.arsip).length} Arsip
          </span>
        </div>
        <p className="mt-1 font-body text-xs text-brand-muted">
          Tugas yang diarsipkan tidak dihitung di progres dan tidak tampil di papan. Pulihkan untuk mengembalikan, atau hapus permanen bila benar-benar tak perlu.
        </p>
        {tugasArsipOwn.length + lintas.filter((t) => t.arsip).length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-black/30 bg-white p-3 text-center text-xs text-brand-muted">
            Arsip kosong — pakai tombol arsip pada tugas untuk menyingkirkan tanpa menghapus.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {tugasArsipOwn.map((t) => (
              <li key={t.id} className="rounded-xl border-2 border-black bg-brand-paper px-3 py-2 shadow-[2px_2px_0px_#000000]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-sm font-bold text-brand-navy">{t.nama}</span>
                    <span className="mt-0.5 block font-body text-xs text-brand-muted">Planner • {t.kolom === "done" ? "Selesai" : t.kolom === "doing" ? "Dikerjakan" : "Belum Dikerjakan"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => pulihkanArsipSemua(t.id)}
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
            {lintas.filter((t) => t.arsip).map((t) => (
              <li key={t.id} className="rounded-xl border-2 border-black bg-brand-paper px-3 py-2 shadow-[2px_2px_0px_#000000]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-sm font-bold text-brand-navy">{t.nama}</span>
                    <span className="mt-0.5 block font-body text-xs text-brand-muted">{t.sumber} • {t.status === "done" ? "Selesai" : t.status === "doing" ? "Dikerjakan" : "Belum Dikerjakan"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => pulihkanArsipSemua(t.id)}
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

      <div className="mt-4">
        <button
          type="button"
          onClick={openAdd}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border-[3px] border-black bg-brand-yellow font-label text-sm font-extrabold text-brand-navy shadow-brutal transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          ➕ Tambah Tugas Baru
        </button>
      </div>

      {/* Tim + undang — di bawah tombol Tambah agar tidak menumpuk di atas. */}
      <div className="mt-5 flex flex-col space-y-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
        <div className="flex items-center justify-between">
          <span className="font-label text-xs font-bold">👥 Tim Penguji & Rekan Sejawat</span>
          <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
            AKSES BACA & KOMENTAR
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {["SD", "NH", "RF", "SA"].map((a) => (
            <div key={a} className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-black bg-brand-panel font-label text-xs font-extrabold shadow-brutal" title={`Avatar contoh ${a}`}>
              {a}
            </div>
          ))}
          <button
            type="button"
            onClick={async () => {
              const ok = await copyLinkWithFallback(window.location.href);
              showToast(ok ? "Tautan halaman disalin ke clipboard!" : "Gagal menyalin — browser memblokir clipboard!");
            }}
            className="flex h-11 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3.5 font-label text-xs font-bold shadow-brutal transition-transform hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            🔗 Salin link
          </button>
        </div>
        <p className="text-[11px] text-brand-muted">Avatar di atas hanya contoh (statis) — daftar tim belum tersambung ke akun mana pun.</p>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-brand-navy/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={editingId ? "Edit tugas" : "Tugas baru"} onClick={() => setShowForm(false)}>
          <div ref={dialogRef} tabIndex={-1} className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{editingId ? "Edit Tugas" : "Tugas Baru"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-white shadow-brutal-sm" aria-label="Tutup">
                ✕
              </button>
            </div>
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Nama tugas *</span>
              <input ref={firstInputRef} value={fNama} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFNama(e.target.value)} className={inputCls} placeholder="cth: Revisi Bab 2" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Tanggal</span>
                <input type="date" value={fDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFDate(e.target.value)} className={inputCls} />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Jam</span>
                <input type="time" value={fJam} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFJam(e.target.value)} className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Ruang</span>
                <input value={fRuang} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFRuang(e.target.value)} className={inputCls} placeholder="cth: R. Dosen 302" />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Durasi (mnt)</span>
                <input type="number" min={5} value={fDurasi} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFDurasi(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Prioritas</span>
              <select value={fPrioritas} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFPrioritas(e.target.value as Prioritas)} className={inputCls}>
                <option value="normal">Normal</option>
                <option value="sedang">Sedang</option>
                <option value="tinggi">Tinggi</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Deskripsi</span>
              <textarea value={fDeskripsi} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFDeskripsi(e.target.value)} rows={3} className="w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 py-2 font-body text-sm outline-none focus:bg-white" placeholder="Detail tugas…" />
            </label>
            <button
              type="button"
              onClick={saveForm}
              className="h-12 w-full rounded-full border-[3px] border-black bg-brand-blue font-label text-xs font-bold uppercase text-white shadow-brutal transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              💾 {editingId ? "Simpan Perubahan" : "Simpan Tugas"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div aria-live="polite" className="fixed bottom-24 left-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center justify-between gap-2 rounded-2xl border-[3px] border-black bg-brand-navy px-4 py-3 text-white shadow-brutal md:bottom-6 md:left-auto md:right-6 md:w-auto md:min-w-[280px]">
          <span className="font-body text-sm">✔ {toast}</span>
          <button type="button" onClick={() => setToast(null)} className="font-label text-xs font-bold underline">
            Tutup
          </button>
        </div>
      )}
    </ToolShell>
  );
}
