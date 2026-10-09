// Integrasi Riset → Skripsi — kontrak data murni (tanpa React/browser/network).
//
// PRINSIP (dikunci pemilik, Phase 16):
// 1. Referensi TIDAK disalin. Artikel tetap entitas di store literatur
//    (`cademy:literatur-favs-v1`); proyek hanya menyimpan TAUTAN by articleId.
// 2. Satu artikel bisa dipakai banyak proyek/bab — idempoten, tanpa duplikasi.
// 3. `dikutip` = status yang DITANDAI PENGGUNA, bukan bukti naskah diperiksa.
// 4. Relasi orphan (projectId tak ditemukan saat load) DITANDAI, TIDAK diprune.
// 5. Metadata API asli disimpan sebagai snapshot `original` immutable saat
//    koreksi pertama; koreksi berikutnya tak menimpa snapshot. Notes/tags
//    milik store literatur dan tidak pernah disentuh fungsi di file ini.
// 6. Tak ada klaim "terverifikasi" — hanya "lengkap" / "perlu diperiksa".

/** Bab/bagian dalam satu proyek skripsi. */
export interface SectionRef {
  id: string;
  nama: string;
}

/** Tautan satu artikel ke satu proyek. */
export interface RefLink {
  /** id section (bab) tempat artikel dipakai. */
  sections: string[];
  /** Ditandai dikutip oleh pengguna — BUKAN bukti naskah sudah dicek. */
  dikutip: boolean;
}

export interface ProjectRefs {
  sections: SectionRef[];
  refs: Record<string, RefLink>;
  /** Gaya sitasi pilihan pengguna untuk daftar pustaka proyek ini. */
  gayaSitasi: string;
}

export interface ProjRefsStore {
  version: 1;
  byProject: Record<string, ProjectRefs>;
}

export const PROJ_REFS_VERSION = 1;

/** Key localStorage relasi referensi ↔ proyek (aditif; tak mengubah key lain). */
export const PROJ_REFS_KEY = "cademy:proj-refs-v1";

export const CITE_STYLES = [
  "APA 7",
  "MLA 9",
  "Chicago",
  "IEEE",
  "Harvard",
  "BibTeX",
] as const;
export type CiteStyle = (typeof CITE_STYLES)[number];

/** Sections default — id stabil, urutan tetap. */
export function defaultSections(): SectionRef[] {
  return [
    { id: "bab1", nama: "Bab 1 — Pendahuluan" },
    { id: "bab2", nama: "Bab 2 — Tinjauan Pustaka" },
    { id: "bab3", nama: "Bab 3 — Metode" },
    { id: "bab4", nama: "Bab 4 — Hasil & Pembahasan" },
    { id: "bab5", nama: "Bab 5 — Penutup" },
    { id: "lampiran", nama: "Lampiran" },
  ];
}

export function defaultProjRefs(gayaSitasi: string = "APA 7"): ProjectRefs {
  return { sections: defaultSections(), refs: {}, gayaSitasi };
}

export function emptyProjRefsStore(): ProjRefsStore {
  return { version: PROJ_REFS_VERSION, byProject: {} };
}

function isSectionList(v: unknown): SectionRef[] {
  if (!Array.isArray(v)) return defaultSections();
  const out: SectionRef[] = [];
  for (const s of v as unknown[]) {
    if (typeof s !== "object" || s === null) continue;
    const r = s as Record<string, unknown>;
    if (typeof r["id"] === "string" && typeof r["nama"] === "string") {
      out.push({ id: r["id"], nama: r["nama"] });
    }
  }
  return out.length > 0 ? out : defaultSections();
}

function isRefLink(v: unknown): RefLink | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  const sections = Array.isArray(r["sections"])
    ? (r["sections"] as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return { sections, dikutip: r["dikutip"] === true };
}

/**
 * Guard parse — TOLERAN: data rusak/parsial tidak menghapus yang valid.
 * Relasi orphan (projectId tak dikenal view) TETAP dibawa; pemanggil yang
 * memutuskan menandainya — tidak ada prune di sini.
 */
