"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { loadTasks, saveTasks, bySource } from "../../../components/task-store";
import { mondayOfWeek, toISODate } from "@cademy/utils";

// Taksonomi prioritas disatukan dengan jadwal: tinggi / sedang / normal.
type Prioritas = "normal" | "sedang" | "tinggi";
type Kolom = "todo" | "doing" | "done";

interface Task {
  id: string;
  nama: string;
  deadline: string;
  jam: string;
  ruang: string;
  deskripsi: string;
  prioritas: Prioritas;
  durasi: number;
  kolom: Kolom;
  selesai: boolean;
}

interface Target {
  label: string;
  date: string;
}

const KEY = "cademy:planner";
const TARGET_KEY = "cademy:planner-target";
const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function initials(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0].slice(0, 2) || "?").toUpperCase();
  return `${parts[0][0] ?? "?"}${parts[parts.length - 1][0] ?? "?"}`.toUpperCase();
}

function seedTasks(): Task[] {
  return [
    { id: uid(), nama: "Bimbingan Bab 4 & 5", deadline: "", jam: "10:00", ruang: "R. Dosen 302", deskripsi: "Validasi instrumen kuantitatif serta pengujian hipotesis ANOVA via SPSS.", prioritas: "tinggi", durasi: 60, kolom: "todo", selesai: false },
    { id: uid(), nama: "Deadline Revisi Naskah Semhas", deadline: "", jam: "23:59", ruang: "Portal Akademik", deskripsi: "Upload PDF final beserta persetujuan kaprodi ke SIAKAD.", prioritas: "sedang", durasi: 120, kolom: "doing", selesai: false },
    { id: uid(), nama: "Gladi Resik Slide Sidang", deadline: "", jam: "14:30", ruang: "Lab 204", deskripsi: "Latihan 15 menit bersama kelompok seminar dan uji konektor HDMI.", prioritas: "normal", durasi: 45, kolom: "todo", selesai: false },
  ];
}

const inputCls =
  "h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 font-body text-sm font-medium text-brand-navy outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

