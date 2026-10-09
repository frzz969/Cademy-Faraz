// Log bimbingan & tindak lanjut — kontrak data murni (tanpa React/browser/network).
//
// PRINSIP (dikunci pemilik, Phase 16 revisi E):
// 1. Log bimbingan hidup MANDIRI dari tugas. Pembuatan tugas gagal TIDAK
//    menghapus log; tugas dihapus TIDAK menghapus log. `taskId` boleh basi —
//    cukup ditandai "tautan basi" + tawarkan taut ulang (bukan hapus log).
// 2. Bridge anti-duplikasi: tag stabil `bimbingan:{projectId}:{logId}` —
//    satu tindak lanjut maksimal satu tugas. Memanggil bridge berulang kali
//    mengarah ke tugas yang sama.
// 3. Key aditif `cademy:proj-refs-v1`/`cademy:thesis-v2` TIDAK disentuh.
// 4. Orphan (projectId tak dikenal saat load) DITANDAI, tidak diprune.
// 5. Tanpa data contoh palsu — empty state sampai pengguna menambah.

import { uidThesis, resolveRevisionLink } from "./thesis";

export type BimbinganStatus = "terbuka" | "selesai";

export interface Bimbingan {
  id: string;
  /** Tanggal bimbingan, format YYYY-MM-DD (lokal). */
  tanggal: string;
  /** Catatan masukan dosen (bebas teks, milik pengguna). */
  masukan: string;
  /** id section (bab) dari proj-refs; opsional. */
  sectionId?: string;
  /** Tindak lanjut yang dicatat pengguna. */
  tindakLanjut: string;
  /** Tenggat tindak lanjut (YYYY-MM-DD); opsional. */
  deadline?: string;
  status: BimbinganStatus;
  /** taskId di cademy:tasks-v1 bila tindak lanjut sudah dijadwalkan. */
  taskId?: string;
  createdAt: string;
}

export interface BimbinganStore {
  version: 1;
  byProject: Record<string, Bimbingan[]>;
}

export const BIMBINGAN_VERSION = 1;

/** Key localStorage log bimbingan (aditif; tak mengubah key lain). */
export const BIMBINGAN_KEY = "cademy:bimbingan-v1";

export function emptyBimbinganStore(): BimbinganStore {
  return { version: BIMBINGAN_VERSION, byProject: {} };
}

function isStatus(v: unknown): v is BimbinganStatus {
  return v === "terbuka" || v === "selesai";
}

