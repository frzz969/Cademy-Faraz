"use client";

// Satu sumber data task lintas halaman (roadmap ↔ jadwal ↔ planner).
// Semua yang butuh task ambil dari sini; key lama tidak dihapus (backup).
export type TaskSource = "roadmap" | "jadwal" | "planner";
export type TaskStatusT = "todo" | "doing" | "done";
export type PrioritasT = "tinggi" | "sedang" | "rendah" | "normal";

export interface SharedTask {
  id: string;
  source: TaskSource;
  status: TaskStatusT;
  prioritas: PrioritasT;
  title: string;
  description?: string;
  dueDate?: string;
  phaseId?: string;
  roadmapStepId?: string;
  tag?: string;
  jam?: string;
  ruang?: string;
  durasi?: number;
  progres?: number;
  catatan?: number;
  createdAt: string;
  completedAt?: string;
}

const STORE_KEY = "cademy:tasks-v1";
const LEGACY = {
  flowchart: "cademy:flowchart",
  planner: "cademy:planner",
  jadwalTugas: "cademy:jadwal-tugas",
};

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Migrasi sekali jalan dari key lama ke store baru. Key lama tetap disimpan.
function migrate(): SharedTask[] {
  const out: SharedTask[] = [];

  const flow = read<{
    steps?: Record<string, boolean>;
  }>(LEGACY.flowchart);
  if (flow && flow.steps) {
    // Dibangun ulang oleh flowchart view; di sini hanya sinyal bahwa data ada.
    // Step roadmap direkonstruksi saat flowchart pertama load melalui upsertRoadmap,
    // jadi yang penting statusnya tersimpan di store lewat path itu.
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
      out.push({
        id: typeof t["id"] === "string" ? t["id"] : uid(),
        source: "planner",
        status,
        prioritas:
          t["prioritas"] === "tinggi" || t["prioritas"] === "rendah"
            ? (t["prioritas"] as PrioritasT)
            : "sedang",
        title: typeof t["nama"] === "string" ? t["nama"] : "Tanpa judul",
        description: typeof t["deskripsi"] === "string" ? t["deskripsi"] : "",
        dueDate: typeof t["deadline"] === "string" ? t["deadline"] : "",
        jam: typeof t["jam"] === "string" ? t["jam"] : "",
        ruang: typeof t["ruang"] === "string" ? t["ruang"] : "",
        durasi: typeof t["durasi"] === "number" ? t["durasi"] : 60,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const jadwalTasks = read<Array<Record<string, unknown>>>(LEGACY.jadwalTugas);
  if (Array.isArray(jadwalTasks)) {
    for (const t of jadwalTasks) {
      out.push({
        id: typeof t["id"] === "string" ? t["id"] : uid(),
        source: "jadwal",
        status:
          t["status"] === "doing" || t["status"] === "done"
            ? (t["status"] as TaskStatusT)
            : "todo",
        prioritas:
          t["prioritas"] === "tinggi" || t["prioritas"] === "rendah"
            ? (t["prioritas"] as PrioritasT)
            : t["prioritas"] === "normal"
              ? "normal"
              : "sedang",
        title: typeof t["judul"] === "string" ? t["judul"] : "Tanpa judul",
        description: "",
        dueDate: typeof t["deadline"] === "string" ? t["deadline"] : "",
        tag: typeof t["tag"] === "string" ? t["tag"] : "",
        progres: typeof t["progres"] === "number" ? t["progres"] : 0,
        catatan: typeof t["catatan"] === "number" ? t["catatan"] : 0,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return out;
}

export function loadTasks(): SharedTask[] {
  const raw = read<unknown>(STORE_KEY);
  if (Array.isArray(raw)) return raw as SharedTask[];
  // pertama kali: migrasi dari key lama
  const migrated = migrate();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
  } catch {
    /* abaikan */
  }
  return migrated;
}

export function saveTasks(tasks: SharedTask[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
  } catch {
    /* abaikan */
  }
}

export const bySource = (tasks: SharedTask[], src: TaskSource) =>
  tasks.filter((t) => t.source === src);
