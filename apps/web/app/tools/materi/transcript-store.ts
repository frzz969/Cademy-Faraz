// Store Transkrip Belajar — murni + localStorage (local-first, tanpa backend).
// Key berversi BARU `cademy:transcripts-v1`; tidak menyentuh key Tahap 2
// (`cademy:workspaces-v1`, `cademy:tasks-v1`, `cademy:materi-progress`).
// Hanya teks + metadata kecil. JANGAN simpan blob media (audio/video) di sini.

import { isValidHttpUrl, uid, nowIso } from "./store";

export const TRANSCRIPTS_KEY = "cademy:transcripts-v1";

/** Maksimum ukuran file caption yang dibaca (2 MB) — tolak blob besar. */
export const MAX_CAPTION_BYTES = 2_000_000;
/** Maksimum panjang teks transkrip yang disimpan (~200 ribu karakter). */
export const MAX_TEKS = 200_000;

export const T_LIMITS = {
  items: 100,
  judul: 150,
  sumber: 120,
  url: 2000,
  catatan: 5000,
  catatanPerItem: 200,
  bookmarkPerItem: 100,
  labelBookmark: 120,
} as const;

export type TranscriptAsal = "paste" | "file-srt" | "file-vtt" | "tautan";

export const ASAL_LABEL: Record<TranscriptAsal, string> = {
  paste: "Tempel manual",
  "file-srt": "Berkas .srt",
  "file-vtt": "Berkas .vtt",
  tautan: "Dari tautan video",
};

export interface TranscriptNote {
  id: string;
  teks: string;
  createdAt: string;
}

export interface TranscriptBookmark {
  id: string;
  label: string;
  /** Kutipan teks apa adanya saat bookmark dibuat (bukan timestamp). */
  excerpt: string;
  createdAt: string;
}