function asStringOrUndef(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/**
 * Guard parse — TOLERAN: entri rusak dilewati, yang valid dibawa; relasi
 * orphan TIDAK diprune (pemanggil menandai). Data rusak ≠ hapus.
 */
export function parseBimbinganStore(raw: unknown): BimbinganStore {
  const store = emptyBimbinganStore();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return store;
  const o = raw as Record<string, unknown>;
  if (o["version"] !== BIMBINGAN_VERSION) return store;
  const byProject = o["byProject"];
  if (typeof byProject !== "object" || byProject === null || Array.isArray(byProject))
    return store;
  for (const [pid, list] of Object.entries(byProject as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const out: Bimbingan[] = [];
    for (const item of list as unknown[]) {
      if (typeof item !== "object" || item === null) continue;
      const r = item as Record<string, unknown>;
      if (typeof r["id"] !== "string" || !r["id"]) continue;
      if (typeof r["tanggal"] !== "string") continue;
      if (typeof r["masukan"] !== "string") continue;
      if (typeof r["tindakLanjut"] !== "string") continue;
      if (!isStatus(r["status"])) continue;
      const b: Bimbingan = {
        id: r["id"],
        tanggal: r["tanggal"],
        masukan: r["masukan"],
        tindakLanjut: r["tindakLanjut"],
        status: r["status"],
        createdAt:
          typeof r["createdAt"] === "string" ? r["createdAt"] : new Date(0).toISOString(),
      };
      const sec = asStringOrUndef(r["sectionId"]);
      if (sec) b.sectionId = sec;
      const dl = asStringOrUndef(r["deadline"]);
      if (dl) b.deadline = dl;
      const tid = asStringOrUndef(r["taskId"]);
      if (tid) b.taskId = tid;
      out.push(b);
    }
    store.byProject[pid] = out;
  }
  return store;
}

/** Tanggal lokal YYYY-MM-DD (bukan toISOString agar tak bergeser zona waktu). */
export function todayLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function makeBimbingan(input: {
  tanggal?: string;
  masukan: string;
  sectionId?: string;
  tindakLanjut: string;
  deadline?: string;
  id?: string;
}): Bimbingan {
  return {
    id: input.id ?? uidThesis(),
    tanggal: input.tanggal?.trim() || todayLocal(),
    masukan: input.masukan.trim(),
    ...(input.sectionId ? { sectionId: input.sectionId } : {}),
    tindakLanjut: input.tindakLanjut.trim(),
    ...(input.deadline?.trim() ? { deadline: input.deadline.trim() } : {}),
    status: "terbuka",
    createdAt: new Date().toISOString(),
  };
}

export function addBimbingan(
  store: BimbinganStore,
  projectId: string,
  b: Bimbingan,
): BimbinganStore {
  if (!projectId.trim()) return store;
  const list = store.byProject[projectId] ?? (store.byProject[projectId] = []);
  list.push(b);
  return store;
}

export function setStatusBimbingan(
  store: BimbinganStore,
  projectId: string,
  id: string,
  status: BimbinganStatus,
): BimbinganStore {
  const list = store.byProject[projectId];
  const b = list?.find((x) => x.id === id);
  if (b) b.status = status;
  return store;
}

export function setTaskBimbingan(
  store: BimbinganStore,
  projectId: string,
  id: string,
  taskId: string | undefined,
): BimbinganStore {
  const list = store.byProject[projectId];
  const b = list?.find((x) => x.id === id);
  if (!b) return store;
  if (taskId) b.taskId = taskId;
  else delete b.taskId;
  return store;
}

export function bimbinganPerProject(
  store: BimbinganStore,
  projectId: string,
): Bimbingan[] {
  return store.byProject[projectId] ?? [];
}

/** Hitungan untuk tampilan: terbuka vs selesai pada satu proyek. */
export function hitungBimbingan(list: Bimbingan[]): {
  total: number;
  terbuka: number;
  selesai: number;
} {
  const selesai = list.filter((b) => b.status === "selesai").length;
  return { total: list.length, terbuka: list.length - selesai, selesai };
}

/** Daftar projectId yang tak dikenal (orphan — tandai, jangan hapus). */
export function orphanBimbingan(
  store: BimbinganStore,
  knownProjectIds: string[],
): string[] {
  const known = new Set(knownProjectIds);
  return Object.keys(store.byProject).filter((pid) => !known.has(pid));
}

// ---- Bridge ke sistem tugas ----

/** Tag stabil anti-duplikasi: projectId + logId. */
export function bimbinganTag(projectId: string, logId: string): string {
  return `bimbingan:${projectId}:${logId}`;
}

/** Alias resolveRevisionLink (fungsi generik yang sama, diuji di thesis.test.ts). */
export const resolveTaskLink = resolveRevisionLink;

export interface TugasBimbinganInput {
  tag: string;
  title: string;
  description: string;
  dueDate: string;
}

/**
 * Petakan log → input tugas untuk ditulis ke tasks-v1. MURNI: tidak menulis
 * apa pun; view yang menyimpan. `projectId` = ID STABIL proyek (dipakai untuk
 * tag anti-duplikasi; nama boleh berubah, id tidak). Judul dari tindak lanjut;
 * deskripsi memuat ringkasan masukan + bab + tenggat.
 */
export function bimbinganTaskInput(
  b: Bimbingan,
  projectId: string,
  projectName: string,
  sectionNama?: string,
): TugasBimbinganInput {
  const parts = [`Tindak lanjut bimbingan (${b.tanggal}) — proyek ${projectName}.`];
  if (sectionNama) parts.push(`Bab: ${sectionNama}.`);
  if (b.masukan.trim()) parts.push(`Masukan: ${b.masukan.trim()}`);
  return {
    tag: bimbinganTag(projectId, b.id),
    title: `Bimbingan: ${b.tindakLanjut}`,
    description: parts.join(" "),
    dueDate: b.deadline ?? "",
  };
}