export function parseProjRefsStore(raw: unknown): ProjRefsStore {
  const store = emptyProjRefsStore();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return store;
  const o = raw as Record<string, unknown>;
  if (o["version"] !== PROJ_REFS_VERSION) return store;
  const byProject = o["byProject"];
  if (typeof byProject !== "object" || byProject === null || Array.isArray(byProject))
    return store;
  for (const [pid, pv] of Object.entries(byProject as Record<string, unknown>)) {
    if (typeof pv !== "object" || pv === null) continue;
    const r = pv as Record<string, unknown>;
    const refs: Record<string, RefLink> = {};
    if (typeof r["refs"] === "object" && r["refs"] !== null && !Array.isArray(r["refs"])) {
      for (const [aid, lv] of Object.entries(r["refs"] as Record<string, unknown>)) {
        const link = isRefLink(lv);
        if (link) refs[aid] = link;
      }
    }
    store.byProject[pid] = {
      sections: isSectionList(r["sections"]),
      refs,
      gayaSitasi:
        typeof r["gayaSitasi"] === "string" && r["gayaSitasi"]
          ? r["gayaSitasi"]
          : "APA 7",
    };
  }
  return store;
}

/** Daftar projectId yang TIDAK ada di daftar proyek dikenal (orphan — jangan dihapus). */
export function orphanProjectIds(
  store: ProjRefsStore,
  knownProjectIds: string[],
): string[] {
  const known = new Set(knownProjectIds);
  return Object.keys(store.byProject).filter((pid) => !known.has(pid));
}

function ensureProject(
  store: ProjRefsStore,
  projectId: string,
  gayaSitasi?: string,
): ProjectRefs {
  const existing = store.byProject[projectId];
  if (existing) return existing;
  const created = defaultProjRefs(gayaSitasi);
  store.byProject[projectId] = created;
  return created;
}

/**
 * Tautkan artikel ke proyek — IDEMPOTEN: memanggil dua kali dengan
 * articleId+sections sama menghasilkan satu entri (tak ada duplikasi).
 */
export function linkRef(
  store: ProjRefsStore,
  projectId: string,
  articleId: string,
  sections: string[],
  dikutip = false,
): ProjRefsStore {
  if (!projectId.trim() || !articleId.trim()) return store;
  const proj = ensureProject(store, projectId);
  const uniq = [...new Set(sections.filter(Boolean))];
  const prev = proj.refs[articleId];
  proj.refs[articleId] = {
    sections: uniq,
    dikutip: prev ? prev.dikutip || dikutip : dikutip,
  };
  return store;
}

export function setDikutip(
  store: ProjRefsStore,
  projectId: string,
  articleId: string,
  dikutip: boolean,
): ProjRefsStore {
  const proj = store.byProject[projectId];
  const link = proj?.refs[articleId];
  if (!proj || !link) return store;
  link.dikutip = dikutip;
  return store;
}

export function unlinkRef(
  store: ProjRefsStore,
  projectId: string,
  articleId: string,
): ProjRefsStore {
  const proj = store.byProject[projectId];
  if (proj) delete proj.refs[articleId];
  return store;
}

export function refsForProject(
  store: ProjRefsStore,
  projectId: string,
): Array<{ articleId: string; link: RefLink }> {
  const proj = store.byProject[projectId];
  if (!proj) return [];
  return Object.entries(proj.refs).map(([articleId, link]) => ({ articleId, link }));
}

/**
 * Adapter: bentuk rata {articleId, dikutip} untuk buildDaftarPustaka.
 * Dipakai agar pemanggial tak salah mengambil `link.dikutip` vs `dikutip`.
 */
export function refLinksFlat(
  store: ProjRefsStore,
  projectId: string,
): Array<{ articleId: string; dikutip: boolean }> {
  return refsForProject(store, projectId).map(({ articleId, link }) => ({
    articleId,
    dikutip: link.dikutip,
  }));
}

// ---- Metadata: snapshot immutable ----

/** Field metadata referensi yang bisa dikoreksi pengguna. */
export interface MetaFields {
  title: string;
  authors: string[];
  year: number | null;
  source: string;
  doi?: string;
  oaUrl?: string;
  citedBy?: number;
}

export type MetaEditable<T extends MetaFields> = T & {
  /** Snapshot API asli — diambil SEKALI saat koreksi pertama, lalu immutable. */
  original?: MetaFields;
  /** True bila metadata pernah dikoreksi pengguna. */
  diperbaiki?: boolean;
};

function snapshotOf<T extends MetaFields>(a: T): MetaFields {
  return {
    title: a.title,
    authors: [...a.authors],
    year: a.year,
    source: a.source,
    doi: a.doi,
    oaUrl: a.oaUrl,
    citedBy: a.citedBy,
  };
}

