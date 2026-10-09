// State + migrasi + laporan Thesis Checker v2 — murni, tanpa DOM.
// Key v2: "cademy:thesis-v2". Key lama v1 ("cademy:thesis") dipertahankan.

export type ThesisStatus = "belum" | "perlu" | "selesai";
export type ThesisDocType = "proposal" | "skripsi" | "tesis" | "laporan";

export interface ThesisItemState {
  status: ThesisStatus;
  note?: string;
  page?: string;
  deadline?: string;
}

export interface ThesisProject {
  id: string;
  name: string;
  docType: ThesisDocType;
  states: Record<string, ThesisItemState>;
  revisionLinks: Record<string, string | undefined>;
  createdAt: string;
}

export interface ThesisV2 {
  version: 2;
  projects: ThesisProject[];
}

export const THESIS_V2_KEY = "cademy:thesis-v2";
export const THESIS_V1_KEY = "cademy:thesis";

/** 17 id item — urutan dan nilai TETAP, jangan diubah. */
export const KNOWN_THESIS_IDS: string[] = [
  "cover",
  "bab1",
  "bab2",
  "bab3",
  "bab45",
  "pustaka",
  "nomor",
  "font",
  "tabel",
  "konsisten",
  "gaya",
  "doi",
  "kutip",
  "plagiasi",
  "baku",
  "kalimat",
  "typo",
];

