"use client";

// Satu sumber data task lintas halaman (roadmap ↔ jadwal ↔ planner ↔ materi).
// Semua yang butuh task ambil dari sini; key lama tidak dihapus (backup).
// Tahap 1 — fondasi data: CRUD bersama, ID stabil, subtugas, arsip,
// riwayat undo (sesi ini), migration aman, dan backup JSON.
export type TaskSource = "roadmap" | "jadwal" | "planner" | "materi" | "pribadi";
export type TaskStatusT = "todo" | "doing" | "done";
export type PrioritasT = "tinggi" | "sedang" | "rendah" | "normal";

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface SharedTask {
  id: string;
  source: TaskSource;
  status: TaskStatusT;
  prioritas: PrioritasT;
  title: string;
  description?: string;
  /** ISO (yyyy-mm-dd) atau teks bebas — disimpan apa adanya, jangan dikarang. */
  dueDate?: string;
  jam?: string;
  phaseId?: string;
  phaseTitle?: string;
  roadmapStepId?: string;
  tag?: string;
  ruang?: string;
  durasi?: number;
  progres?: number;
  /** jumlah catatan (angka) — metadata ringkas */
  catatan?: number;
  /** catatan bebas milik pengguna */
  notes?: string;
  subtasks?: SubTask[];
  /** arsip: disembunyikan dari papan, tidak dihitung di progres */
  arsip?: boolean;
  /**
   * demo: data contoh (bukan data pengguna). Ditulis hanya lewat tombol
   * "Coba contoh" — tak pernah di-seed otomatis. Hapus contoh tak
   * menyentuh record non-demo. Flag asal (bukan kepemilikan): suntingan
   * pengguna pada kartu contoh tetap berflag demo sampai contoh dihapus.
   */
  demo?: boolean;
  /**
   * Tugas berulang: induk menyimpan pola (indukId = id sendiri),
   * tiap kejadian record sendiri (indukId = id induk). Tanpa scheduler:
   * kejadian di-materialisasi di depan secara terbatas saat seri dibuat.
   */
  berulang?: InfoBerulang;
  createdAt: string;
  completedAt?: string;
}

const STORE_KEY = "cademy:tasks-v1";
export const BACKUP_MAGIC = "cademy-tasks-backup";
export const BACKUP_VERSION = 1;

const LEGACY = {
  flowchart: "cademy:flowchart",
  planner: "cademy:planner",
  jadwalTugas: "cademy:jadwal-tugas",
};

const STATUS_VALID: TaskStatusT[] = ["todo", "doing", "done"];
const PRIORITAS_VALID: PrioritasT[] = ["tinggi", "sedang", "rendah", "normal"];
const SOURCE_VALID: TaskSource[] = [
  "roadmap",
  "jadwal",
  "planner",
  "materi",
  "pribadi",
];

/** ID stabil: prefiks sumber + waktu + acak (bukan judul tugas). */
export function uid(prefix = "t"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

const newId = (source: TaskSource): string => uid(source);

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan penuh / mode privat — abaikan, jangan crash */
  }
}

