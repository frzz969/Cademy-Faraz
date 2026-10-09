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