export function uidThesis(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultProject(name = "Skripsi Saya"): ThesisProject {
  return {
    id: uidThesis(),
    name,
    docType: "skripsi",
    states: {},
    revisionLinks: {},
    createdAt: new Date().toISOString(),
  };
}

function isDocType(v: unknown): v is ThesisDocType {
  return v === "proposal" || v === "skripsi" || v === "tesis" || v === "laporan";
}

function isStatus(v: unknown): v is ThesisStatus {
  return v === "belum" || v === "perlu" || v === "selesai";
}

/**
 * Migrasi v1 (Record<id, boolean>) → v2 satu proyek default.
 * true → selesai, selain itu → belum. Key basi diabaikan? Tidak:
 * hanya id dikenal yang dibawa; key basi dibuang agar pct tak >100%.
 */
export function migrateV1ToV2(
  v1: unknown,
  knownIds: string[] = KNOWN_THESIS_IDS,
): ThesisV2 {
  const rec =
    typeof v1 === "object" && v1 !== null && !Array.isArray(v1)
      ? (v1 as Record<string, unknown>)
      : {};
  const states: Record<string, ThesisItemState> = {};
  for (const id of knownIds) {
    states[id] = { status: rec[id] === true ? "selesai" : "belum" };
  }
  return {
    version: 2,
    projects: [
      {
        id: uidThesis(),
        name: "Skripsi Saya",
        docType: "skripsi",
        states,
        revisionLinks: {},
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Guard parse v2 — kembalikan null bila rusak agar view bisa
 * membuat proyek default kosong + toast (jangan crash).
 */
export function parseThesisV2(raw: unknown): ThesisV2 | null {
  try {
    if (typeof raw !== "object" || raw === null) return null;
    const o = raw as Record<string, unknown>;
    if (o["version"] !== 2) return null;
    if (!Array.isArray(o["projects"])) return null;
    const projects: ThesisProject[] = [];
    for (const p of o["projects"] as unknown[]) {
      if (typeof p !== "object" || p === null) return null;
      const r = p as Record<string, unknown>;
      if (typeof r["id"] !== "string" || typeof r["name"] !== "string")
        return null;
      if (!isDocType(r["docType"])) return null;
      if (
        typeof r["states"] !== "object" ||
        r["states"] === null ||
        Array.isArray(r["states"])
      )
        return null;
      const states: Record<string, ThesisItemState> = {};
      for (const [k, v] of Object.entries(
        r["states"] as Record<string, unknown>,
      )) {
        if (typeof v !== "object" || v === null) return null;
        const s = v as Record<string, unknown>;
        if (!isStatus(s["status"])) return null;
        const st: ThesisItemState = { status: s["status"] };
        if (typeof s["note"] === "string") st.note = s["note"];
        if (typeof s["page"] === "string") st.page = s["page"];
        if (typeof s["deadline"] === "string") st.deadline = s["deadline"];
        states[k] = st;
      }
      const links: Record<string, string | undefined> = {};
      const rawLinks = r["revisionLinks"];
      if (rawLinks !== undefined) {
        if (typeof rawLinks !== "object" || rawLinks === null) return null;
        for (const [k, v] of Object.entries(
          rawLinks as Record<string, unknown>,
        )) {
          if (v !== undefined && typeof v !== "string") return null;
          links[k] = v as string | undefined;
        }
      }
      projects.push({
        id: r["id"] as string,
        name: r["name"] as string,
        docType: r["docType"] as ThesisDocType,
        states,
        revisionLinks: links,
        createdAt:
          typeof r["createdAt"] === "string"
            ? (r["createdAt"] as string)
            : new Date().toISOString(),
      });
    }
    return { version: 2, projects };
  } catch {
    return null;
  }
}

/** Progress = item berstatus selesai / total id dikenal. */
export function hitungProgressProyek(
  project: ThesisProject,
  knownIds: string[] = KNOWN_THESIS_IDS,
): { selesai: number; total: number; pct: number } {
  const total = knownIds.length;
  const selesai = knownIds.filter(
    (id) => project.states[id]?.status === "selesai",
  ).length;
  return { selesai, total, pct: total > 0 ? Math.round((selesai / total) * 100) : 0 };
}

/** Tag anti-duplikat untuk SharedTask revisi. */
export function revisionTag(projectId: string, itemId: string): string {
  return `revisi:${projectId}:${itemId}`;
}

/**
 * Validasi tautan revisi terhadap daftar tugas Jadwal (tasks-v1).
 * Kembalikan linkTaskId bila tugasnya MASIH ADA, else null (tautan basi —
 * mis. tugas dihapus manual di Jadwal). Murni agar testable; view wajib
 * menghapus entri basi lalu lanjut alur buat/tautkan normal.
 */
export function resolveRevisionLink(
  linkTaskId: string | undefined,
  tasks: Array<{ id: string }>,
): string | null {
  if (typeof linkTaskId !== "string" || linkTaskId === "") return null;
  return tasks.some((t) => t?.id === linkTaskId) ? linkTaskId : null;
}

/** Judul SharedTask dari label item. */
export function revisionTaskTitle(label: string): string {
  return `Revisi: ${label}`;
}

export interface LabelItem {
  id: string;
  label: string;
  group: string;
}

/**
 * Isi laporan .md: proyek, docType, tanggal, progress,
 * daftar perlu/belum + note/page/deadline.
 */
export function buildLaporanMarkdown(
  project: ThesisProject,
  items: LabelItem[],
  tanggal: string,
): string {
  const known = items.filter((i) => KNOWN_THESIS_IDS.includes(i.id));
  const { selesai, total, pct } = hitungProgressProyek(project);
  const perlu = known.filter((i) => project.states[i.id]?.status === "perlu");
  const belum = known.filter(
    (i) => (project.states[i.id]?.status ?? "belum") === "belum",
  );
  const baris = (i: LabelItem): string => {
    const s = project.states[i.id];
    const ex: string[] = [];
    if (s?.page) ex.push(`hal. ${s.page}`);
    if (s?.deadline) ex.push(`deadline ${s.deadline}`);
    if (s?.note) ex.push(`catatan: ${s.note}`);
    return `- [ ] ${i.label} (${i.group})${ex.length > 0 ? ` — ${ex.join(" • ")}` : ""}`;
  };
  return (
    `# Laporan Revisi — ${project.name}\n\n` +
    `- Jenis dokumen: ${project.docType}\n` +
    `- Tanggal: ${tanggal}\n` +
    `- Progress: ${selesai}/${total} selesai (${pct}%)\n\n` +
    `## Perlu direvisi (${perlu.length})\n` +
    (perlu.length > 0 ? perlu.map(baris).join("\n") + "\n" : "- Tidak ada.\n") +
    `\n## Belum dikerjakan (${belum.length})\n` +
    (belum.length > 0 ? belum.map(baris).join("\n") + "\n" : "- Tidak ada.\n")
  );
}
