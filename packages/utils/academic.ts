// Rumus akademik murni — tanpa DOM, localStorage, atau tanggal.
// Dipakai oleh view gpa, grade, dan thesis-checker. Skala/ambang selalu
// dilewatkan sebagai parameter agar mudah diuji dan diganti.

export interface SksRow {
  sks: number;
  /** Poin mutu skala 4,0 (mis. A = 4.0). */
  poin: number;
}

/**
 * Normalisasi angka gaya Indonesia: koma desimal ("3,5") diterima,
 * spasi dirapikan, dan input tak-angka DITOLAK eksplisit (null).
 *
 * PERUBAHAN PERILAKU DISENGAJA: dulu view memakai `Number(x) || 0`
 * sehingga "abc"/"" diam-diam jadi 0. Kini kembalikan null supaya
 * view bisa menampilkan error validasi, bukan menghitung dengan 0 palsu.
 */
export function parseDesimal(
  value: string | number | null | undefined,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const t = value.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** IP semester = total bobot (sks × poin) / total sks. 0 bila tak ada sks. */
export function ipSemester(rows: SksRow[]): number {
  const totalSks = rows.reduce((a, r) => a + r.sks, 0);
  if (totalSks <= 0) return 0;
  const totalBobot = rows.reduce((a, r) => a + r.sks * r.poin, 0);
  return totalBobot / totalSks;
}

/**
 * IPK kumulatif dari riwayat (sksLalu × ipkLalu) + semester berjalan.
 * `fallback` dipakai saat belum ada sks sama sekali (dulu: IP semester).
 */
export function ipkKumulatif(
  sksLalu: number,
  ipkLalu: number,
  totalSks: number,
  totalBobot: number,
  fallback = 0,
): number {
  const penyebut = sksLalu + totalSks;
  if (penyebut <= 0) return fallback;
  return (sksLalu * ipkLalu + totalBobot) / penyebut;
}

/** Predikat kelulusan acuan umum (bukan aturan resmi kampus mana pun). */
export function predikatIpk(ipk: number): string {
  if (ipk >= 3.51) return "Cumlaude";
  if (ipk >= 2.76) return "Sangat Memuaskan";
  if (ipk >= 2.0) return "Memuaskan";
  return "Perlu ditingkatkan";
}

/**
 * Rata-rata IP yang dibutuhkan di sisa SKS agar mencapai target.
 * 0 bila sisaSks <= 0 (tak bisa dihitung). Nilai > 4 berarti target
 * praktis tak tercapai; < 0 berarti target sudah tercapai.
 */
export function butuhIpTarget(
  target: number,
  sksTempuh: number,
  bobotTempuh: number,
  sisaSks: number,
): number {
  if (sisaSks <= 0) return 0;
  return (target * (sksTempuh + sisaSks) - bobotTempuh) / sisaSks;
}

// ---- Nilai sidang (skala umum 9-huruf) ----

/** Skala umum 9-huruf — BUKAN SK resmi; cek aturan kampusmu. */
export function hurufDanPredikat(skor: number): {
  huruf: string;
  desc: string;
} {
  if (skor >= 85) return { huruf: "A", desc: "Sangat Memuaskan (Cumlaude)" };
  if (skor >= 80) return { huruf: "A-", desc: "Sangat Baik" };
  if (skor >= 75) return { huruf: "B+", desc: "Baik Sekali" };
  if (skor >= 70) return { huruf: "B", desc: "Baik" };
  if (skor >= 65) return { huruf: "C+", desc: "Cukup Memuaskan" };
  if (skor >= 55) return { huruf: "C", desc: "Cukup" };
  if (skor >= 41) return { huruf: "D", desc: "Kurang" };
  return { huruf: "E", desc: "Tidak Lulus" };
}

/** Keputusan sidang berbasis skor (simulasi — bukan keputusan resmi kampus). */
export function keputusanSidang(skor: number): string {
  if (skor >= 85) return "Lulus Sidang Utama";
  if (skor >= 70) return "Lulus Revisi Minor";
  if (skor >= 55) return "Lulus Bersyarat";
  return "Tidak Lulus / Mengulang";
}

/** Bobot penilai dijaga 10–80%. */
export function clampBobot(v: number): number {
  return Math.min(80, Math.max(10, Math.round(v) || 0));
}

/** Nilai penilai dijaga 0–100. */
export function clampNilai(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v) || 0));
}

// ---- Thesis checker ----

export interface ProgressThesis {
  hit: number;
  total: number;
  pct: number;
}

/**
 * Progress checklist dari id yang dikenal saja.
 *
 * PERUBAHAN PERILAKU DISENGAJA: dulu `hit` dihitung dari SEMUA key
 * `done` (termasuk id basi dari versi lama), sehingga pct bisa > 100%.
 * Kini hanya id pada `knownIds` yang dihitung.
 */
export function hitungProgressThesis(
  done: Record<string, boolean>,
  knownIds: string[],
): ProgressThesis {
  const total = knownIds.length;
  const hit = knownIds.filter((id) => done[id] === true).length;
  const pct = total > 0 ? Math.round((hit / total) * 100) : 0;
  return { hit, total, pct };
}