export default function PlannerPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [target, setTarget] = React.useState<Target>({ label: "Sidang Akhir Semester Genap", date: "" });
  const [view, setView] = React.useState<"agenda" | "kanban">("agenda");
  const [filterP, setFilterP] = React.useState<"semua" | Prioritas>("semua");
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);
  const dragId = React.useRef<string | null>(null);

  const [fNama, setFNama] = React.useState("");
  const [fDate, setFDate] = React.useState("");
  const [fJam, setFJam] = React.useState("");
  const [fRuang, setFRuang] = React.useState("");
  const [fPrioritas, setFPrioritas] = React.useState<Prioritas>("sedang");
  const [fDurasi, setFDurasi] = React.useState("60");
  const [fDeskripsi, setFDeskripsi] = React.useState("");
  const firstInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      const all = loadTasks();
      const own = bySource(all, "planner").map((t) => ({
        id: t.id,
        nama: t.title,
        deadline: t.dueDate ?? "",
        jam: t.jam ?? "",
        ruang: t.ruang ?? "",
        deskripsi: t.description ?? "",
        // "rendah" lama dipetakan ke "normal" agar selaras dengan jadwal.
        prioritas: t.prioritas === "tinggi" ? "tinggi" : t.prioritas === "normal" || t.prioritas === "rendah" ? "normal" : "sedang",
        durasi: t.durasi ?? 60,
        kolom: t.status,
        selesai: t.status === "done",
      } satisfies Task));
      setTasks(own.length > 0 ? own : seedTasks());
      const t = localStorage.getItem(TARGET_KEY);
      if (t) {
        const parsed = JSON.parse(t) as Target;
        if (parsed && typeof parsed.label === "string") setTarget({ label: parsed.label, date: parsed.date ?? "" });
      }
    } catch {
      setTasks(seedTasks());
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (ready) {
      try {
        const all = loadTasks();
        const keep = all.filter((t) => t.source !== "planner");
        const ownSlice = tasks.map((t) => ({
          id: t.id,
          source: "planner" as const,
          status: t.kolom,
          prioritas: t.prioritas,
          title: t.nama,
          description: t.deskripsi,
          dueDate: t.deadline,
          jam: t.jam,
          ruang: t.ruang,
          durasi: t.durasi,
          createdAt: new Date().toISOString(),
        }));
        saveTasks([...keep, ...ownSlice]);
        localStorage.setItem(KEY, JSON.stringify(ownSlice));
      } catch {
        /* abaikan */
      }
    }
  }, [tasks, ready]);

  React.useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(TARGET_KEY, JSON.stringify(target));
      } catch {
        /* abaikan */
      }
    }
  }, [target, ready]);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  React.useEffect(() => {
    if (!showForm) return;
    firstInputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowForm(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  async function copyLinkWithFallback(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error("clipboard unavailable");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  const week = React.useMemo(() => {
    const mon = mondayOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }, []);

  const todayISO = toISODate(new Date());

  const countdown = React.useMemo(() => {
    if (!target.date) return null;
    const diff = Math.ceil((new Date(target.date).getTime() - new Date(todayISO).getTime()) / 86400000);
    return diff;
  }, [target.date, todayISO]);

  const agenda = React.useMemo(() => {
    return tasks
      .filter((t) => t.kolom !== "done")
      .filter((t) => (filterP === "semua" ? true : t.prioritas === filterP))
      .filter((t) => (selectedDay ? t.deadline === selectedDay : true))
      .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999") || a.jam.localeCompare(b.jam));
  }, [tasks, filterP, selectedDay]);

  const cols: Array<{ id: Kolom; title: string }> = [
    { id: "todo", title: "To Do" },
    { id: "doing", title: "Sedang Dikerjakan" },
    { id: "done", title: "Selesai" },
  ];
  const doneCount = tasks.filter((t) => t.kolom === "done").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  function openAdd() {
    setEditingId(null);
    setFNama("");
    setFDate(selectedDay ?? "");
    setFJam("");
    setFRuang("");
    setFPrioritas("sedang");
    setFDurasi("60");
    setFDeskripsi("");
    setShowForm(true);
  }

  function openEdit(t: Task) {
    setEditingId(t.id);
    setFNama(t.nama);
    setFDate(t.deadline);
    setFJam(t.jam);
    setFRuang(t.ruang);
    setFPrioritas(t.prioritas);
    setFDurasi(String(t.durasi));
    setFDeskripsi(t.deskripsi);
    setShowForm(true);
  }

  function saveForm() {
    if (!fNama.trim()) {
      showToast("Isi nama tugas dulu!");
      return;
    }
    if (editingId) {
      setTasks((ts) => ts.map((t) => (t.id === editingId ? { ...t, nama: fNama.trim(), deadline: fDate, jam: fJam, ruang: fRuang, prioritas: fPrioritas, durasi: Number(fDurasi) || 30, deskripsi: fDeskripsi } : t)));
      showToast("Tugas diperbarui!");
    } else {
      setTasks((ts) => [...ts, { id: uid(), nama: fNama.trim(), deadline: fDate, jam: fJam, ruang: fRuang, deskripsi: fDeskripsi, prioritas: fPrioritas, durasi: Number(fDurasi) || 30, kolom: "todo", selesai: false }]);
      showToast("Tugas baru ditambahkan!");
    }
    setShowForm(false);
  }

  function move(id: string, dir: -1 | 1) {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const order: Kolom[] = ["todo", "doing", "done"];
        const next = order[Math.min(2, Math.max(0, order.indexOf(t.kolom) + dir))];
        return { ...t, kolom: next, selesai: next === "done" };
      })
    );
  }

  function dropTo(kolom: Kolom) {
    const id = dragId.current;
    if (!id) return;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, kolom, selesai: kolom === "done" } : t)));
    dragId.current = null;
    showToast("Kartu dipindahkan!");
  }

  function toggleDone(id: string) {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const next: Kolom = t.kolom === "done" ? "todo" : "done";
        return { ...t, kolom: next, selesai: next === "done" };
      })
    );
    showToast("Tugas ditandai tuntas!");
  }

  const dotColor = (iso: string) => {
    const day = tasks.filter((t) => t.deadline === iso && t.kolom !== "done");
    if (day.some((t) => t.prioritas === "tinggi")) return "bg-brand-brick";
    if (day.some((t) => t.prioritas === "sedang")) return "bg-brand-yellow";
    if (day.length > 0) return "bg-brand-muted";
    return "bg-transparent";
  };

  const prioritasLabel = (p: Prioritas) =>
    p === "tinggi" ? "Tinggi" : p === "sedang" ? "Sedang" : "Normal";
  const dotP = (p: Prioritas) => (p === "tinggi" ? "bg-brand-brick" : p === "sedang" ? "bg-brand-yellow" : "bg-brand-panel border border-black");

  return (
    <ToolShell
      eyebrow="Akademika"
      title="Jadwal Kuliah"
      description="Agenda, timeline, dan papan kanban skripsi — tersimpan lokal di browser."
      icon="calendar_month"
      badge={`${tasks.filter((t) => t.kolom !== "done").length} aktif • ${progress}%`}
      badgeTone="info"
    >
      {/* Hero countdown target */}
      <div className="flex w-full items-center justify-between rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-brand-yellow shadow-brutal-sm">
            <span aria-hidden className="material-symbols-outlined text-xl">auto_stories</span>
          </div>
          <div>
            <span className="block font-label text-[11px] font-extrabold uppercase tracking-wider">Target Kelulusan</span>
            <input
              value={target.label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTarget((t) => ({ ...t, label: e.target.value }))}
              className="w-full max-w-55 bg-transparent font-display text-lg font-bold outline-none border-b-2 border-dashed border-transparent focus:border-brand-blue"
              aria-label="Label target"
            />
            <input
              type="date"
              value={target.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTarget((t) => ({ ...t, date: e.target.value }))}
              className="mt-1 rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold"
              aria-label="Tanggal target"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 py-1.5 shadow-brutal-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-yellow" />
          <span className="font-label text-xs font-bold">
            {countdown === null ? "Atur tanggal" : countdown < 0 ? `Lewat ${Math.abs(countdown)} hari` : countdown === 0 ? "Hari H!" : `H-${countdown} Hari`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border-[3px] border-black bg-brand-panel p-1.5 shadow-brutal">
        <button
          type="button"
          onClick={() => setView("agenda")}
          className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 font-label text-xs font-bold shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
            view === "agenda" ? "border-[3px] border-black bg-brand-blue text-white" : "border-[3px] border-black bg-white text-brand-navy"
          }`}
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">calendar_month</span> Agenda & Timeline
        </button>
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 font-label text-xs font-bold shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
            view === "kanban" ? "border-[3px] border-black bg-brand-blue text-white" : "border-[3px] border-black bg-white text-brand-navy"
          }`}
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">view_kanban</span> Kanban Board
        </button>
      </div>

      {/* Strip minggu */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-1 font-label text-xs font-bold"><span aria-hidden className="material-symbols-outlined text-[18px]">today</span> Pekan Ini</span>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-[3px] border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold shadow-brutal-sm">
              {progress}% SELESAI
            </span>
            {selectedDay && (
              <button type="button" onClick={() => setSelectedDay(null)} className="text-xs font-bold text-brand-blue underline">
                Reset hari
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto px-0.5 py-1 sm:justify-between">
          {week.map((d) => {
            const iso = toISODate(d);
            const active = iso === todayISO;
            const picked = selectedDay === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDay((s) => (s === iso ? null : iso))}
                className={`flex min-w-12 flex-1 flex-col items-center justify-center rounded-2xl border-[3px] border-black px-1 py-2.5 shadow-brutal transition-transform active:translate-y-1 active:shadow-none ${
                  picked ? "scale-105 bg-brand-yellow" : active ? "bg-brand-blue text-white" : "bg-white"
                }`}
              >
                <span className={`font-label text-xs font-bold ${active && !picked ? "text-white" : "text-brand-muted"}`}>{HARI[d.getDay()]}</span>
                <span className={`font-display text-lg font-bold ${active && !picked ? "text-white" : ""}`}>{d.getDate()}</span>
                <div className={`mt-1 h-1.5 w-1.5 rounded-full ${dotColor(iso)}`} />
              </button>
            );
          })}
        </div>
      </div>

      {view === "agenda" ? (
        <div className="mt-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold">Agenda Terdekat</span>
              <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-xs font-bold shadow-brutal-sm">
                {agenda.length} Agenda
              </span>
            </div>
            <div className="flex gap-1">
              {(["semua", "tinggi", "sedang", "normal"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterP(f)}
                  className={`rounded-full border-2 border-black px-2 py-1 font-label text-[11px] font-bold ${filterP === f ? "bg-brand-blue text-white" : "bg-white"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {agenda.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-black/30 bg-white p-4 text-center text-sm text-brand-muted">
              Tak ada agenda/task yang cocok — coba ubah filter prioritas atau pilih hari lain.
            </p>
          )}
          {agenda.map((t) => (
            <div key={t.id} className="flex flex-col space-y-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDone(t.id)}
                    aria-label="Tandai selesai"
                    className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border-2 border-black bg-brand-panel shadow-brutal-sm transition-transform active:translate-y-0.5"
                  >
                    <span aria-hidden className="material-symbols-outlined text-base font-bold">check</span>
                  </button>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full shadow-brutal-sm ${dotP(t.prioritas)}`} />
                      <span className="font-label text-[11px] font-extrabold uppercase tracking-wider">
                        {prioritasLabel(t.prioritas)}{t.deadline ? ` • ${t.deadline}` : ""}
                      </span>
                    </div>
                    <h2 className="mt-0.5 font-display text-lg font-bold">{t.nama}</h2>
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-full border-[3px] border-black bg-brand-panel px-2.5 py-1 font-label text-[11px] font-extrabold shadow-brutal-sm">
                  {(t.jam || "—") + (t.ruang ? ` • ${t.ruang}` : "")}
                </span>
              </div>
              {t.deskripsi && <p className="pl-9 font-body text-sm text-brand-muted">{t.deskripsi}</p>}
              <div className="flex items-center justify-between pl-9 pt-1">
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span>⏱️ {t.jam || "Fleksibel"}</span>
                  <span className="text-brand-muted">📍 {t.ruang || "—"}</span>
                  <span className="text-brand-muted">⏳ {t.durasi} mnt</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-brand-panel font-label text-[11px] font-extrabold shadow-brutal-sm" title={t.nama}>
                    {initials(t.nama)}
                  </div>
                  <button type="button" onClick={() => openEdit(t)} className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold" aria-label="Edit">
                    ✏️
                  </button>
                  <button type="button" onClick={() => { setTasks((ts) => ts.filter((x) => x.id !== t.id)); showToast("Tugas dihapus!"); }} className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold" aria-label="Hapus">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col space-y-5">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold">Papan Skripsi</span>
              <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
                KANBAN AKTIF
              </span>
            </div>
            <span className="font-label text-xs font-bold text-brand-muted">Total: {tasks.length} Kartu</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-white">
            <div className="h-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
          </div>
          {cols.map((c) => {
            const list = tasks.filter((t) => t.kolom === c.id);
            return (
              <div
                key={c.id}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
                onDrop={() => dropTo(c.id)}
                className="flex flex-col space-y-3 rounded-2xl border-[3px] border-black bg-brand-panel p-3.5 shadow-brutal"
              >
                <div className="flex items-center justify-between pb-1">
                  <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">
                    <span aria-hidden className={`h-3 w-3 rounded-full border-2 border-black ${c.id === "todo" ? "bg-white" : c.id === "doing" ? "bg-brand-blue" : "bg-brand-yellow"}`} />
                    {c.id === "todo" ? "To Do" : c.id === "doing" ? "Sedang Dikerjakan" : "Selesai"} ({list.length})
                  </h3>
                </div>
                {list.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => {
                      dragId.current = t.id;
                    }}
                    className={`flex cursor-grab flex-col space-y-2 rounded-2xl border-[3px] border-black bg-white p-3 shadow-brutal ${t.kolom === "done" ? "opacity-90" : ""}`}
                  >
                    <p className={`font-body text-sm font-medium ${t.kolom === "done" ? "line-through" : ""}`}>{t.nama}</p>
                    <div className="flex items-center justify-between pt-1 text-xs text-brand-muted">
                      <span>📅 {t.deadline || "Tanpa tanggal"}{t.jam ? ` • ${t.jam}` : ""}</span>
                      <span className={`h-2 w-2 rounded-full ${t.prioritas === "tinggi" ? "bg-brand-brick" : "bg-brand-muted"}`} />
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => move(t.id, -1)} disabled={t.kolom === "todo"} className="flex-1 rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold disabled:opacity-40" aria-label="Pindah kiri">
                        ←
                      </button>
                      <button type="button" onClick={() => move(t.id, 1)} disabled={t.kolom === "done"} className="flex-1 rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold disabled:opacity-40" aria-label="Pindah kanan">
                        →
                      </button>
                      <button type="button" onClick={() => openEdit(t)} className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold" aria-label="Edit">
                        ✏️
                      </button>
                    </div>
                  </div>
                ))}
                {list.length === 0 && <p className="rounded-xl border-2 border-dashed border-black/30 p-3 text-center text-xs text-brand-muted">Seret kartu ke sini atau pakai tombol →.</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Tim + undang */}
      <div className="mt-5 flex flex-col space-y-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
        <div className="flex items-center justify-between">
          <span className="font-label text-xs font-bold">👥 Tim Penguji & Rekan Sejawat</span>
          <span className="rounded-full border-[3px] border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">
            AKSES BACA & KOMENTAR
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {["SD", "NH", "RF", "SA"].map((a) => (
            <div key={a} className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-black bg-brand-panel font-label text-xs font-extrabold shadow-brutal" title={`Avatar contoh ${a}`}>
              {a}
            </div>
          ))}
          <button
            type="button"
            onClick={async () => {
              const ok = await copyLinkWithFallback(window.location.href);
              showToast(ok ? "Tautan halaman disalin ke clipboard!" : "Gagal menyalin — browser memblokir clipboard!");
            }}
            className="flex h-11 items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3.5 font-label text-xs font-bold shadow-brutal transition-transform hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            🔗 Salin link
          </button>
        </div>
        <p className="text-[11px] text-brand-muted">Avatar di atas hanya contoh (statis) — daftar tim belum tersambung ke akun mana pun.</p>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={openAdd}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border-[3px] border-black bg-brand-yellow font-label text-sm font-extrabold text-brand-navy shadow-brutal transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          ➕ Tambah Tugas Baru
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-brand-navy/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={editingId ? "Edit tugas" : "Tugas baru"} onClick={() => setShowForm(false)}>
          <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{editingId ? "Edit Tugas" : "Tugas Baru"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-white shadow-brutal-sm" aria-label="Tutup">
                ✕
              </button>
            </div>
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Nama tugas *</span>
              <input ref={firstInputRef} value={fNama} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFNama(e.target.value)} className={inputCls} placeholder="cth: Revisi Bab 2" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Tanggal</span>
                <input type="date" value={fDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFDate(e.target.value)} className={inputCls} />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Jam</span>
                <input type="time" value={fJam} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFJam(e.target.value)} className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Ruang</span>
                <input value={fRuang} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFRuang(e.target.value)} className={inputCls} placeholder="cth: R. Dosen 302" />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Durasi (mnt)</span>
                <input type="number" min={5} value={fDurasi} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFDurasi(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Prioritas</span>
              <select value={fPrioritas} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFPrioritas(e.target.value as Prioritas)} className={inputCls}>
                <option value="normal">Normal</option>
                <option value="sedang">Sedang</option>
                <option value="tinggi">Tinggi</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Deskripsi</span>
              <textarea value={fDeskripsi} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFDeskripsi(e.target.value)} rows={3} className="w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 py-2 font-body text-sm outline-none focus:bg-white" placeholder="Detail tugas…" />
            </label>
            <button
              type="button"
              onClick={saveForm}
              className="h-12 w-full rounded-full border-[3px] border-black bg-brand-blue font-label text-xs font-bold uppercase text-white shadow-brutal transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              💾 {editingId ? "Simpan Perubahan" : "Simpan Tugas"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div aria-live="polite" className="fixed bottom-24 left-4 right-4 z-50 flex items-center justify-between rounded-2xl border-[3px] border-black bg-brand-navy px-4 py-3 text-white shadow-brutal">
          <span className="font-body text-sm">✔ {toast}</span>
          <button type="button" onClick={() => setToast(null)} className="font-label text-xs font-bold underline">
            Tutup
          </button>
        </div>
      )}
    </ToolShell>
  );
}
