// Riwayat sesi Pomodoro — murni, tanpa DOM. Key SAMA "cademy:pomodoro"
// diperluas aditif dengan `sessions` (cap 100).

export interface PomodoroSession {
  /** "YYYY-MM-DD" waktu lokal. */
  date: string;
  minutes: number;
  taskId?: string;
  taskTitle?: string;
}

export interface PomodoroStored {
  sesi?: unknown;
  totalMenit?: unknown;
  fokus?: unknown;
  pendek?: unknown;
  panjang?: unknown;
  sessions?: unknown;
}

export interface PomodoroState {
  sesi: number;
  totalMenit: number;
  sessions: PomodoroSession[];
}

export const POMODORO_CAP = 100;

/** Senin (00:00) pekan berjalan — salinan kecil agar file tetap mandiri. */
function seninPekanIni(base: Date): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODateLocal(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

function isSessionLike(s: unknown): s is PomodoroSession {
  if (typeof s !== "object" || s === null) return false;
  const r = s as Record<string, unknown>;
  return (
    typeof r["date"] === "string" &&
    DATE_RE.test(r["date"]) &&
    typeof r["minutes"] === "number" &&
    Number.isFinite(r["minutes"])
  );
}

/**
 * Normalisasi penyimpanan lama: field lama tetap dibaca,
 * sessions default [] bila tak ada/rusak. Tak pernah throw.
 */
export function normalizePomodoroState(raw: unknown): PomodoroState {
  const o =
    typeof raw === "object" && raw !== null
      ? (raw as PomodoroStored)
      : {};
  const sesi = num(o.sesi) ?? 0;
  const totalMenit = num(o.totalMenit) ?? 0;
  let sessions: PomodoroSession[] = [];
  if (Array.isArray(o.sessions)) {
    sessions = (o.sessions as unknown[])
      .filter(isSessionLike)
      .map((s) => {
        const r = s as unknown as Record<string, unknown>;
        return {
          date: s.date,
          minutes: s.minutes,
          ...(typeof r["taskId"] === "string" ? { taskId: r["taskId"] } : {}),
          ...(typeof r["taskTitle"] === "string" ? { taskTitle: r["taskTitle"] } : {}),
        };
      })
      .slice(-POMODORO_CAP);
  }
  return { sesi: Math.floor(sesi), totalMenit: Math.floor(totalMenit), sessions };
}

/**
 * Catat satu sesi (dipanggil HANYA saat timer mencapai 0):
 * sesi +1, totalMenit += minutes, sessions di-cap 100 terakhir.
 */
export function pushPomodoroSession(
  state: PomodoroState,
  s: PomodoroSession,
): PomodoroState {
  const sessions = [...state.sessions, s].slice(-POMODORO_CAP);
  return {
    sesi: state.sesi + 1,
    totalMenit: state.totalMenit + s.minutes,
    sessions,
  };
}

/** Agregasi menit per hari ("YYYY-MM-DD" → menit). */
export function menitPerHari(
  sessions: PomodoroSession[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) {
    if (typeof s.date !== "string" || !Number.isFinite(s.minutes)) continue;
    out[s.date] = (out[s.date] ?? 0) + s.minutes;
  }
  return out;
}

/** Total menit sesi sejak Senin pekan berjalan (berdasar `now`). */
export function totalMingguIni(
  sessions: PomodoroSession[],
  now: Date = new Date(),
): number {
  const monday = toISODateLocal(seninPekanIni(now));
  let total = 0;
  for (const s of sessions) {
    if (
      typeof s.date === "string" &&
      DATE_RE.test(s.date) &&
      s.date >= monday &&
      Number.isFinite(s.minutes)
    )
      total += s.minutes;
  }
  return total;
}
