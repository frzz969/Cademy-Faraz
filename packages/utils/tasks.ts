// Pencarian lintas-tool pada data aktual (murni, tanpa DOM/store).
// Satu aturan untuk semua halaman: teks cocok terhadap judul, catatan,
// sumber, status, prioritas, dan tenggat (case-insensitive); kondisi
// menyaring aktif/selesai/terlambat/arsip. Arsip hanya muncul bila
// kondisi = "arsip" — daftar "semua" tidak mengaduk arsip ke papan aktif.
import { tugasTerlambat } from "./dates";

export interface EntriCari {
  id: string;
  judul: string;
  /** Gabungan deskripsi + catatan bebas (disiapkan pemanggil). */
  catatan: string;
  /** Label sumber apa adanya, cth. "Roadmap" / "Jadwal" / "planner". */
  sumber: string;
  status: string;
  prioritas: string;
  dueDate?: string;
  arsip?: boolean;
  /** contoh (bukan data pengguna) — tampil berlabel, tak dihitung progres */
  demo?: boolean;
}

export type KondisiCari = "semua" | "aktif" | "selesai" | "terlambat" | "arsip";

export interface KriteriaCari {
  q?: string;
  kondisi?: KondisiCari;
}

export const KONDISI_LABEL: Record<KondisiCari, string> = {
  semua: "Semua",
  aktif: "Aktif",
  selesai: "Selesai",
  terlambat: "Terlambat",
  arsip: "Arsip",
};

/** Record minimal agar pemetaan store → entri cari sama di semua halaman. */
export interface RecordCari {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  source: string;
  status: string;
  prioritas: string;
  dueDate?: string;
  arsip?: boolean;
  demo?: boolean;
}

const LABEL_SUMBER: Record<string, string> = {
  jadwal: "Jadwal",
  roadmap: "Roadmap",
  materi: "Materi",
  planner: "Planner",
  pribadi: "Pribadi",
};

/** Petakan record store ke entri cari (tanpa salinan data tugas). */
export function entriCariSemua(all: RecordCari[]): EntriCari[] {
  return all.map((t) => ({
    id: t.id,
    judul: t.title,
    catatan: [t.description ?? "", t.notes ?? ""].filter(Boolean).join(" — "),
    sumber: LABEL_SUMBER[t.source] ?? t.source,
    status: t.status,
    prioritas: t.prioritas,
    ...(t.dueDate ? { dueDate: t.dueDate } : {}),
    ...(t.arsip ? { arsip: true as const } : {}),
    ...(t.demo ? { demo: true as const } : {}),
  }));
}

// ── Rumus progres tunggal (Tahap 3B, dipakai roadmap + papan) ──────────────
// Aturan: subtugas menang atas status; tanpa subtugas ikut status
// (done=100, doing=50, selain itu 0). Rata-rata per langkah (bukan per fase
// lalu rata-rata lagi) supaya tak ada hitung ganda; fase/roadmap kosong = 0.
// Bobot per langkah SENGAJA tidak ada (ditunda — butuh desain + ACC).

export interface LangkahProgres {
  selesai: boolean;
  subtasks?: Array<{ done: boolean }>;
  /** status store bila ada (untuk nilai doing=50); default "todo". */
  status?: string;
}

/** Progres satu langkah 0–100. */
export function progresLangkah(l: LangkahProgres): number {
  const subs = Array.isArray(l.subtasks) ? l.subtasks : [];
  if (subs.length > 0) {
    const ok = subs.filter((s) => s.done).length;
    return Math.round((ok / subs.length) * 100);
  }
  if (l.selesai) return 100;
  if ((l.status ?? "todo") === "doing") return 50;
  return 0;
}

/** Progres fase = rata-rata langkahnya, dibulatkan; tanpa langkah = 0. */
export function progresFase(steps: LangkahProgres[]): number {
  if (steps.length === 0) return 0;
  const total = steps.reduce((a, s) => a + progresLangkah(s), 0);
  return Math.round(total / steps.length);
}

/** Progres roadmap = rata-rata SEMUA langkah (bukan rata-rata fase). */
export function progresRoadmap(fases: LangkahProgres[][]): number {
  const semua = fases.flat();
  if (semua.length === 0) return 0;
  const total = semua.reduce((a, s) => a + progresLangkah(s), 0);
  return Math.round(total / semua.length);
}

/**
 * Saring daftar lintas-tool. Mengembalikan referensi entri yang sama
 * (tanpa salinan) dalam urutan masuk — pemanggil memutasi via ID.
 */
export function cariLintasTugas(
  items: EntriCari[],
  kriteria: KriteriaCari = {},
  hariIni = new Date()
): EntriCari[] {
  const q = (kriteria.q ?? "").trim().toLowerCase();
  const kondisi: KondisiCari = kriteria.kondisi ?? "semua";
  return items.filter((t) => {
    const diarsip = t.arsip === true;
    if (kondisi === "arsip") {
      if (!diarsip) return false;
    } else if (diarsip) {
      return false;
    } else if (kondisi === "aktif") {
      if (t.status === "done") return false;
    } else if (kondisi === "selesai") {
      if (t.status !== "done") return false;
    } else if (kondisi === "terlambat") {
      if (!tugasTerlambat(t.status, t.dueDate, hariIni)) return false;
    }
    if (!q) return true;
    const hay = [t.judul, t.catatan, t.sumber, t.status, t.prioritas, t.dueDate ?? ""]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
