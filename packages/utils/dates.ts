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

/**
 * Kisi kalender bulanan: selalu 42 sel (6 pekan × 7 hari, Senin–Minggu),
 * mulai Senin pekan yang memuat tanggal 1. Selalu waktu lokal 00:00,
 * tanpa geser zona waktu (tak ada konversi UTC/ISO-Z di sini).
 */
export function gridKalender(tahun: number, bulanIdx: number): Date[] {
  const pertama = new Date(tahun, bulanIdx, 1, 0, 0, 0, 0);
  const awal = mondayOfWeek(pertama);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(awal);
    d.setDate(awal.getDate() + i);
    return d;
  });
}

/** Kunci "yyyy-mm-dd" untuk mencocokkan tenggat (waktu lokal). */
export function kunciTanggal(d: Date): string {
  return toISODate(d);
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

/** Ambil bagian ISO (yyyy-mm-dd) dari dueDate bebas; null bila tak ada/tak valid. */
export function parseTanggalISO(
  due: string | null | undefined,
  hariIni = new Date()
): string | null {
  if (typeof due !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(due.trim());
  if (!m) return null;
  const thn = Number(m[1]);
  const bln = Number(m[2]);
  const tgl = Number(m[3]);
  if (bln < 1 || bln > 12 || tgl < 1 || tgl > 31) return null;
  const d = new Date(thn, bln - 1, tgl);
  if (Number.isNaN(d.getTime())) return null;
  // Tolak tanggal kalender tak valid ("2026-02-30", "2026-13-01") yang
  // bergeser (rollover) — jangan kembalikan tanggal palsu.
  if (
    d.getFullYear() !== thn ||
    d.getMonth() !== bln - 1 ||
    d.getDate() !== tgl
  )
    return null;
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
 * Pencarian (`cari`) selalu digabung (AND) dengan filter tanggal/status,
 * jadi mengetik saat filter "hari-ini" aktif tetap menyaring, bukan kosong.
 */
export function cocokFilterCepat(
  item: ItemTersaring & { status?: string; dueDate?: string },
  filter: FilterCepat | string,
  cari: string,
  hariIni = new Date()
): boolean {
  const q = cari.trim().toLowerCase();
  const cocokCari =
    !q ||
    item.judul.toLowerCase().includes(q) ||
    item.tag.toLowerCase().includes(q);
  if (filter === "semua") return cocokCari;
  if (["hari-ini", "minggu-ini", "terlambat", "belum", "selesai"].includes(filter)) {
    const status = item.status ?? "todo";
    let cocokKondisi: boolean;
    if (filter === "selesai") cocokKondisi = status === "done";
    else if (filter === "belum") cocokKondisi = status !== "done";
    else if (filter === "terlambat")
      cocokKondisi = tugasTerlambat(status, item.dueDate, hariIni);
    else {
      const iso = parseTanggalISO(item.dueDate, hariIni);
      if (!iso) cocokKondisi = false;
      else if (filter === "hari-ini") cocokKondisi = iso === toISODate(hariIni);
      else {
        const senin = mondayOfWeek(hariIni);
        const minggu = new Date(senin);
        minggu.setDate(senin.getDate() + 6);
        cocokKondisi = iso >= toISODate(senin) && iso <= toISODate(minggu);
      }
    }
    return cocokKondisi && cocokCari;
  }
  return cocokFilterTugas(item, filter, cari);
}
