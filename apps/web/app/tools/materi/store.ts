// Store Ruang Belajar Materi — murni + localStorage (local-first, tanpa backend).
// Key berversi `cademy:workspaces-v1`. TIDAK menimpa `cademy:tasks-v1`
// (tugas bersama) maupun `cademy:materi-progress` (arsip lama, hanya dibaca
// sekali saat migrasi). Tanpa dependensi baru; tanpa blob besar di localStorage.

export const WORKSPACES_KEY = "cademy:workspaces-v1";
export const LEGACY_PROGRESS_KEY = "cademy:materi-progress";
export const LEGACY_LAST_KEY = "cademy:materi-last";

export type TopicStatus = "belum" | "mulai" | "selesai";

export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  belum: "Belum mulai",
  mulai: "Sedang dipelajari",
  selesai: "Selesai",
};

export interface Topic {
  id: string;
  title: string;
  status: TopicStatus;
  /** Tujuan/target kecil milik user untuk topik ini (opsional). */
  objective: string;
  /** Tautan ke SharedTask di `cademy:tasks-v1` (dibuat via task-store). */
  taskId?: string;
  /**
   * Tautan hasil Smart Handoff Tahap 3 (opsional, aditif).
   * Disimpan manual oleh user per topik: URL + alasan "kenapa berguna".
   * Tidak ada di snapshot Tahap 2 — sanitize mempertahankannya bila valid.
   */
  tautan?: TopicTautan[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Tautan eksternal yang disimpan user ke sebuah topik (Tahap 3).
 * `jenis` dideklarasikan user sendiri — Cademy TIDAK memverifikasi
 * peer-review / open-access / kebenaran isi.
 */
export type TautanJenis = "eksternal" | "catatan" | "ringkasan-ai";

export const TAUTAN_JENIS_LABEL: Record<TautanJenis, string> = {
  eksternal: "Hasil eksternal — perlu verifikasi",
  catatan: "Catatan sendiri",
  "ringkasan-ai": "Ringkasan AI — tulis ulang sendiri",
};

export interface TopicTautan {
  id: string;
  url: string;
  label: string;
  /** Alasan user: "kenapa tautan ini berguna". */
  note: string;
  /** Dideklarasikan user, bukan hasil verifikasi Cademy. */
  jenis: TautanJenis;
  savedAt: string;
}

export interface SourceLink {
  id: string;
  label: string;
  url: string;
}

export interface CourseTask {
  id: string;
  title: string;
  deadline: string;
  done: boolean;
  /** Tautan ke SharedTask di `cademy:tasks-v1` (dibuat via task-store). */
  taskId?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  matkul: string;
  instruksi: string;
  catatan: string;
  sumber: SourceLink[];
  topik: Topic[];
  tugas: CourseTask[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspacesStore {
  version: 1;
  workspaces: Workspace[];
  /** Workspace aktif terakhir (resume). */
  lastId: string | null;
  updatedAt: string;
}

// Batas aman agar localStorage tidak dipakai untuk blob besar.
export const LIMITS = {
  workspaces: 50,
  topikPerWs: 200,
  sumberPerWs: 100,
  tugasPerWs: 200,
  matkul: 120,
  judulTopik: 200,
  objective: 500,
  instruksi: 20000,
  catatan: 20000,
  labelSumber: 120,
  urlSumber: 2000,
  judulTugas: 200,
  tautanPerTopik: 20,
  labelTautan: 120,
  urlTautan: 2000,
  noteTautan: 500,
} as const;

export function uid(): string {
  try {
    const c = globalThis.crypto as unknown as
      | { randomUUID?: () => string }
      | undefined;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* abaikan */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function isStatus(v: unknown): v is TopicStatus {
  return v === "belum" || v === "mulai" || v === "selesai";
}

export function freshStore(): WorkspacesStore {
  return { version: 1, workspaces: [], lastId: null, updatedAt: nowIso() };
}

export function freshWorkspace(matkul: string): Workspace {
  const t = nowIso();
  return {
    id: uid(),
    matkul: str(matkul, LIMITS.matkul),
    instruksi: "",
    catatan: "",
    sumber: [],
    topik: [],
    tugas: [],
    createdAt: t,
    updatedAt: t,
  };
}

function isTautanJenis(v: unknown): v is TautanJenis {
  return v === "eksternal" || v === "catatan" || v === "ringkasan-ai";
}

export function sanitizeTopicTautan(v: unknown): TopicTautan | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const url = str(o["url"], LIMITS.urlTautan);
  if (!url) return null;
  const label = str(o["label"], LIMITS.labelTautan);
  const savedAt = typeof o["savedAt"] === "string" && o["savedAt"] ? o["savedAt"] : nowIso();
  return {
    id: typeof o["id"] === "string" && o["id"] ? o["id"] : uid(),
    url,
    label: label || url,
    note: str(o["note"], LIMITS.noteTautan),
    jenis: isTautanJenis(o["jenis"]) ? o["jenis"] : "eksternal",
    savedAt,
  };
}

function sanitizeTopic(v: unknown): Topic | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const title = str(o["title"], LIMITS.judulTopik);
  if (!title) return null;
  const t = typeof o["createdAt"] === "string" ? o["createdAt"] : nowIso();
  const rawTautan = Array.isArray(o["tautan"])
    ? (o["tautan"] as unknown[])
        .map(sanitizeTopicTautan)
        .filter((x): x is TopicTautan => x !== null)
        .slice(0, LIMITS.tautanPerTopik)
    : [];
  return {
    id: typeof o["id"] === "string" && o["id"] ? o["id"] : uid(),
    title,
    status: isStatus(o["status"]) ? o["status"] : "belum",
    objective: str(o["objective"], LIMITS.objective),
    taskId: typeof o["taskId"] === "string" && o["taskId"] ? o["taskId"] : undefined,
    // Aditif Tahap 3: snapshot lama tanpa `tautan` tetap valid (undefined).
    ...(rawTautan.length > 0 ? { tautan: rawTautan } : {}),
    createdAt: t,
    updatedAt: typeof o["updatedAt"] === "string" ? (o["updatedAt"] as string) : t,
  };
}

function sanitizeSource(v: unknown): SourceLink | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const url = str(o["url"], LIMITS.urlSumber);
  const label = str(o["label"], LIMITS.labelSumber);
  if (!url && !label) return null;
  return {
    id: typeof o["id"] === "string" && o["id"] ? o["id"] : uid(),
    label: label || url,
    url,
  };
}

function sanitizeTask(v: unknown): CourseTask | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const title = str(o["title"], LIMITS.judulTugas);
  if (!title) return null;
  return {
    id: typeof o["id"] === "string" && o["id"] ? o["id"] : uid(),
    title,
    deadline: typeof o["deadline"] === "string" ? (o["deadline"] as string).slice(0, 10) : "",
    done: o["done"] === true,
    taskId: typeof o["taskId"] === "string" && o["taskId"] ? o["taskId"] : undefined,
    createdAt: typeof o["createdAt"] === "string" ? (o["createdAt"] as string) : nowIso(),
  };
}

function sanitizeWorkspace(v: unknown): Workspace | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const matkul = str(o["matkul"], LIMITS.matkul);
  if (!matkul) return null;
  const topik = Array.isArray(o["topik"])
    ? (o["topik"] as unknown[])
        .map(sanitizeTopic)
        .filter((t): t is Topic => t !== null)
        .slice(0, LIMITS.topikPerWs)
    : [];
  const sumber = Array.isArray(o["sumber"])
    ? (o["sumber"] as unknown[])
        .map(sanitizeSource)
        .filter((s): s is SourceLink => s !== null)
        .slice(0, LIMITS.sumberPerWs)
    : [];
  const tugas = Array.isArray(o["tugas"])
    ? (o["tugas"] as unknown[])
        .map(sanitizeTask)
        .filter((t): t is CourseTask => t !== null)
        .slice(0, LIMITS.tugasPerWs)
    : [];
  const createdAt = typeof o["createdAt"] === "string" ? o["createdAt"] : nowIso();
  return {
    id: typeof o["id"] === "string" && o["id"] ? o["id"] : uid(),
    matkul,
    instruksi: str(o["instruksi"], LIMITS.instruksi),
    catatan: str(o["catatan"], LIMITS.catatan),
    sumber,
    topik,
    tugas,
    createdAt,
    updatedAt: typeof o["updatedAt"] === "string" ? (o["updatedAt"] as string) : createdAt,
  };
}

/** Guard bentuk store. Bentuk salah → false (pemanggil reset aman + toast). */
export function isWorkspacesStore(v: unknown): v is WorkspacesStore {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o["version"] !== 1) return false;
  if (!Array.isArray(o["workspaces"])) return false;
  if (o["lastId"] !== null && typeof o["lastId"] !== "string") return false;
  return (o["workspaces"] as unknown[]).every((w) => sanitizeWorkspace(w) !== null);
}

