// Helper tanggal murni — tanpa DOM/localStorage.

/** "2026-10-09" dari objek Date (waktu lokal). */
export function toISODate(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Senin (00:00) dari pekan yang memuat `base`. Tak mengubah argumen. */
export function mondayOfWeek(base: Date): Date {
  const d = new Date(base);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface ItemTersaring {
  judul: string;
  /** Tag kartu kanban, atau deskripsi untuk agenda. */
  tag: string;
  prioritas: string;
}

/**
 * Predikat filter + pencarian untuk papan jadwal (murni, bisa diuji).
 * `filter` = "semua" atau nama prioritas; `cari` case-insensitive
 * terhadap judul/tag.
 */
export function cocokFilterTugas(
  item: ItemTersaring,
  filter: "semua" | string,
  cari: string,
): boolean {
  if (filter !== "semua" && item.prioritas !== filter) return false;
  const q = cari.trim().toLowerCase();
  if (!q) return true;
  return (
    item.judul.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q)
  );
}

/** Filter pintar berbasis tanggal. Nama prioritas juga diterima sebagai filter. */
export type FilterCepat =
  | "semua"
  | "hari-ini"
  | "minggu-ini"
  | "terlambat"
  | "belum"
  | "selesai"
  | "tinggi"
  | "sedang"
  | "rendah"
  | "normal";

/** Ambil bagian ISO (yyyy-mm-dd) dari dueDate bebas; null bila tak ada. */
export function parseTanggalISO(
  due: string | null | undefined,
  hariIni = new Date()
): string | null {
  if (typeof due !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(due.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  // Normalisasi supaya aman terhadap "2026-1-5" sekalipun.
  void hariIni;
  return toISODate(d);
}

/** Terlambat = deadline sudah lewat (hari ini > deadline) dan belum selesai. */
export function tugasTerlambat(
  status: string,
  due: string | null | undefined,
  hariIni = new Date()
): boolean {
  if (status === "done") return false;
  const iso = parseTanggalISO(due);
  if (!iso) return false;
  const batas = new Date(`${iso}T00:00:00`);
  const kini = new Date(hariIni);
  kini.setHours(0, 0, 0, 0);
  return kini.getTime() > batas.getTime();
}

/**
 * Filter pintar: prioritas (lewat cocokFilterTugas) + kondisi tanggal/status.
 * `filter` boleh juga nama prioritas — dua mode hidup bersama.
 */
export function cocokFilterCepat(
  item: ItemTersaring & { status?: string; dueDate?: string },
  filter: FilterCepat | string,
  cari: string,
  hariIni = new Date()
): boolean {
  const cocokPrioritas = cocokFilterTugas(item, filter, cari);
  const q = cari.trim().toLowerCase();
  if (filter === "semua" || q) return cocokPrioritas;
  if (["hari-ini", "minggu-ini", "terlambat", "belum", "selesai"].includes(filter)) {
    const status = item.status ?? "todo";
    if (filter === "selesai") return status === "done";
    if (filter === "belum") return status !== "done";
    const iso = parseTanggalISO(item.dueDate, hariIni);
    if (filter === "terlambat") return tugasTerlambat(status, item.dueDate, hariIni);
    if (!iso) return false;
    if (filter === "hari-ini") return iso === toISODate(hariIni);
    const senin = mondayOfWeek(hariIni);
    const minggu = new Date(senin);
    minggu.setDate(senin.getDate() + 6);
    return iso >= toISODate(senin) && iso <= toISODate(minggu);
  }
  return cocokPrioritas;
}
