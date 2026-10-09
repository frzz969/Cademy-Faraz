// Store workspace riset halaman literatur — murni + localStorage.
// Semua data hanya di browser (localStorage), tanpa server.
//
// KONTRAK DATA (jangan diubah sepihak):
// - Artikel: {id, title, authors[], year, source, doi?, oaUrl?, citedBy?,
//   original?, diperbaiki?}. Field API diambil apa adanya; kosong bila tak ada
//   (jangan karang). `original` = SNAPSHOT API asli, immutable, diambil sekali
//   saat koreksi pertama (lihat applyMetaEdit di @cademy/utils/proyek).
//   `diperbaiki` = true bila metadata pernah dikoreksi pengguna.
// - Key "cademy:literatur-favs-v1":
//   {articles, collections, readingStatus, notes, tags} persis.
//   Bentuk salah → reset aman (jangan crash; panggil yang me-load memberi toast).
// - Dedup: DOI dinormalisasi (strip prefix https://doi.org/ / doi:, lalu
//   lowercase), fallback id OpenAlex (saat simpan + tampil).
// - Kolom matriks milik pengguna (tujuan/metode/sampel/variabel/temuan/
//   keterbatasan/relevansi) disimpan di key TERPISAH "cademy:literatur-matrix-v1"
//   agar bentuk store favorit tetap persis kontrak. Kolom "catatan" matriks
//   memakai notes yang sama dengan catatan favorit (satu sumber, tidak ganda).
// - Relasi referensi↔proyek skripsi: key ADITIF "cademy:proj-refs-v1"
//   (kontrak di @cademy/utils/proyek). Hanya tautan by articleId — artikel
//   TIDAK disalin. Relasi orphan TIDAK diprune (ditandai saja).

import {
  emptyProjRefsStore,
  parseProjRefsStore,
  type MetaFields,
  type ProjRefsStore,
} from "@cademy/utils/proyek";

export interface Article extends MetaFields {
  id: string;
  /** Snapshot metadata API asli — immutable setelah koreksi pertama. */
  original?: MetaFields;
  /** True bila metadata dikoreksi pengguna (bukan berarti "terverifikasi"). */
  diperbaiki?: boolean;
}

export type ReadingStatus = "belum" | "proses" | "selesai";
export const STATUS_LABEL: Record<ReadingStatus, string> = {
  belum: "Belum dibaca",
  proses: "Sedang dibaca",
  selesai: "Selesai",
};

export interface Collection {
  id: string;
  name: string;
  articleIds: string[];
  createdAt: string;
}

export interface FavsStore {
  articles: Record<string, Article>;
  collections: Collection[];
  readingStatus: Record<string, ReadingStatus>;
  notes: Record<string, string>;
  tags: Record<string, string[]>;
}

export const MATRIX_FIELDS = [
  "tujuan",
  "metode",
  "sampel",
  "variabel",
  "temuan",
  "keterbatasan",
  "relevansi",
] as const;
export type MatrixField = (typeof MATRIX_FIELDS)[number];
export type MatrixRow = Record<MatrixField, string>;

export const FAVS_KEY = "cademy:literatur-favs-v1";
export const MATRIX_KEY = "cademy:literatur-matrix-v1";

// PREFILL_KEY didefinisikan di @cademy/utils/citation (nilai tetap
// "cademy:cite-prefill-v1" agar data lama kompatibel); diekspor ulang
// di sini agar impor lama dari "./store" tetap jalan.
export { PREFILL_KEY } from "@cademy/utils/citation";

/** Bentuk mentah OpenAlex secukupnya untuk dipetakan ke Article. */
export interface OpenAlexWorkLike {
  id?: string;
  display_name?: string | null;
  title?: string | null;
  doi?: string | null;
  publication_year?: number | null;
  cited_by_count?: number | null;
  authorships?: Array<{ author?: { display_name?: string } }>;
  primary_location?: {
    source?: { display_name?: string | null };
  } | null;
  open_access?: { oa_url?: string | null } | null;
}

/** Jembatan ke halaman sitasi — dibaca sekali saat mount lalu dihapus. */
export interface CitePrefill {
  title: string;
  authors: string[];
  year: number | null;
  journal: string;
  doi: string;
  url: string;
}

export function freshFavs(): FavsStore {
  return {
    articles: {},
    collections: [],
    readingStatus: {},
    notes: {},
    tags: {},
  };
}