/** Parse toleran: entri rusak dibuang, field berlebih diabaikan. */
export function parseStore(v: unknown): { ok: boolean; store: WorkspacesStore; dropped: number } {
  if (!v || typeof v !== "object") return { ok: false, store: freshStore(), dropped: 0 };
  const o = v as Record<string, unknown>;
  if (o["version"] !== 1 || !Array.isArray(o["workspaces"])) {
    return { ok: false, store: freshStore(), dropped: 0 };
  }
  const raw = o["workspaces"] as unknown[];
  const out: Workspace[] = [];
  let dropped = 0;
  for (const w of raw.slice(0, LIMITS.workspaces)) {
    const s = sanitizeWorkspace(w);
    if (s) out.push(s);
    else dropped += 1;
  }
  const lastRaw = o["lastId"];
  const lastId =
    typeof lastRaw === "string" && out.some((w) => w.id === lastRaw) ? lastRaw : out[0]?.id ?? null;
  return { ok: true, store: { version: 1, workspaces: out, lastId, updatedAt: nowIso() }, dropped };
}

export function loadStore(): { store: WorkspacesStore; corrupt: boolean; dropped: number } {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (!raw) return { store: freshStore(), corrupt: false, dropped: 0 };
    const parsed = parseStore(JSON.parse(raw) as unknown);
    if (!parsed.ok) return { store: freshStore(), corrupt: true, dropped: 0 };
    return { store: parsed.store, corrupt: false, dropped: parsed.dropped };
  } catch {
    return { store: freshStore(), corrupt: true, dropped: 0 };
  }
}