export interface Transcript {
  id: string;
  judul: string;
  /** Label sumber manual, mis. "Kuliah YouTube — Statistika". */
  sumber: string;
  /** URL sumber opsional (hanya format yang divalidasi, bukan fetch). */
  sumberUrl: string;
  /** Tanggal sumber (YYYY-MM-DD), diisi user. */
  tanggal: string;
  teks: string;
  catatan: TranscriptNote[];
  bookmark: TranscriptBookmark[];
  /** Tautan ke ruang/topik materi (ids saja — orphans ditandai, tak diprune). */
  workspaceId?: string;
  topicId?: string;
  asal: TranscriptAsal;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptsStore {
  version: 1;
  items: Transcript[];
  updatedAt: string;
}

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function isAsal(v: unknown): v is TranscriptAsal {
  return v === "paste" || v === "file-srt" || v === "file-vtt" || v === "tautan";
}

export function freshTranscripts(): TranscriptsStore {
  return { version: 1, items: [], updatedAt: nowIso() };
}

// ---------- Pembersih caption .srt/.vtt → teks baca ----------

export interface CleanResult {
  teks: string;
  /** Jumlah baris timestamp/nomor cue yang dibuang (nyata, bukan persen). */
  barisDibuang: number;
  /** Jumlah baris kembar berurutan yang digabung. */
  kembarDigabung: number;
  /** True bila input tampak bukan caption (tanpa timestamp sama sekali). */
  tanpaTimestamp: boolean;
}

const TIMESTAMP_LINE = /-->/;
const CUE_NUMBER = /^\d+\s*$/;
const INLINE_STAMP = /\[\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\]/g;
const PAREN_STAMP = /\(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\)/g;
const HTML_TAG = /<[^>]*>/g;

/**
 * Bersihkan isi .srt/.vtt menjadi teks baca.
 * - Buang: header WEBVTT, blok NOTE, nomor cue, baris timestamp, tag <...>.
 * - TIDAK PERNAH membuat timestamp/speaker baru — label pembicara asli
 *   (mis. "DOSEN: ...") dibiarkan apa adanya.
 */
export function cleanSrtVtt(raw: string): CleanResult {
  const normalized = raw.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const lines = normalized.split("\n");
  const kept: string[] = [];
  let barisDibuang = 0;
  let sawTimestamp = false;
  let inNote = false;

  for (const line of lines) {
    const t = line.trim();
    if (inNote) {
      if (t === "") inNote = false;
      barisDibuang += 1;
      continue;
    }
    if (/^NOTE(\s|$)/.test(t)) {
      inNote = true;
      barisDibuang += 1;
      continue;
    }
    if (t === "" || /^WEBVTT/.test(t)) {
      if (t !== "") barisDibuang += 1;
      continue;
    }
    if (TIMESTAMP_LINE.test(t)) {
      sawTimestamp = true;
      barisDibuang += 1;
      continue;
    }
    if (CUE_NUMBER.test(t)) {
      barisDibuang += 1;
      continue;
    }
    const bersih = t.replace(HTML_TAG, "").replace(INLINE_STAMP, "").replace(PAREN_STAMP, "").replace(/\s{2,}/g, " ").trim();
    if (!bersih) {
      barisDibuang += 1;
      continue;
    }
    kept.push(bersih);
  }

  // Gabung baris kembar berurutan (umum di caption yang tumpang tindih).
  const dedup: string[] = [];
  let kembarDigabung = 0;
  for (const l of kept) {
    if (dedup.length > 0 && dedup[dedup.length - 1] === l) kembarDigabung += 1;
    else dedup.push(l);
  }

  return { teks: dedup.join("\n"), barisDibuang, kembarDigabung, tanpaTimestamp: !sawTimestamp };
}

/** Nama file caption yang didukung: hanya .srt / .vtt. */
export function isSupportedCaptionFile(name: string): boolean {
  return /\.srt$/i.test(name.trim()) || /\.vtt$/i.test(name.trim());
}

export function captionAsal(name: string): TranscriptAsal {
  return /\.vtt$/i.test(name.trim()) ? "file-vtt" : "file-srt";
}

// ---------- Validasi URL media (format saja, tanpa fetch) ----------

export type MediaUrlKind = "youtube" | "zoom" | "lain" | "invalid";

export interface MediaUrlInfo {
  kind: MediaUrlKind;
  /** Penjelasan jujur keterbatasan — ditampilkan apa adanya di UI. */
  note: string;
}

export function detectMediaUrl(v: string): MediaUrlInfo {
  const t = v.trim();
  if (!isValidHttpUrl(t)) {
    return { kind: "invalid", note: "Bukan tautan http(s) yang valid. Periksa kembali tautannya." };
  }
  let host = "";
  try {
    host = new URL(t).hostname.toLowerCase();
  } catch {
    return { kind: "invalid", note: "Bukan tautan http(s) yang valid. Periksa kembali tautannya." };
  }
  if (host === "youtu.be" || host.endsWith(".youtu.be") || host === "youtube.com" || host.endsWith(".youtube.com") || host === "music.youtube.com") {
    return {
      kind: "youtube",
      note: "Cademy tidak mengunduh otomatis dari YouTube. Unduhan caption butuh subtitle publik/akses yang tidak selalu tersedia — cara pasti: salin teks caption lalu tempel, atau unggah berkas .srt/.vtt bila ada.",
    };
  }
  if (host === "zoom.us" || host.endsWith(".zoom.us")) {
    return {
      kind: "zoom",
      note: "Cademy tidak mengambil data dari Zoom — rekaman/transkrip Zoom umumnya butuh login. Cara pasti: ekspor transkrip dari Zoom, lalu tempel atau unggah berkasnya di sini.",
    };
  }
  return {
    kind: "lain",
    note: "Cademy tidak mengambil isi dari tautan ini. Tautan hanya disimpan sebagai rujukan; isi transkrip tetap dari teks yang kamu tempel/unggah.",
  };
}

// ---------- Validasi input sebelum simpan ----------

export function validateTranscriptInput(judul: string, teks: string): string[] {
  const errors: string[] = [];
  if (!judul.trim()) errors.push("Isi dulu judul transkripnya.");
  if (!teks.trim()) errors.push("Teks transkrip masih kosong — tempel atau unggah dulu.");
  if (teks.length > MAX_TEKS) {
    errors.push(`Teks terlalu besar (${teks.length.toLocaleString("id-ID")} karakter, maks ${MAX_TEKS.toLocaleString("id-ID")}). Potong atau bagi menjadi beberapa transkrip.`);
  }
  return errors;
}

// ---------- Cari dalam transkrip ----------

export interface TranscriptSearch {
  total: number;
  /** Paragraf yang cocok (maks 50), apa adanya. */
  parts: string[];
}

export function searchTranscript(teks: string, query: string): TranscriptSearch {
  const q = query.trim().toLowerCase();
  if (!q) return { total: 0, parts: [] };
  const paras = teks.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  const hits = paras.filter((p) => p.toLowerCase().includes(q));
  return { total: hits.length, parts: hits.slice(0, 50) };
}

// ---------- Sanitasi + storage ----------

function sanitizeNote(v: unknown): TranscriptNote | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const teks = str(o["teks"], T_LIMITS.catatan);
  if (!teks) return null;
  return {
    id: typeof o["id"] === "string" && o["id"] ? o["id"] : uid(),
    teks,
    createdAt: typeof o["createdAt"] === "string" ? o["createdAt"] : nowIso(),
  };
}