export function uid(): string {
  try {
    const c = globalThis.crypto as unknown as
      | { randomUUID?: () => string }
      | undefined;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* abaikan — pakai fallback */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function slugifyNama(s: string): string {
  const t = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return t || "koleksi";
}

/**
 * Petakan hasil OpenAlex ke Article kontrak. Field diambil apa adanya;
 * yang tak ada dikosongkan ("" / [] / null / undefined) — jangan karang.
 * Kembali null bila tanpa id OpenAlex yang stabil (tak bisa disimpan).
 */
export function toArticle(w: OpenAlexWorkLike): Article | null {
  const id = typeof w?.id === "string" ? w.id : "";
  if (!id) return null;
  const authors = (w?.authorships ?? [])
    .map((a) => a?.author?.display_name?.trim())
    .filter((n): n is string => Boolean(n));
  const year =
    typeof w?.publication_year === "number" ? w.publication_year : null;
  const doi =
    typeof w?.doi === "string" && w.doi ? w.doi : undefined;
  const oaUrl =
    typeof w?.open_access?.oa_url === "string" && w.open_access.oa_url
      ? w.open_access.oa_url
      : undefined;
  const citedBy =
    typeof w?.cited_by_count === "number" ? w.cited_by_count : undefined;
  return {
    id,
    title: w?.display_name ?? w?.title ?? "",
    authors,
    year,
    source: w?.primary_location?.source?.display_name ?? "",
    ...(doi ? { doi } : {}),
    ...(oaUrl ? { oaUrl } : {}),
    ...(citedBy !== undefined ? { citedBy } : {}),
  };
}

/** Kunci dedup: DOI dinormalisasi (strip prefix https://doi.org/ / doi:,
 * lalu lowercase + trim), fallback id OpenAlex. */
export function dedupKeyOf(a: { id: string; doi?: string }): string {
  let d = (a.doi ?? "").trim();
  d = d.replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:\s*/i, "");
  d = d.toLowerCase();
  return d || a.id;
}

/** Gabungkan duplikat (DOI sama) — pertahankan kemunculan pertama. */
export function dedupArticles(list: Article[]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of list) {
    const k = dedupKeyOf(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

/** Cari id tersimpan yang duplikat dengan artikel (untuk cek saat simpan). */
export function findDupId(store: FavsStore, a: Article): string | null {
  const k = dedupKeyOf(a);
  for (const [id, cur] of Object.entries(store.articles)) {
    if (dedupKeyOf(cur) === k) return id;
  }
  return null;
}

export function authorsLabel(authors: string[]): string {
  if (authors.length === 0) return "—";
  if (authors.length <= 3) return authors.join(", ");
  return `${authors.slice(0, 3).join(", ")} dkk.`;
}

/** Tulis jembatan sitasi lalu panggil router ke /tools/citation. */
export function makePrefill(a: Article): CitePrefill {
  return {
    title: a.title,
    authors: a.authors,
    year: a.year,
    journal: a.source,
    doi: a.doi ?? "",
    url: a.oaUrl ?? a.doi ?? "",
  };
}

// ---- Validasi & load/save ----

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isMetaFields(v: unknown): v is MetaFields {
  if (!isRecord(v)) return false;
  if (typeof v["title"] !== "string") return false;
  if (
    !Array.isArray(v["authors"]) ||
    !(v["authors"] as unknown[]).every((x) => typeof x === "string")
  )
    return false;
  if (typeof v["year"] !== "number" && v["year"] !== null) return false;
  if (typeof v["source"] !== "string") return false;
  if (v["doi"] !== undefined && typeof v["doi"] !== "string") return false;
  if (v["oaUrl"] !== undefined && typeof v["oaUrl"] !== "string") return false;
  if (v["citedBy"] !== undefined && typeof v["citedBy"] !== "number")
    return false;
  return true;
}

function isArticle(v: unknown): v is Article {
  if (!isRecord(v)) return false;
  if (typeof v["id"] !== "string" || !v["id"]) return false;
  if (typeof v["title"] !== "string") return false;
  if (
    !Array.isArray(v["authors"]) ||
    !(v["authors"] as unknown[]).every((x) => typeof x === "string")
  )
    return false;
  if (typeof v["year"] !== "number" && v["year"] !== null) return false;
  if (typeof v["source"] !== "string") return false;
  if (v["doi"] !== undefined && typeof v["doi"] !== "string") return false;
  if (v["oaUrl"] !== undefined && typeof v["oaUrl"] !== "string") return false;
  if (v["citedBy"] !== undefined && typeof v["citedBy"] !== "number")
    return false;
  // Snapshot metadata (opsional, aditif) — divalidasi hanya bila ada.
  if (v["original"] !== undefined && !isMetaFields(v["original"])) return false;
  if (v["diperbaiki"] !== undefined && typeof v["diperbaiki"] !== "boolean")
    return false;
  return true;
}

function isCollection(v: unknown): v is Collection {
  if (!isRecord(v)) return false;
  if (typeof v["id"] !== "string") return false;
  if (typeof v["name"] !== "string") return false;
  if (
    !Array.isArray(v["articleIds"]) ||
    !(v["articleIds"] as unknown[]).every((x) => typeof x === "string")
  )
    return false;
  if (typeof v["createdAt"] !== "string") return false;
  return true;
}

/** Guard skema store favorit — bentuk salah berarti data rusak. */
export function isFavsStore(v: unknown): v is FavsStore {
  if (!isRecord(v)) return false;
  if (!isRecord(v["articles"])) return false;
  for (const a of Object.values(v["articles"])) if (!isArticle(a)) return false;
  if (!Array.isArray(v["collections"])) return false;
  for (const c of v["collections"] as unknown[]) if (!isCollection(c)) return false;
  if (!isRecord(v["readingStatus"])) return false;
  for (const s of Object.values(v["readingStatus"])) {
    if (s !== "belum" && s !== "proses" && s !== "selesai") return false;
  }
  if (!isRecord(v["notes"])) return false;
  for (const n of Object.values(v["notes"])) if (typeof n !== "string") return false;
  if (!isRecord(v["tags"])) return false;
  for (const t of Object.values(v["tags"])) {
    if (!Array.isArray(t) || !(t as unknown[]).every((x) => typeof x === "string"))
      return false;
  }
  return true;
}

/** Bersihkan matriks: root bukan objek → kosong; baris rusak (bukan objek)
 * dilewati/dibuang (toleran, tidak throw); sel rusak → "".
 * Penghitung baris terbuang ada di loadMatrix (selisih jumlah key → direset:true
 * agar toast view menyala). */
export function sanitizeMatrix(v: unknown): Record<string, MatrixRow> {
  if (!isRecord(v)) return {};
  const out: Record<string, MatrixRow> = {};
  for (const [id, row] of Object.entries(v)) {
    if (!isRecord(row)) continue;
    const clean = {} as MatrixRow;
    for (const f of MATRIX_FIELDS) {
      const val = row[f];
      clean[f] = typeof val === "string" ? val : "";
    }
    out[id] = clean;
  }
  return out;
}

export function loadFavs(): { store: FavsStore; direset: boolean } {
  try {
    const raw = localStorage.getItem(FAVS_KEY);
    if (!raw) return { store: freshFavs(), direset: false };
    const parsed: unknown = JSON.parse(raw);
    if (isFavsStore(parsed)) return { store: parsed, direset: false };
    return { store: freshFavs(), direset: true };
  } catch {
    return { store: freshFavs(), direset: true };
  }
}

export function saveFavs(store: FavsStore): void {
  try {
    localStorage.setItem(FAVS_KEY, JSON.stringify(store));
  } catch {
    /* abaikan — storage penuh/diblokir */
  }
}

export function loadMatrix(): {
  matrix: Record<string, MatrixRow>;
  direset: boolean;
} {
  try {
    const raw = localStorage.getItem(MATRIX_KEY);
    if (!raw) return { matrix: {}, direset: false };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { matrix: {}, direset: true };
    const matrix = sanitizeMatrix(parsed);
    // Toleran: baris rusak dibuang oleh sanitizeMatrix; bila ada yang
    // terbuang (jumlah key menyusut) kembalikan direset:true agar toast menyala.
    const direset = Object.keys(matrix).length !== Object.keys(parsed).length;
    return { matrix, direset };
  } catch {
    return { matrix: {}, direset: true };
  }
}

export function saveMatrix(matrix: Record<string, MatrixRow>): void {
  try {
    localStorage.setItem(MATRIX_KEY, JSON.stringify(matrix));
  } catch {
    /* abaikan */
  }
}

// ---- Cadangan JSON (ekspor/impor koleksi + relasi proyek) ----
// Versi 2 = ekspor saat ini (favs + matrix + projRefs).
// Versi 1 = backup LAMA (hanya favs + matrix) — tetap bisa diimpor:
// projRefs diberi default aman (kosong), favs/matrix tetap dipulihkan.

export interface BackupFile {
  app: "cademy-literatur-backup";
  version: 2;
  exportedAt: string;
  favs: FavsStore;
  matrix: Record<string, MatrixRow>;
  projRefs: ProjRefsStore;
}

export function makeBackup(
  favs: FavsStore,
  matrix: Record<string, MatrixRow>,
  projRefs: ProjRefsStore = emptyProjRefsStore(),
): BackupFile {
  return {
    app: "cademy-literatur-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    favs,
    matrix,
    projRefs,
  };
}

export function parseBackup(
  v: unknown,
):
  | {
      ok: true;
      favs: FavsStore;
      matrix: Record<string, MatrixRow>;
      projRefs: ProjRefsStore;
    }
  | { ok: false; pesan: string } {
  if (!isRecord(v)) return { ok: false, pesan: "File cadangan rusak — bukan JSON objek." };
  if (v["app"] !== "cademy-literatur-backup")
    return { ok: false, pesan: "File cadangan rusak — bukan cadangan literatur Cademy." };
  if (v["version"] !== 1 && v["version"] !== 2)
    return { ok: false, pesan: "File cadangan rusak — versi cadangan tidak dikenal." };
  if (!isFavsStore(v["favs"]))
    return { ok: false, pesan: "File cadangan rusak — data favorit/koleksi tidak valid." };
  if (!isRecord(v["matrix"]))
    return { ok: false, pesan: "File cadangan rusak — data matriks tidak valid." };
  // Backup v1 (lama) tidak punya projRefs → default aman, TIDAK menghapus apa pun.
  const projRefs =
    v["version"] === 2 ? parseProjRefsStore(v["projRefs"]) : emptyProjRefsStore();
  return { ok: true, favs: v["favs"], matrix: sanitizeMatrix(v["matrix"]), projRefs };
}

// ---- Relasi referensi ↔ proyek skripsi (key aditif; artikel TIDAK disalin) ----

export { PROJ_REFS_KEY } from "@cademy/utils/proyek";

export function loadProjRefs(): ProjRefsStore {
  try {
    const raw = localStorage.getItem("cademy:proj-refs-v1");
    if (!raw) return emptyProjRefsStore();
    return parseProjRefsStore(JSON.parse(raw));
  } catch {
    return emptyProjRefsStore();
  }
}

export function saveProjRefs(store: ProjRefsStore): void {
  try {
    localStorage.setItem("cademy:proj-refs-v1", JSON.stringify(store));
  } catch {
    /* abaikan — storage penuh/diblokir */
  }
}

// ---- Baris CSV ----

export const SEARCH_CSV_HEADER = [
  "judul",
  "penulis",
  "tahun",
  "sumber",
  "doi",
  "url_oa",
  "disitasi",
];

export function searchCsvRow(a: Article): unknown[] {
  return [
    a.title,
    a.authors.join("; "),
    a.year ?? "",
    a.source,
    a.doi ?? "",
    a.oaUrl ?? "",
    a.citedBy ?? "",
  ];
}

export const MATRIX_CSV_HEADER = [
  "judul",
  "penulis",
  "tahun",
  "sumber",
  "doi",
  "tujuan",
  "metode",
  "sampel",
  "variabel",
  "temuan",
  "keterbatasan",
  "relevansi",
  "catatan",
];

export function matrixCsvRow(
  a: Article,
  row: MatrixRow | undefined,
  catatan: string,
): unknown[] {
  return [
    a.title,
    a.authors.join("; "),
    a.year ?? "",
    a.source,
    a.doi ?? "",
    row?.tujuan ?? "",
    row?.metode ?? "",
    row?.sampel ?? "",
    row?.variabel ?? "",
    row?.temuan ?? "",
    row?.keterbatasan ?? "",
    row?.relevansi ?? "",
    catatan,
  ];
}

// Matriks literatur dalam Markdown (satu entri per artikel). Kolom pengguna
// yang kosong dirender "—" agar jelas belum diisi.
export function buildMatrixMarkdown(
  scopeName: string,
  items: Array<{ article: Article; row?: MatrixRow; catatan: string }>,
): string {
  const garis = [
    "# Matriks Literatur",
    "",
    `Koleksi: ${scopeName}`,
    `Jumlah artikel: ${items.length}`,
    `Diekspor: ${new Date().toISOString()}`,
    "",
    "Kolom metadata dari API; kolom lainnya diisi manual penulis dan tidak otomatis.",
  ];
  for (const { article: a, row, catatan } of items) {
    garis.push(
      "",
      `## ${a.title || "(tanpa judul)"}`,
      `- Penulis: ${a.authors.length ? a.authors.join("; ") : "—"}`,
      `- Tahun: ${a.year ?? "—"}`,
      `- Sumber: ${a.source || "—"}`,
      `- DOI: ${a.doi ?? "—"}`,
      `- Akses terbuka: ${a.oaUrl ?? "—"}`,
      `- Sitasi: ${a.citedBy ?? "—"}`,
      `- Tujuan: ${row?.tujuan?.trim() || "—"}`,
      `- Metode: ${row?.metode?.trim() || "—"}`,
      `- Sampel: ${row?.sampel?.trim() || "—"}`,
      `- Variabel: ${row?.variabel?.trim() || "—"}`,
      `- Temuan: ${row?.temuan?.trim() || "—"}`,
      `- Keterbatasan: ${row?.keterbatasan?.trim() || "—"}`,
      `- Relevansi dengan skripsi: ${row?.relevansi?.trim() || "—"}`,
      `- Catatan: ${catatan?.trim() || "—"}`,
    );
  }
  return garis.join("\n");
}