/** Simpan. false = gagal (kuota/privasi) — pemanggil wajib toast, bukan crash. */
export function saveStore(store: WorkspacesStore): boolean {
  try {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify({ ...store, updatedAt: nowIso() }));
    return true;
  } catch {
    return false;
  }
}

// ---------- Migrasi arsip lama (baca saja, key lama TIDAK dihapus) ----------

const LEGACY_TITLES: Record<string, string> = {
  "modul-05": "Pertemuan 5: Normalisasi & Desain Skema Relasional",
  "modul-06": "Pertemuan 6: Transaksi, Locking & Kontrol Konkurensi",
  "modul-07": "Pertemuan 7: Optimasi Query & Pengindeksan",
  "modul-08": "Modul 08: Partisi Tabel & Query Sharding",
  "modul-09": "Pertemuan 9: Replikasi & Backup",
};

interface LegacyProgress {
  tasks?: unknown;
  done?: unknown;
  comments?: Array<{ nama?: unknown; pesan?: unknown }>;
  catatan?: unknown;
}

function legacyHasContent(p: LegacyProgress): boolean {
  if (p.done === true) return true;
  if (typeof p.catatan === "string" && p.catatan.trim()) return true;
  if (Array.isArray(p.tasks) && p.tasks.some((t) => t === true)) return true;
  if (Array.isArray(p.comments) && p.comments.length > 0) return true;
  return false;
}

/**
 * Ubah arsip `cademy:materi-progress` menjadi SATU workspace arsip berlabel
 * jelas (bukan kursus palsu). Entri kosong diabaikan. Komentar lama digabung
 * ke catatan agar tidak hilang.
 */
