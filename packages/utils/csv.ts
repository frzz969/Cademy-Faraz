// Util CSV murni — tanpa React/browser/network.
// Dipakai halaman literatur untuk tombol "Unduh CSV" (hasil cari + matriks).
//
// Aturan yang ditegakkan:
// 1. Sel kosong (null/undefined/"") ditulis sebagai sel kosong — bukan "null".
// 2. Sel yang memuat kutip (") / koma (,) / newline (\n, \r) dibungkus "..."
//    dan kutip di dalamnya digandakan (""). Ini aturan escaping RFC 4180.
// 3. Header selalu ditulis sebagai baris pertama, konsisten apa adanya.
// 4. Baris dipisah "\r\n" agar rapi dibuka di Excel/Sheets.
// 5. File yang diunduh wajib diawali BOM UTF-8 ("\uFEFF") supaya Excel
//    Windows tidak merusak huruf Indonesia (é, —, dst).

/** BOM UTF-8 — tempel di awal string CSV sebelum diunduh. */
export const CSV_BOM = "\uFEFF";

/** Ubah satu nilai menjadi sel CSV yang aman (kosong bila tak ada). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "";
  if (/["\n\r,]/.test(s)) return `"${s.replace(/"/g, `""`)}"`;
  return s;
}

/**
 * Bangun string CSV dari header + baris-baris.
 * Seluruh sel dilewatkan csvCell; baris dipisah "\r\n" tanpa newline penutup.
 */
export function buildCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

/** buildCsv + BOM UTF-8 di depan — siap ditulis ke Blob untuk diunduh. */
export function buildCsvWithBom(header: string[], rows: unknown[][]): string {
  return CSV_BOM + buildCsv(header, rows);
}