function sanitizeBookmark(v: unknown): TranscriptBookmark | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const label = str(o["label"], T_LIMITS.labelBookmark);
  if (!label) return null;
  return {
    id: typeof o["id"] === "string" && o["id"] ? o["id"] : uid(),
    label,
    excerpt: str(o["excerpt"], 500),
    createdAt: typeof o["createdAt"] === "string" ? o["createdAt"] : nowIso(),
  };
}

export function sanitizeTranscript(v: unknown): Transcript | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const judul = str(o["judul"], T_LIMITS.judul);
  const teks = typeof o["teks"] === "string" ? o["teks"].trim().slice(0, MAX_TEKS) : "";
  if (!judul || !teks) return null;
  const createdAt = typeof o["createdAt"] === "string" ? o["createdAt"] : nowIso();
  return {
    id: typeof o["id"] === "string" && o["id"] ? o["id"] : uid(),
    judul,
    sumber: str(o["sumber"], T_LIMITS.sumber),
    sumberUrl: str(o["sumberUrl"], T_LIMITS.url),
    tanggal: typeof o["tanggal"] === "string" ? (o["tanggal"] as string).slice(0, 10) : "",
    teks,
    catatan: Array.isArray(o["catatan"])
      ? (o["catatan"] as unknown[]).map(sanitizeNote).filter((n): n is TranscriptNote => n !== null).slice(0, T_LIMITS.catatanPerItem)
      : [],
    bookmark: Array.isArray(o["bookmark"])
      ? (o["bookmark"] as unknown[]).map(sanitizeBookmark).filter((b): b is TranscriptBookmark => b !== null).slice(0, T_LIMITS.bookmarkPerItem)
      : [],
    workspaceId: typeof o["workspaceId"] === "string" && o["workspaceId"] ? o["workspaceId"] : undefined,
    topicId: typeof o["topicId"] === "string" && o["topicId"] ? o["topicId"] : undefined,
    asal: isAsal(o["asal"]) ? o["asal"] : "paste",
    createdAt,
    updatedAt: typeof o["updatedAt"] === "string" ? (o["updatedAt"] as string) : createdAt,
  };
}

export function parseTranscripts(v: unknown): { ok: boolean; store: TranscriptsStore; dropped: number } {
  if (!v || typeof v !== "object") return { ok: false, store: freshTranscripts(), dropped: 0 };
  const o = v as Record<string, unknown>;
  if (o["version"] !== 1 || !Array.isArray(o["items"])) {
    return { ok: false, store: freshTranscripts(), dropped: 0 };
  }
  const out: Transcript[] = [];
  let dropped = 0;
  for (const item of (o["items"] as unknown[]).slice(0, T_LIMITS.items)) {
    const s = sanitizeTranscript(item);
    if (s) out.push(s);
    else dropped += 1;
  }
  return { ok: true, store: { version: 1, items: out, updatedAt: nowIso() }, dropped };
}

export function loadTranscripts(): { store: TranscriptsStore; corrupt: boolean; dropped: number } {
  try {
    const raw = localStorage.getItem(TRANSCRIPTS_KEY);
    if (!raw) return { store: freshTranscripts(), corrupt: false, dropped: 0 };
    const parsed = parseTranscripts(JSON.parse(raw) as unknown);
    if (!parsed.ok) return { store: freshTranscripts(), corrupt: true, dropped: 0 };
    return { store: parsed.store, corrupt: false, dropped: parsed.dropped };
  } catch {
    return { store: freshTranscripts(), corrupt: true, dropped: 0 };
  }
}

/** Simpan. false = gagal (kuota/privasi) — pemanggil wajib memberi tahu user. */
export function saveTranscripts(store: TranscriptsStore): boolean {
  try {
    localStorage.setItem(TRANSCRIPTS_KEY, JSON.stringify({ ...store, updatedAt: nowIso() }));
    return true;
  } catch {
    return false;
  }
}

// ---------- Unduh TXT (dari data nyata milik user) ----------

export function buildTxtExport(t: Transcript): string {
  const lines = [
    t.judul,
    `Sumber: ${t.sumber || "(tanpa label sumber)"}${t.sumberUrl ? ` — ${t.sumberUrl}` : ""}`,
    `Tanggal: ${t.tanggal || "(tanpa tanggal)"} • Asal: ${ASAL_LABEL[t.asal]}`,
    "",
    "TRANSKRIP",
    t.teks,
  ];
  if (t.catatan.length > 0) {
    lines.push("", "CATATAN");
    for (const n of t.catatan) lines.push(`- ${n.teks}`);
  }
  if (t.bookmark.length > 0) {
    lines.push("", "PENANDA");
    for (const b of t.bookmark) lines.push(`- ${b.label}${b.excerpt ? `: "${b.excerpt}"` : ""}`);
  }
  return lines.join("\n");
}