/**
 * Terapkan koreksi metadata. Snapshot `original` diambil HANYA bila belum ada
 * (koreksi berikutnya tak menimpa snapshot asli). Field di luar metadata
 * (mis. notes/tags milik store literatur) dipertahankan apa adanya.
 */
export function applyMetaEdit<T extends MetaFields>(
  article: T,
  patch: Partial<MetaFields>,
): MetaEditable<T> {
  const merged = { ...article, ...patch } as MetaEditable<T>;
  if (!merged.original) merged.original = snapshotOf(article);
  merged.diperbaiki = true;
  return merged;
}

/** Kembalikan ke metadata API asli (snapshot tetap disimpan sebagai jejak). */
export function restoreMeta<T extends MetaFields>(
  article: MetaEditable<T>,
): MetaEditable<T> {
  if (!article.original) return article;
  return {
    ...article,
    ...snapshotOf(article.original),
    original: article.original,
    diperbaiki: false,
  };
}

/** Status metadata untuk sitasi: "lengkap" atau "perlu diperiksa" + field hilang. */
export function statusMetadata(a: MetaFields): {
  status: "lengkap" | "perlu diperiksa";
  hilang: string[];
} {
  const hilang: string[] = [];
  if (!a.title.trim()) hilang.push("judul");
  if (a.authors.length === 0) hilang.push("penulis");
  if (a.year === null || !Number.isFinite(a.year)) hilang.push("tahun");
  if (!a.source.trim()) hilang.push("sumber");
  return { status: hilang.length === 0 ? "lengkap" : "perlu diperiksa", hilang };
}

// ---- Daftar pustaka ----

export interface DaftarPustakaItem {
  articleId: string;
  title: string;
  sitasi: string;
  metaHilang: string[];
}

export interface DaftarPustaka {
  gaya: string;
  onlyCited: boolean;
  items: DaftarPustakaItem[];
  /** articleId yang sudah ditautkan tapi artikelnya tidak ada di favorit. */
  hilang: string[];
  /** Jumlah artikel dengan metadata belum lengkap. */
  perluDiperiksa: number;
}

interface FmtInput {
  judul: string;
  penulis: string;
  tahun: string;
  penerbit: string;
  identifier: string;
  jenis: "Jurnal" | "Buku" | "Skripsi/Tesis" | "Web";
  volume: string;
  issue: string;
  halaman: string;
  edisi: string;
  institusi: string;
  jenisKarya: string;
  situs: string;
}

/** Formatter disuntikkan agar modul ini tidak bergantung pada citation.ts (hindari siklus). */
export type Formatter = (d: FmtInput, authors: string[], diakses?: string) => string;

function articleToFmtInput(a: MetaFields): FmtInput {
  return {
    judul: a.title,
    penulis: a.authors.join("; "),
    tahun: a.year !== null && Number.isFinite(a.year) ? String(a.year) : "",
    penerbit: a.source,
    identifier: a.doi ?? a.oaUrl ?? "",
    jenis: "Jurnal",
    volume: "",
    issue: "",
    halaman: "",
    edisi: "",
    institusi: "",
    jenisKarya: "",
    situs: "",
  };
}

/**
 * Bangun daftar pustaka proyek dari referensi yang DITAUTKAN pengguna.
 * `onlyCited` = hanya yang ditandai dikutip (dikelola pengguna, bukan
 * hasil pemeriksaan naskah). Artikel yang tak ada di favorit DILEWATI +
 * dicatat di `hilang` (tidak dikarang).
 */
export function buildDaftarPustaka<T extends MetaFields>(
  links: Array<{ articleId: string; dikutip: boolean }>,
  articles: Record<string, T>,
  gaya: string,
  onlyCited: boolean,
  formatter: Formatter,
  diakses?: string,
): DaftarPustaka {
  const items: DaftarPustakaItem[] = [];
  const hilang: string[] = [];
  let perluDiperiksa = 0;
  for (const { articleId, dikutip } of links) {
    if (onlyCited && !dikutip) continue;
    const a = articles[articleId];
    if (!a) {
      hilang.push(articleId);
      continue;
    }
    const { hilang: metaHilang } = statusMetadata(a);
    if (metaHilang.length > 0) perluDiperiksa += 1;
    const authors = a.authors.length > 0 ? a.authors : [];
    items.push({
      articleId,
      title: a.title || "(tanpa judul)",
      sitasi: formatter(articleToFmtInput(a), authors, diakses),
      metaHilang,
    });
  }
  return { gaya, onlyCited, items, hilang, perluDiperiksa };
}