export function migrateLegacyProgress(legacy: Record<string, unknown>): Workspace | null {
  const ids = Object.keys(legacy);
  if (ids.length === 0) return null;
  const ws = freshWorkspace("Arsip — Database (migrasi otomatis)");
  const catatanParts: string[] = [];
  for (const id of ids) {
    const raw = legacy[id];
    if (!raw || typeof raw !== "object") continue;
    const p = raw as LegacyProgress;
    if (!legacyHasContent(p)) continue;
    const title = LEGACY_TITLES[id] ?? id;
    const tasks = Array.isArray(p.tasks) ? p.tasks : [];
    const anyDone = tasks.some((t) => t === true) || p.done === true;
    ws.topik.push({
      id: uid(),
      title,
      status: p.done === true ? "selesai" : anyDone ? "mulai" : "belum",
      objective: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (typeof p.catatan === "string" && p.catatan.trim()) {
      catatanParts.push(`[${title}]\n${p.catatan.trim()}`.slice(0, 4000));
    }
    if (Array.isArray(p.comments)) {
      for (const c of p.comments.slice(0, 20)) {
        if (c && typeof c === "object" && typeof c["pesan"] === "string" && c["pesan"].trim()) {
          const nama = typeof c["nama"] === "string" && c["nama"].trim() ? c["nama"].trim() : "Mahasiswa";
          catatanParts.push(`Diskusi lama (${nama}): ${c["pesan"].trim()}`.slice(0, 1000));
        }
      }
    }
  }
  if (ws.topik.length === 0 && catatanParts.length === 0) return null;
  ws.catatan = catatanParts.join("\n\n").slice(0, LIMITS.catatan);
  ws.instruksi = "Ruang arsip dari versi lama halaman Materi. Lanjutkan belajar di sini atau buat ruang baru per mata kuliah.";
  return ws;
}

export function readLegacyProgress(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object" || Array.isArray(p)) return null;
    return p as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------- Pencarian lokal ----------

export function searchWorkspaces(store: WorkspacesStore, query: string): Workspace[] {
  const q = query.trim().toLowerCase();
  if (!q) return store.workspaces;
  return store.workspaces.filter((w) => {
    if (w.matkul.toLowerCase().includes(q)) return true;
    if (w.instruksi.toLowerCase().includes(q)) return true;
    if (w.catatan.toLowerCase().includes(q)) return true;
    if (w.topik.some((t) => t.title.toLowerCase().includes(q) || t.objective.toLowerCase().includes(q))) return true;
    if (w.topik.some((t) => (t.tautan ?? []).some((x) => x.label.toLowerCase().includes(q) || x.url.toLowerCase().includes(q) || x.note.toLowerCase().includes(q)))) return true;
    if (w.sumber.some((s) => s.label.toLowerCase().includes(q) || s.url.toLowerCase().includes(q))) return true;
    if (w.tugas.some((t) => t.title.toLowerCase().includes(q))) return true;
    return false;
  });
}

// ---------- Progres dari aktivitas nyata ----------

export interface WorkspaceProgress {
  topikTotal: number;
  topikSelesai: number;
  tugasTotal: number;
  tugasSelesai: number;
  pct: number;
}

export function workspaceProgress(w: Workspace): WorkspaceProgress {
  const topikTotal = w.topik.length;
  const topikSelesai = w.topik.filter((t) => t.status === "selesai").length;
  const tugasTotal = w.tugas.length;
  const tugasSelesai = w.tugas.filter((t) => t.done).length;
  const total = topikTotal + tugasTotal;
  const done = topikSelesai + tugasSelesai;
  return { topikTotal, topikSelesai, tugasTotal, tugasSelesai, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// ---------- Ekspor / impor milik user ----------

export interface BackupBundle {
  app: "cademy-materi-backup";
  version: 1;
  exportedAt: string;
  store: WorkspacesStore;
}

export function makeBackup(store: WorkspacesStore): BackupBundle {
  return { app: "cademy-materi-backup", version: 1, exportedAt: nowIso(), store };
}

export function parseBackup(v: unknown): { ok: boolean; store?: WorkspacesStore } {
  if (!v || typeof v !== "object") return { ok: false };
  const o = v as Record<string, unknown>;
  if (o["app"] !== "cademy-materi-backup" || o["version"] !== 1) return { ok: false };
  const parsed = parseStore(o["store"]);
  if (!parsed.ok) return { ok: false };
  return { ok: true, store: parsed.store };
}

/** URL http/https saja — selain itu ditolak (jangan simpan javascript: dsb). */
export function isValidHttpUrl(v: string): boolean {
  const t = v.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Ekspor ukuran aman: tolak bila mendekati batas localStorage (tanpa blob). */
export function estimateSize(store: WorkspacesStore): number {
  try {
    return JSON.stringify(store).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}