/** Ada key-nya (walau isinya rusak) — beda dari belum pernah ada. */
function exists(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNum(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Normalisasi 1 record dari mana saja (store / migrasi / impor JSON).
 * Field wajib yang tidak valid dibuat default; record tanpa judul ditolak
 * supaya data rusak tidak masuk ke papan.
 */
export function normalizeTask(raw: unknown): SharedTask | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const title = asStr(r["title"]).trim();
  if (!title) return null;
  const source = SOURCE_VALID.includes(r["source"] as TaskSource)
    ? (r["source"] as TaskSource)
    : "pribadi";
  const status = STATUS_VALID.includes(r["status"] as TaskStatusT)
    ? (r["status"] as TaskStatusT)
    : "todo";
  const prioritas = PRIORITAS_VALID.includes(r["prioritas"] as PrioritasT)
    ? (r["prioritas"] as PrioritasT)
    : "sedang";
  const subtasksRaw = Array.isArray(r["subtasks"]) ? r["subtasks"] : [];
  const subtasks: SubTask[] = subtasksRaw
    .map((s) => {
      if (typeof s !== "object" || s === null) return null;
      const o = s as Record<string, unknown>;
      const t = asStr(o["title"]).trim();
      if (!t) return null;
      return {
        id: asStr(o["id"]) || uid("sub"),
        title: t,
        done: o["done"] === true,
      };
    })
    .filter((s): s is SubTask => s !== null);
  const createdAt = asStr(r["createdAt"]) || new Date().toISOString();
  const task: SharedTask = {
    id: asStr(r["id"]) || newId(source),
    source,
    status,
    prioritas,
    title,
    createdAt,
  };
  if (asStr(r["description"])) task.description = asStr(r["description"]);
  if (asStr(r["dueDate"])) task.dueDate = asStr(r["dueDate"]);
  if (asStr(r["jam"])) task.jam = asStr(r["jam"]);
  if (asStr(r["phaseId"])) task.phaseId = asStr(r["phaseId"]);
  if (asStr(r["phaseTitle"])) task.phaseTitle = asStr(r["phaseTitle"]);
  if (asStr(r["roadmapStepId"]))
    task.roadmapStepId = asStr(r["roadmapStepId"]);
  if (asStr(r["tag"])) task.tag = asStr(r["tag"]);
  if (asStr(r["ruang"])) task.ruang = asStr(r["ruang"]);
  if (r["durasi"] !== undefined) task.durasi = asNum(r["durasi"], 60);
  if (r["progres"] !== undefined)
    task.progres = Math.min(100, Math.max(0, Math.round(asNum(r["progres"], 0))));
  if (r["catatan"] !== undefined) task.catatan = asNum(r["catatan"], 0);
  if (asStr(r["notes"])) task.notes = asStr(r["notes"]);
  if (subtasks.length > 0) task.subtasks = subtasks;
  if (r["arsip"] === true) task.arsip = true;
  if (r["demo"] === true) task.demo = true;
  const berulang = normalisasiBerulang(r["berulang"]);
  if (berulang) task.berulang = berulang;
  if (asStr(r["completedAt"])) task.completedAt = asStr(r["completedAt"]);
  return task;
}

function normalizeList(raw: unknown): SharedTask[] {
  if (!Array.isArray(raw)) return [];
  const out: SharedTask[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const t = normalizeTask(item);
    if (!t) continue;
    if (seen.has(t.id)) continue; // dedupe by ID stabil
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

// Migrasi sekali jalan dari key lama ke store baru. Key lama tetap disimpan.
function migrate(): SharedTask[] {
  const out: SharedTask[] = [];

  const flow = read<Record<string, unknown>>(LEGACY.flowchart);
  if (flow && typeof flow === "object") {
    // Step roadmap direkonstruksi oleh flowchart view; di sini data lama
    // hanya menjadi sumber awal, bukan sumber kebenaran status.
  }

  const plannerTasks = read<Array<Record<string, unknown>>>(LEGACY.planner);
  if (Array.isArray(plannerTasks)) {
    for (const t of plannerTasks) {
      const status: TaskStatusT =
        t["kolom"] === "doing" || t["kolom"] === "done"
          ? (t["kolom"] as TaskStatusT)
          : t["selesai"] === true
            ? "done"
            : "todo";
      const jadi = normalizeTask({
        ...t,
        id: typeof t["id"] === "string" ? t["id"] : newId("planner"),
        source: "planner",
        status,
        title: typeof t["nama"] === "string" ? t["nama"] : "",
        description: typeof t["deskripsi"] === "string" ? t["deskripsi"] : "",
      });
      if (jadi) out.push(jadi);
    }
  }

  const jadwalTasks = read<Array<Record<string, unknown>>>(LEGACY.jadwalTugas);
  if (Array.isArray(jadwalTasks)) {
    for (const t of jadwalTasks) {
      const jadi = normalizeTask({
        ...t,
        id: typeof t["id"] === "string" ? t["id"] : newId("jadwal"),
        source: "jadwal",
        title: typeof t["judul"] === "string" ? t["judul"] : "",
      });
      if (jadi) out.push(jadi);
    }
  }

  return normalizeList(out);
}

/** Semua task (termasuk arsip). Data rusak dibuang per-record, bukan semua. */
export function loadTasks(): SharedTask[] {
  const adaKey = exists(STORE_KEY);
  const raw = read<unknown>(STORE_KEY);
  if (Array.isArray(raw)) return normalizeList(raw);
  if (!adaKey) {
    // Belum pernah ada: migrasi sekali jalan dari key lama, lalu tulis.
    const migrated = migrate();
    write(STORE_KEY, migrated);
    return migrated;
  }
  // Key ADA tapi tak bisa dibaca (JSON rusak / bukan array): jangan timpa
  // dengan [] — mulai dari daftar kosong dan biarkan isi lama apa adanya.
  return [];
}

export function saveTasks(tasks: SharedTask[]): void {
  write(STORE_KEY, normalizeList(tasks));
}

/**
 * Kesetaraan daftar tugas (urutan + isi). Fondasi anti-gema tulis:
 * efek simpan melewati saveTasks bila hasil susunan sama dengan store
 * segar — tanpa ini, refresh lintas-tab (focus/storage) memicu gema
 * simpan antar-tab tanpa henti (setiap tulis = event = tulis lagi).
 * Kanonis (key diurut rekursif) supaya beda pembangun objek yang setara
 * tak dianggap berubah; urutan array tetap berarti (reorder = berubah).
 */
export function samaDaftar(a: SharedTask[], b: SharedTask[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (kanonis(a[i]) !== kanonis(b[i])) return false;
  }
  return true;
}

function kanonis(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(kanonis).join(",")}]`;
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${kanonis(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/** Kesetaraan JSON umum (state struktural roadmap dkk). */
export function samaJSON(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Record asing: ada di store segar tapi belum pernah dikenal tab ini.
 * Wajib dipertahankan saat simpan — beda dari hapus (record hapus pernah
 * dikenal lalu hilang dari state). Fondasi anti-rugi tulis lintas-tab
 * untuk slice yang ditulis ulang utuh dari state (jadwal/planner).
 */
export function asingBaru(
  segar: SharedTask[],
  dikenal: ReadonlySet<string>
): SharedTask[] {
  return segar.filter((t) => !dikenal.has(t.id));
}

export const bySource = (tasks: SharedTask[], src: TaskSource) =>
  tasks.filter((t) => t.source === src);

/** Tugas aktif = tidak diarsipkan. */
export const tugasAktif = (tasks: SharedTask[]) =>
  tasks.filter((t) => !t.arsip);

/** Daftar arsip (disembunyikan dari papan & statistik). */
export const tugasArsip = (tasks: SharedTask[]) =>
  tasks.filter((t) => t.arsip === true);

/** Kembalikan tugas arsip ke papan aktif (tanpa membuat salinan). */
export function pulihkanTugas(tasks: SharedTask[], id: string): SharedTask[] {
  return arsipkanTugas(tasks, id, false);
}

/** Progres 1 tugas: subtask kalau ada (aturan konsisten), else status/progres. */
export function taskProgress(task: SharedTask): number {
  if (task.subtasks && task.subtasks.length > 0) {
    const done = task.subtasks.filter((s) => s.done).length;
    return Math.round((done / task.subtasks.length) * 100);
  }
  if (task.status === "done") return 100;
  if (task.status === "doing") return task.progres ?? 50;
  return 0;
}

/** Ringkasan progres dari data aktual; aman saat belum ada tugas. */
export function hitungProgres(tasks: SharedTask[]): {
  selesai: number;
  total: number;
  pct: number;
} {
  const aktif = tugasAktif(tasks);
  const selesai = aktif.filter((t) => t.status === "done").length;
  return {
    selesai,
    total: aktif.length,
    pct: aktif.length === 0 ? 0 : Math.round((selesai / aktif.length) * 100),
  };
}

/** CRUD bersama — satu implementasi untuk semua halaman. */
export function createTask(
  input: Partial<SharedTask> & { source: TaskSource; title: string }
): SharedTask {
  const sekarang = new Date().toISOString();
  const status: TaskStatusT = input.status ?? "todo";
  return {
    ...input,
    id: input.id ?? newId(input.source),
    source: input.source,
    title: input.title.trim(),
    prioritas: input.prioritas ?? "sedang",
    status,
    createdAt: input.createdAt ?? sekarang,
    ...(status === "done" ? { completedAt: input.completedAt ?? sekarang } : {}),
  };
}

export function updateTask(
  tasks: SharedTask[],
  id: string,
  patch: Partial<SharedTask>
): SharedTask[] {
  return tasks.map((t) => (t.id === id ? { ...t, ...patch, id: t.id } : t));
}

export function setTaskStatus(
  tasks: SharedTask[],
  id: string,
  status: TaskStatusT
): SharedTask[] {
  return tasks.map((t) =>
    t.id === id
      ? {
          ...t,
          status,
          progres:
            status === "done" ? 100 : status === "todo" ? 0 : t.progres ?? 50,
          completedAt:
            status === "done"
              ? (t.completedAt ?? new Date().toISOString())
              : undefined,
        }
      : t
  );
}

export function removeTask(tasks: SharedTask[], id: string): SharedTask[] {
  return tasks.filter((t) => t.id !== id);
}

export function arsipkanTugas(
  tasks: SharedTask[],
  id: string,
  arsip = true
): SharedTask[] {
  return updateTask(tasks, id, { arsip });
}

export function toggleSubtask(
  tasks: SharedTask[],
  taskId: string,
  subId: string
): SharedTask[] {
  return tasks.map((t) =>
    t.id === taskId && t.subtasks
      ? {
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === subId ? { ...s, done: !s.done } : s
          ),
        }
      : t
  );
}

export function tambahSubtask(
  tasks: SharedTask[],
  taskId: string,
  title: string
): SharedTask[] {
  const judul = title.trim();
  if (!judul) return tasks;
  return tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          subtasks: [
            ...(t.subtasks ?? []),
            { id: uid("sub"), title: judul, done: false },
          ],
        }
      : t
  );
}

export function hapusSubtask(
  tasks: SharedTask[],
  taskId: string,
  subId: string
): SharedTask[] {
  return tasks.map((t) =>
    t.id === taskId && t.subtasks
      ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) }
      : t
  );
}

// ── Tugas berulang (local-first, tanpa scheduler) ───────────────────────────
// Model jujur: seri = 1 induk berpola + N kejadian yang di-materialisasi di
// depan secara TERBATAS saat seri dibuat. Tiap kejadian record sendiri
// (ID deterministik `${indukId}@${iso}`) sehingga selesai/ubah/hapus satu
// kejadian ≠ semua, dan simpan ulang tak pernah menggandakan (dedupe by ID
// di saveTasks/gabungCadangan). Tanpa backend tidak ada yang menumbuhkan
// kejadian baru otomatis — pengguna perpanjang seri dari kartunya.
export type FrekuensiBerulang = "harian" | "mingguan" | "interval";

export interface InfoBerulang {
  frekuensi: FrekuensiBerulang;
  /** langkah hari (harian=1, mingguan=7, interval=bebas 1..365) */
  intervalHari: number;
  /** induk: id sendiri; kejadian: id induk */
  indukId: string;
  /** ISO kejadian (induk: tanggal mulai) */
  tanggal: string;
}

/** Batas materialisasi: induk + 30 kejadian ke depan. */
export const MAKS_KEJADIAN_SERI = 31;

const FREKUENSI_VALID: FrekuensiBerulang[] = ["harian", "mingguan", "interval"];

/** ISO ketat yyyy-mm-dd + tanggal kalender nyata (tolak rollover). */
function isoTanggalValid(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
  );
}

function tambahHariISO(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const mo = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  const dt = new Date(y, mo - 1, d + n);
  const mm = `${dt.getMonth() + 1}`.padStart(2, "0");
  const dd = `${dt.getDate()}`.padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function normalisasiBerulang(raw: unknown): InfoBerulang | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!FREKUENSI_VALID.includes(r["frekuensi"] as FrekuensiBerulang))
    return null;
  const intervalHari =
    typeof r["intervalHari"] === "number" &&
    Number.isInteger(r["intervalHari"])
      ? (r["intervalHari"] as number)
      : 0;
  if (intervalHari < 1 || intervalHari > 365) return null;
  const indukId = typeof r["indukId"] === "string" ? r["indukId"] : "";
  if (!indukId) return null;
  if (!isoTanggalValid(r["tanggal"])) return null;
  return {
    frekuensi: r["frekuensi"] as FrekuensiBerulang,
    intervalHari,
    indukId,
    tanggal: (r["tanggal"] as string).trim(),
  };
}

export type HasilSeri =
  | { ok: true; tugas: SharedTask[] }
  | { ok: false; galat: string };

/**
 * Buat seri berulang: induk berpola + kejadian di depan (terbatas).
 * Gagal dengan pesan jelas bila judul/mulai/pola tak valid — tak ada
 * record setengah jadi yang ditulis pemanggil bila ok:false.
 */
export function buatSeriBerulang(input: {
  source: TaskSource;
  title: string;
  description?: string;
  tag?: string;
  prioritas?: PrioritasT;
  jam?: string;
  frekuensi: FrekuensiBerulang;
  intervalHari?: number;
  mulai: string;
  jumlah?: number;
}): HasilSeri {
  const judul = input.title.trim();
  if (!judul) return { ok: false, galat: "Isi judul tugas terlebih dahulu!" };
  if (!FREKUENSI_VALID.includes(input.frekuensi))
    return { ok: false, galat: "Pola berulang tidak dikenal." };
  const langkah =
    input.frekuensi === "harian"
      ? 1
      : input.frekuensi === "mingguan"
        ? 7
        : Math.floor(Number(input.intervalHari));
  if (!Number.isInteger(langkah) || langkah < 1 || langkah > 365)
    return { ok: false, galat: "Interval harus bilangan bulat 1–365 hari." };
  if (!isoTanggalValid(input.mulai))
    return {
      ok: false,
      galat: "Pilih tanggal mulai yang valid (tenggat seri).",
    };
  const mulai = input.mulai.trim();
  const jumlah = Math.min(
    MAKS_KEJADIAN_SERI,
    Math.max(2, Math.floor(Number(input.jumlah) || 5))
  );
  const sekarang = new Date().toISOString();
  const indukId = uid(input.source);
  const dasar = {
    source: input.source,
    title: judul,
    prioritas: input.prioritas ?? ("sedang" as PrioritasT),
    createdAt: sekarang,
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    ...(input.tag?.trim() ? { tag: input.tag.trim() } : {}),
    ...(input.jam?.trim() ? { jam: input.jam.trim() } : {}),
  };
  const keluar: SharedTask[] = [];
  for (let i = 0; i < jumlah; i++) {
    const iso = tambahHariISO(mulai, i * langkah);
    keluar.push({
      ...dasar,
      id: i === 0 ? indukId : `${indukId}@${iso}`,
      status: "todo",
      dueDate: iso,
      berulang: {
        frekuensi: input.frekuensi,
        intervalHari: langkah,
        indukId,
        tanggal: iso,
      },
    });
  }
  return { ok: true, tugas: keluar };
}

/** Anggota seri (induk + kejadian) terurut tanggal — referensi yang sama. */
export function kejadianSeri(tasks: SharedTask[], indukId: string): SharedTask[] {
  return tasks
    .filter((t) => t.id === indukId || t.berulang?.indukId === indukId)
    .sort((a, b) =>
      (a.berulang?.tanggal ?? "").localeCompare(b.berulang?.tanggal ?? "")
    );
}

/** Hapus 1 seri utuh (induk + semua kejadian). Hapus 1 kejadian: removeTask. */
export function hapusSeri(tasks: SharedTask[], indukId: string): SharedTask[] {
  return tasks.filter(
    (t) => t.id !== indukId && t.berulang?.indukId !== indukId
  );
}

/** Hapus permanen SEMUA arsip (aksi massal — panggil setelah konfirmasi UI). */
export function kosongkanArsip(tasks: SharedTask[]): SharedTask[] {
  return tugasAktif(tasks);
}

// ── Riwayat undo (sesi ini, di memori — jangan diklaim permanen) ─────────────
const RIWAYAT_MAX = 20;
const riwayat: { label: string; tasks: SharedTask[] }[] = [];

export function pushRiwayat(label: string, tasks: SharedTask[]): void {
  riwayat.push({ label, tasks: tasks.map((t) => ({ ...t })) });
  if (riwayat.length > RIWAYAT_MAX) riwayat.shift();
}

export function bisaUndo(): boolean {
  return riwayat.length > 0;
}

export function labelUndo(): string | null {
  return riwayat.length > 0 ? riwayat[riwayat.length - 1].label : null;
}

export function undoTask(): SharedTask[] | null {
  const item = riwayat.pop();
  return item ? item.tasks : null;
}

// ── Backup ekspor / impor JSON ──────────────────────────────────────────────
export function buatCadangan(
  tasks: SharedTask[]
): { app: string; version: number; exportedAt: string; total: number; tasks: SharedTask[] } {
  return {
    app: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    total: tasks.length,
    tasks,
  };
}

export type HasilBacaCadangan =
  | { ok: true; tasks: SharedTask[]; total: number }
  | { ok: false; error: string };

export function bacaCadangan(json: string): HasilBacaCadangan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "File bukan JSON yang valid." };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "Isi file bukan objek data." };
  }
  const obj = parsed as Record<string, unknown>;
  const isBackupCademy = obj["app"] === BACKUP_MAGIC || Array.isArray(obj["tasks"]);
  if (!isBackupCademy) {
    return { ok: false, error: "File ini bukan cadangan data akademik Cademy." };
  }
  if (typeof obj["version"] === "number" && obj["version"] > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Versi cadangan (${obj["version"]}) lebih baru dari aplikasi ini.`,
    };
  }
  if (!Array.isArray(obj["tasks"])) {
    return { ok: false, error: "Cadangan tidak punya daftar tugas." };
  }
  const tasks = normalizeList(obj["tasks"]);
  if (tasks.length === 0) {
    return { ok: false, error: "Tidak ada tugas valid yang bisa diimpor." };
  }
  return { ok: true, tasks, total: tasks.length };
}

/**
 * Gabung cadangan ke data aktif. Dedupe by ID stabil; bila ID sama, data
 * dengan createdAt lebih baru menang. mode "ganti" = isi file menjadi
 * seluruh data (tugas lama yang tak ada di file dibuang — tawarkan hanya
 * setelah ringkasan + konfirmasi di UI).
 */
export function gabungCadangan(
  aktif: SharedTask[],
  masuk: SharedTask[],
  mode: "gabung" | "ganti"
): SharedTask[] {
  if (mode === "ganti") return normalizeList(masuk);
  const map = new Map<string, SharedTask>();
  for (const t of aktif) map.set(t.id, t);
  for (const m of masuk) {
    const lama = map.get(m.id);
    if (!lama || m.createdAt > lama.createdAt) map.set(m.id, m);
  }
  return normalizeList([...map.values()]);
}
