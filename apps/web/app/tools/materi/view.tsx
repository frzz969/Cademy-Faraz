"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { loadTasks, saveTasks, type SharedTask } from "../../../components/task-store";
import {
  freshStore,
  freshWorkspace,
  loadStore,
  saveStore,
  readLegacyProgress,
  migrateLegacyProgress,
  searchWorkspaces,
  workspaceProgress,
  makeBackup,
  parseBackup,
  isValidHttpUrl,
  estimateSize,
  LIMITS,
  TOPIC_STATUS_LABEL,
  type Workspace,
  type Topic,
  type TopicStatus,
  type TopicTautan,
  type TautanJenis,
  type WorkspacesStore,
} from "./store";
import { TopicHandoff } from "./TopicHandoff";
import { TranscriptPanel } from "./TranscriptPanel";

type ModalKind =
  | null
  | { kind: "ws-create" }
  | { kind: "ws-rename"; id: string }
  | { kind: "ws-delete"; id: string }
  | { kind: "topic"; topicId?: string }
  | { kind: "topic-delete"; topicId: string }
  | { kind: "source"; sourceId?: string }
  | { kind: "source-delete"; sourceId: string }
  | { kind: "task"; taskId?: string }
  | { kind: "task-delete"; taskId: string }
  | { kind: "wipe" };

const STATUS_ORDER: TopicStatus[] = ["belum", "mulai", "selesai"];

function nextStatus(s: TopicStatus): TopicStatus {
  return STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length];
}

function statusChip(s: TopicStatus): string {
  if (s === "selesai") return "bg-green-100 text-green-900";
  if (s === "mulai") return "bg-brand-yellow text-black";
  return "bg-brand-panel text-brand-navy";
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function MateriWorkspacePage() {
  const [store, setStore] = React.useState<WorkspacesStore>(() => freshStore());
  const [ready, setReady] = React.useState(false);
  const [corrupt, setCorrupt] = React.useState(false);
  const [quotaFail, setQuotaFail] = React.useState(false);
  const [migrated, setMigrated] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [modal, setModal] = React.useState<ModalKind>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [shared, setShared] = React.useState<SharedTask[]>([]);
  const toastTimer = React.useRef<number | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const pemicuRef = React.useRef<HTMLElement | null>(null);

  // Draft form (satu draft generik per modal agar input terkontrol).
  const [fMatkul, setFMatkul] = React.useState("");
  const [fTitle, setFTitle] = React.useState("");
  const [fStatus, setFStatus] = React.useState<TopicStatus>("belum");
  const [fObjective, setFObjective] = React.useState("");
  const [fLabel, setFLabel] = React.useState("");
  const [fUrl, setFUrl] = React.useState("");
  const [fDeadline, setFDeadline] = React.useState("");

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Kunci fokus + scroll latar saat modal terbuka (tanpa lib baru).
  React.useEffect(() => {
    if (!modal) return;
    const box = dialogRef.current;
    pemicuRef.current = document.activeElement as HTMLElement | null;
    // Pindah fokus ke dalam dialog bila belum (input autoFocus sudah diurus React).
    if (!box?.contains(document.activeElement)) {
      const sasaran = box?.querySelector<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]"
      );
      if (sasaran) sasaran.focus();
      else box?.focus();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModal(null);
        return;
      }
      // Trap-fokus sederhana: Tab berputar di dalam dialog.
      if (e.key !== "Tab" || !box) return;
      const daftar = Array.from(
        box.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      );
      if (daftar.length === 0) {
        e.preventDefault();
        return;
      }
      const awal = daftar[0];
      const akhir = daftar[daftar.length - 1];
      if (e.shiftKey && document.activeElement === awal) {
        e.preventDefault();
        akhir.focus();
      } else if (!e.shiftKey && document.activeElement === akhir) {
        e.preventDefault();
        awal.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
      pemicuRef.current?.focus?.();
    };
  }, [modal]);

  // Muat sekali: workspace + migrasi arsip lama (baca saja) + snapshot tugas bersama.
  React.useEffect(() => {
    const { store: loaded, corrupt: isCorrupt, dropped } = loadStore();
    let next = loaded;
    let didMigrate = false;
    if (loaded.workspaces.length === 0 && !isCorrupt) {
      const legacy = readLegacyProgress();
      if (legacy) {
        const arch = migrateLegacyProgress(legacy);
        if (arch) {
          next = { ...loaded, workspaces: [arch], lastId: arch.id, updatedAt: new Date().toISOString() };
          didMigrate = true;
          try {
            localStorage.setItem("cademy:workspaces-v1", JSON.stringify(next));
          } catch {
            /* abaikan — save berikut yang memberi tahu */
          }
        }
      }
    }
    setStore(next);
    setCorrupt(isCorrupt);
    setMigrated(didMigrate);
    if (isCorrupt) showToast("Data ruang belajar rusak — mulai dari ruang kosong yang aman.");
    else if (dropped > 0) showToast(`${dropped} entri rusak dibuang, sisanya aman.`);
    else if (didMigrate) showToast("Arsip materi lamamu dipindahkan ke ruang arsip.");
    try {
      setShared(loadTasks());
    } catch {
      setShared([]);
    }
    setReady(true);
  }, [showToast]);

  const persist = React.useCallback(
    (next: WorkspacesStore) => {
      setStore(next);
      const ok = saveStore(next);
      setQuotaFail(!ok);
      if (!ok) showToast("Penyimpanan penuh — ekspor datamu lalu hapus yang tidak perlu.");
      try {
        setShared(loadTasks());
      } catch {
        /* abaikan */
      }
    },
    [showToast],
  );

  const results = React.useMemo(() => searchWorkspaces(store, search), [store, search]);
  const active: Workspace | null = React.useMemo(() => {
    if (store.workspaces.length === 0) return null;
    return store.workspaces.find((w) => w.id === store.lastId) ?? store.workspaces[0];
  }, [store]);
  const prog = active ? workspaceProgress(active) : null;
  const sharedById = React.useMemo(() => new Map(shared.map((t) => [t.id, t])), [shared]);

  function touchWs(id: string, patch: Partial<Workspace>): WorkspacesStore {
    return {
      ...store,
      lastId: id,
      updatedAt: new Date().toISOString(),
      workspaces: store.workspaces.map((w) =>
        w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w,
      ),
    };
  }

  // ---------- Workspace ----------

  function openWsCreate() {
    setFMatkul("");
    setModal({ kind: "ws-create" });
  }

  function openWsRename(w: Workspace) {
    setFMatkul(w.matkul);
    setModal({ kind: "ws-rename", id: w.id });
  }

  function submitWs() {
    const name = fMatkul.trim().slice(0, LIMITS.matkul);
    if (!name) {
      showToast("Isi dulu nama mata kuliahnya.");
      return;
    }
    if (modal?.kind === "ws-create") {
      if (store.workspaces.length >= LIMITS.workspaces) {
        showToast(`Maksimal ${LIMITS.workspaces} ruang belajar.`);
        return;
      }
      const ws = { ...freshWorkspace(name) };
      persist({ ...store, workspaces: [...store.workspaces, ws], lastId: ws.id, updatedAt: new Date().toISOString() });
      setModal(null);
      showToast(`Ruang "${name}" dibuat.`);
    } else if (modal?.kind === "ws-rename") {
      persist(touchWs(modal.id, { matkul: name }));
      setModal(null);
      showToast("Nama ruang diperbarui.");
    }
  }

  function confirmWsDelete(id: string) {
    const rest = store.workspaces.filter((w) => w.id !== id);
    persist({ ...store, workspaces: rest, lastId: rest[0]?.id ?? null, updatedAt: new Date().toISOString() });
    setModal(null);
    showToast("Ruang belajar dihapus.");
  }

  // ---------- Topik ----------

  function openTopicCreate() {
    setFTitle("");
    setFStatus("belum");
    setFObjective("");
    setModal({ kind: "topic" });
  }

  function openTopicEdit(t: Topic) {
    setFTitle(t.title);
    setFStatus(t.status);
    setFObjective(t.objective);
    setModal({ kind: "topic", topicId: t.id });
  }

  function submitTopic() {
    if (!active) return;
    const title = fTitle.trim().slice(0, LIMITS.judulTopik);
    if (!title) {
      showToast("Isi dulu judul topiknya.");
      return;
    }
    if (modal?.kind !== "topic") return;
    const now = new Date().toISOString();
    if (modal.topicId) {
      const topik = active.topik.map((t) =>
        t.id === modal.topicId
          ? { ...t, title, status: fStatus, objective: fObjective.trim().slice(0, LIMITS.objective), updatedAt: now }
          : t,
      );
      persist(touchWs(active.id, { topik }));
      showToast("Topik diperbarui.");
    } else {
      if (active.topik.length >= LIMITS.topikPerWs) {
        showToast(`Maksimal ${LIMITS.topikPerWs} topik per ruang.`);
        return;
      }
      const topik = [
        ...active.topik,
        { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, title, status: fStatus, objective: fObjective.trim().slice(0, LIMITS.objective), createdAt: now, updatedAt: now } as Topic,
      ];
      persist(touchWs(active.id, { topik }));
      showToast("Topik ditambahkan.");
    }
    setModal(null);
  }

  function cycleTopicStatus(id: string) {
    if (!active) return;
    const now = new Date().toISOString();
    const topik = active.topik.map((t) => (t.id === id ? { ...t, status: nextStatus(t.status), updatedAt: now } : t));
    persist(touchWs(active.id, { topik }));
  }

  function moveTopic(id: string, dir: -1 | 1) {
    if (!active) return;
    const i = active.topik.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= active.topik.length) return;
    const topik = [...active.topik];
    const [x] = topik.splice(i, 1);
    topik.splice(j, 0, x);
    persist(touchWs(active.id, { topik }));
  }

  // ---------- Smart Handoff Tahap 3: simpan tautan eksternal ke topik ----------
  function saveTautan(topicId: string, link: { url: string; label: string; note: string; jenis: TautanJenis }) {
    if (!active) return;
    const now = new Date().toISOString();
    const entry: TopicTautan = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      url: link.url,
      label: link.label,
      note: link.note,
      jenis: link.jenis,
      savedAt: now,
    };
    const topik = active.topik.map((t) =>
      t.id === topicId ? { ...t, tautan: [...(t.tautan ?? []), entry], updatedAt: now } : t,
    );
    persist(touchWs(active.id, { topik }));
    showToast("Tautan tersimpan di topik ini.");
  }

  function deleteTautan(topicId: string, linkId: string) {
    if (!active) return;
    const topik = active.topik.map((t) =>
      t.id === topicId ? { ...t, tautan: (t.tautan ?? []).filter((x) => x.id !== linkId), updatedAt: new Date().toISOString() } : t,
    );
    persist(touchWs(active.id, { topik }));
    showToast("Tautan dihapus dari topik.");
  }

  // ---------- Sumber ----------

  function openSourceCreate() {
    setFLabel("");
    setFUrl("");
    setModal({ kind: "source" });
  }

  function submitSource() {
    if (!active || modal?.kind !== "source") return;
    const label = fLabel.trim().slice(0, LIMITS.labelSumber);
    const url = fUrl.trim().slice(0, LIMITS.urlSumber);
    if (!label && !url) {
      showToast("Isi dulu nama atau tautan sumbernya.");
      return;
    }
    if (url && !isValidHttpUrl(url)) {
      showToast("Tautan harus http(s) yang valid.");
      return;
    }
    if (modal.sourceId) {
      const sumber = active.sumber.map((s) => (s.id === modal.sourceId ? { ...s, label: label || url, url } : s));
      persist(touchWs(active.id, { sumber }));
      showToast("Sumber diperbarui.");
    } else {
      if (active.sumber.length >= LIMITS.sumberPerWs) {
        showToast(`Maksimal ${LIMITS.sumberPerWs} sumber per ruang.`);
        return;
      }
      const sumber = [
        ...active.sumber,
        { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, label: label || url, url },
      ];
      persist(touchWs(active.id, { sumber }));
      showToast("Sumber ditambahkan.");
    }
    setModal(null);
  }

  // ---------- Tugas ruang ----------

  function openTaskCreate() {
    setFTitle("");
    setFDeadline("");
    setModal({ kind: "task" });
  }

  function submitTask() {
    if (!active || modal?.kind !== "task") return;
    const title = fTitle.trim().slice(0, LIMITS.judulTugas);
    if (!title) {
      showToast("Isi dulu judul tugasnya.");
      return;
    }
    const now = new Date().toISOString();
    if (modal.taskId) {
      const tugas = active.tugas.map((t) => (t.id === modal.taskId ? { ...t, title, deadline: fDeadline.slice(0, 10) } : t));
      persist(touchWs(active.id, { tugas }));
      showToast("Tugas diperbarui.");
    } else {
      if (active.tugas.length >= LIMITS.tugasPerWs) {
        showToast(`Maksimal ${LIMITS.tugasPerWs} tugas per ruang.`);
        return;
      }
      const tugas = [...active.tugas, { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, title, deadline: fDeadline.slice(0, 10), done: false, createdAt: now }];
      persist(touchWs(active.id, { tugas }));
      showToast("Tugas ditambahkan.");
    }
    setModal(null);
  }

  function toggleCourseTask(id: string) {
    if (!active) return;
    const tugas = active.tugas.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    persist(touchWs(active.id, { tugas }));
  }

  // ---------- Integrasi tugas bersama (task-store, bukan duplikat) ----------

  function sendToShared(kind: "topic" | "course", id: string) {
    if (!active) return;
    const now = new Date().toISOString();
    let title = "";
    let description = "";
    let dueDate = "";
    let existingTaskId: string | undefined;
    if (kind === "topic") {
      const t = active.topik.find((x) => x.id === id);
      if (!t) return;
      if (t.taskId && sharedById.has(t.taskId)) {
        showToast("Sudah ada di daftar Tugas.");
        return;
      }
      title = t.objective ? `${t.title} — ${t.objective}` : t.title;
      description = `Dari ruang belajar: ${active.matkul} / topik "${t.title}".`;
      existingTaskId = t.taskId;
    } else {
      const g = active.tugas.find((x) => x.id === id);
      if (!g) return;
      if (g.taskId && sharedById.has(g.taskId)) {
        showToast("Sudah ada di daftar Tugas.");
        return;
      }
      title = g.title;
      description = `Dari ruang belajar: ${active.matkul} / tugas "${g.title}".`;
      dueDate = g.deadline;
      existingTaskId = g.taskId;
    }
    void existingTaskId;
    const taskId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: SharedTask = {
      id: taskId,
      source: "materi",
      status: "todo",
      prioritas: "sedang",
      title: title.slice(0, 200),
      description: `${description} Tautan balik: /tools/materi.`,
      dueDate,
      tag: active.matkul.slice(0, 60),
      createdAt: now,
    };
    try {
      const all = loadTasks();
      saveTasks([...all, entry]);
      setShared([...all, entry]);
    } catch {
      showToast("Gagal menyimpan ke daftar Tugas.");
      return;
    }
    if (kind === "topic") {
      const topik = active.topik.map((t) => (t.id === id ? { ...t, taskId, objective: t.objective, updatedAt: now } : t));
      persist(touchWs(active.id, { topik }));
    } else {
      const tugas = active.tugas.map((t) => (t.id === id ? { ...t, taskId } : t));
      persist(touchWs(active.id, { tugas }));
    }
    showToast("Dikirim ke daftar Tugas.");
  }

  // ---------- Ekspor / impor / hapus milik user ----------

  function exportJson() {
    if (store.workspaces.length === 0) {
      showToast("Belum ada data untuk diekspor.");
      return;
    }
    const size = estimateSize(store);
    if (size > 4_500_000) {
      showToast("Data terlalu besar untuk diekspor sekaligus.");
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(makeBackup(store), null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cademy-materi-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Berkas cadangan terunduh.");
    } catch {
      showToast("Gagal membuat berkas cadangan.");
    }
  }

  function downloadNotes(kind: "txt" | "md") {
    if (!active) return;
    const lines: string[] = [];
    if (kind === "md") {
      lines.push(`# ${active.matkul}`, "", `Ruang belajar — diekspor ${fmtDate(new Date().toISOString())} dari datamu sendiri.`, "");
      if (active.instruksi.trim()) lines.push("## Instruksi dosen", active.instruksi.trim(), "");
      lines.push("## Topik");
      if (active.topik.length === 0) lines.push("- (belum ada topik)");
      for (const t of active.topik) lines.push(`- [${t.status === "selesai" ? "x" : " "}] ${t.title} (${TOPIC_STATUS_LABEL[t.status]})${t.objective ? ` — target: ${t.objective}` : ""}`);
      lines.push("", "## Tugas");
      if (active.tugas.length === 0) lines.push("- (belum ada tugas)");
      for (const g of active.tugas) lines.push(`- [${g.done ? "x" : " "}] ${g.title}${g.deadline ? ` (tenggat ${g.deadline})` : ""}`);
      if (active.catatan.trim()) lines.push("", "## Catatanku", active.catatan.trim());
      if (active.sumber.length > 0) {
        lines.push("", "## Sumber");
        for (const s of active.sumber) lines.push(`- ${s.label}${s.url ? ` — ${s.url}` : ""}`);
      }
    } else {
      lines.push(active.matkul, `Ruang belajar — diekspor ${fmtDate(new Date().toISOString())} dari datamu sendiri.`, "", "TOPIK");
      if (active.topik.length === 0) lines.push("(belum ada topik)");
      for (const t of active.topik) lines.push(`[${t.status === "selesai" ? "x" : " "}] ${t.title} (${TOPIC_STATUS_LABEL[t.status]})`);
      lines.push("", "TUGAS");
      if (active.tugas.length === 0) lines.push("(belum ada tugas)");
      for (const g of active.tugas) lines.push(`[${g.done ? "x" : " "}] ${g.title}${g.deadline ? ` (tenggat ${g.deadline})` : ""}`);
      if (active.instruksi.trim()) lines.push("", "INSTRUKSI DOSEN", active.instruksi.trim());
      if (active.catatan.trim()) lines.push("", "CATATANKU", active.catatan.trim());
    }
    try {
      const blob = new Blob([lines.join("\n")], { type: kind === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ruang-belajar-${active.matkul.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "materi"}.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Catatan .${kind} terunduh.`);
    } catch {
      showToast("Gagal mengunduh catatan.");
    }
  }

  function importFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseBackup(JSON.parse(String(reader.result)));
        if (!parsed.ok || !parsed.store) {
          showToast("Berkas cadangan tidak valid.");
          return;
        }
        persist({ ...parsed.store, updatedAt: new Date().toISOString() });
        showToast("Cadangan dipulihkan.");
      } catch {
        showToast("Berkas cadangan tidak valid.");
      }
    };
    reader.onerror = () => showToast("Gagal membaca berkas.");
    reader.readAsText(file);
  }

  const modalTitle =
    modal?.kind === "ws-create" ? "Buat ruang belajar"
    : modal?.kind === "ws-rename" ? "Ubah nama ruang"
    : modal?.kind === "ws-delete" ? "Hapus ruang?"
    : modal?.kind === "topic" ? (modal.topicId ? "Ubah topik" : "Tambahkan materi")
    : modal?.kind === "topic-delete" ? "Hapus topik?"
    : modal?.kind === "source" ? "Sumber belajar"
    : modal?.kind === "source-delete" ? "Hapus sumber?"
    : modal?.kind === "task" ? (modal.taskId ? "Ubah tugas" : "Tambah tugas")
    : modal?.kind === "task-delete" ? "Hapus tugas?"
    : modal?.kind === "wipe" ? "Hapus semua dataku?"
    : "";

  return (
    <ToolShell
      eyebrow="Beranda / Belajar / Ruang Belajar"
      title="Ruang Belajar Materi"
      description="Ruang fleksibel per mata kuliah: topik, instruksi dosen, catatan, sumber, dan tugas dengan tenggat — semua tersimpan di perangkatmu."
      icon="menu_book"
      badge="Lokal • Tanpa akun"
      badgeTone="info"
    >
      {/* Bilah aksi + pencarian */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-h-[44px] flex-1 items-center gap-2 rounded-2xl border-[3px] border-black bg-white px-4 shadow-brutal">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">search</span>
            <input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Cari matkul, topik, catatan, sumber…"
              className="h-11 w-full bg-transparent text-sm font-medium outline-none placeholder:text-brand-muted"
              aria-label="Cari ruang belajar"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openWsCreate}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-brand-blue px-4 font-label text-xs font-bold text-white shadow-brutal transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">add</span>
              Buat ruang belajar
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-4 font-label text-xs font-bold text-brand-navy shadow-brutal transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">download</span>
              Ekspor
            </button>
          </div>
        </div>
        {ready && (corrupt || quotaFail) && (
          <p className="flex items-start gap-2 rounded-xl border-[3px] border-black bg-brand-brick/10 p-3 text-sm font-medium text-black" role="alert">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">warning</span>
            <span>
              {corrupt ? "Data lama rusak sehingga dimulai dari ruang kosong — tidak ada kursus bawaan yang ditampilkan. " : ""}
              {quotaFail ? "Penyimpanan browser penuh — ekspor dulu, lalu hapus yang tidak perlu." : ""}
            </span>
          </p>
        )}
      </div>

      {!ready ? (
        <p className="rounded-2xl border-[3px] border-black bg-white p-6 text-sm font-medium text-brand-muted shadow-brutal">
          Memuat ruang belajarmu…
        </p>
      ) : store.workspaces.length === 0 ? (
        /* Empty state jujur — tanpa kursus palsu */
        <div className="flex flex-col items-center gap-4 rounded-2xl border-[3px] border-black bg-white p-8 text-center shadow-brutal">
          <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-black bg-brand-panel shadow-brutal">
            <span className="material-symbols-outlined shrink-0 text-[28px] leading-none">menu_book</span>
          </span>
          <div>
            <h2 className="font-display text-xl font-bold">Belum ada ruang belajar</h2>
            <p className="mx-auto mt-1 max-w-md font-body text-sm text-brand-muted">
              Mulai dari materi yang sedang kamu pelajari. Buat satu ruang per mata kuliah, lalu tambahkan topik dan tugasmu sendiri.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={openWsCreate}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-brand-blue px-5 font-label text-xs font-bold text-white shadow-brutal transition-all hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">add</span>
              Buat ruang belajar
            </button>
            <button
              type="button"
              onClick={openWsCreate}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-5 font-label text-xs font-bold text-brand-navy shadow-brutal transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">post_add</span>
              Tambahkan materi
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-black bg-brand-panel px-3 font-label text-[11px] font-bold shadow-brutal-sm"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">upload</span>
              Pulihkan cadangan
            </button>
            <a
              href="/tools/jadwal"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-black bg-white px-3 font-label text-[11px] font-bold shadow-brutal-sm"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">calendar_month</span>
              Lihat Tugas
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Pemilih ruang */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto py-1" role="tablist" aria-label="Daftar ruang belajar">
            {results.map((w) => {
              const p = workspaceProgress(w);
              const isActive = active?.id === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => persist({ ...store, lastId: w.id, updatedAt: new Date().toISOString() })}
                  className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border-[3px] border-black px-4 font-label text-xs font-bold shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${isActive ? "bg-brand-navy text-white" : "bg-white text-brand-navy hover:bg-brand-panel"}`}
                >
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">folder</span>
                  <span className="max-w-[160px] truncate">{w.matkul}</span>
                  <span className={`rounded-full border-2 px-1.5 text-[10px] ${isActive ? "border-white/60" : "border-black"}`}>{p.pct}%</span>
                </button>
              );
            })}
            {search.trim() && results.length === 0 && (
              <p className="flex min-h-[44px] items-center gap-2 rounded-2xl border-2 border-dashed border-black/30 px-4 text-sm font-medium text-brand-muted">
                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">search_off</span>
                Tidak ketemu — coba kata kunci lain atau buat ruang baru.
              </p>
            )}
          </div>

          {active && (
            <>
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
              {/* Kolom utama */}
              <div className="flex flex-col gap-5 lg:col-span-7">
                <div className="relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border-[3px] border-black bg-brand-navy p-5 shadow-brutal">
                  <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(#CAE6FF 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
                  <div className="relative z-10 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 self-start rounded-full border-2 border-black bg-white px-3 py-1 font-label text-[11px] font-extrabold uppercase tracking-wider shadow-brutal-sm">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">school</span>
                      <span>Ruang belajar</span>
                    </span>
                    {migrated && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-brand-yellow px-3 py-1 font-label text-[11px] font-extrabold uppercase shadow-brutal-sm">
                        <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">history</span>
                        <span>Arsip migrasi</span>
                      </span>
                    )}
                  </div>
                  <h2 className="relative z-10 font-display text-xl font-bold leading-tight text-white sm:text-2xl">{active.matkul}</h2>
                  <p className="relative z-10 font-label text-xs font-bold uppercase text-brand-yellow">
                    {prog?.topikSelesai}/{prog?.topikTotal} topik selesai • {prog?.tugasSelesai}/{prog?.tugasTotal} tugas selesai
                  </p>
                  <div className="relative z-10 h-4 overflow-hidden rounded-full border-[3px] border-black bg-white p-0.5">
                    <div className="h-full rounded-full bg-brand-blue transition-all duration-300" style={{ width: `${prog?.pct ?? 0}%` }} />
                  </div>
                  <div className="relative z-10 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openWsRename(active)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm"
                    >
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">edit</span>
                      Ganti nama
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal({ kind: "ws-delete", id: active.id })}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold text-brand-brick shadow-brutal-sm"
                    >
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">delete</span>
                      Hapus ruang
                    </button>
                  </div>
                </div>

                {/* Topik */}
                <section aria-label="Topik belajar" className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">list</span>
                      Topik / Chapter
                    </h3>
                    <button
                      type="button"
                      onClick={openTopicCreate}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-brand-blue px-3 font-label text-[11px] font-extrabold text-white shadow-brutal-sm transition-all active:translate-x-px active:translate-y-px active:shadow-none"
                    >
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">add</span>
                      Tambah topik
                    </button>
                  </div>
                  {active.topik.length === 0 ? (
                    <p className="rounded-xl border-2 border-dashed border-black/30 bg-brand-paper p-4 text-sm font-medium text-brand-muted">
                      Belum ada topik. Tambahkan materi yang sedang kamu pelajari — misalnya “Bab 3: Normalisasi”.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {active.topik.map((t, i) => {
                        const linked = t.taskId ? sharedById.get(t.taskId) : undefined;
                        return (
                          <li key={t.id} className="flex flex-col gap-2 rounded-xl border-2 border-black/15 bg-brand-paper p-3">
                            <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => cycleTopicStatus(t.id)}
                              title={`Status: ${TOPIC_STATUS_LABEL[t.status]} — ketuk untuk ganti`}
                              className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border-2 border-black px-2 font-label text-[10px] font-extrabold uppercase ${statusChip(t.status)}`}
                            >
                              {t.status === "selesai" ? (
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">check_circle</span>
                              ) : (
                                <span>{TOPIC_STATUS_LABEL[t.status]}</span>
                              )}
                            </button>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold leading-snug">{t.title}</span>
                              {t.objective ? <span className="block text-xs text-brand-muted">Target: {t.objective}</span> : null}
                              {linked ? (
                                <a href="/tools/jadwal" className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-blue">
                                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[14px] leading-none">link</span>
                                  <span className="truncate">Ada di Tugas: {linked.title} ({linked.status})</span>
                                </a>
                              ) : null}
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              <button type="button" aria-label={`Naikkan ${t.title}`} disabled={i === 0} onClick={() => moveTopic(t.id, -1)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-white shadow-brutal-sm disabled:opacity-40">
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">arrow_upward</span>
                              </button>
                              <button type="button" aria-label={`Turunkan ${t.title}`} disabled={i === active.topik.length - 1} onClick={() => moveTopic(t.id, 1)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-white shadow-brutal-sm disabled:opacity-40">
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">arrow_downward</span>
                              </button>
                              <button type="button" aria-label={`Ubah ${t.title}`} onClick={() => openTopicEdit(t)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-white shadow-brutal-sm">
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">edit</span>
                              </button>
                              {!linked && (
                                <button type="button" aria-label={`Jadikan tugas: ${t.title}`} title="Jadikan tugas di daftar Tugas" onClick={() => sendToShared("topic", t.id)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-brand-yellow shadow-brutal-sm">
                                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">assignment_add</span>
                                </button>
                              )}
                              <button type="button" aria-label={`Hapus ${t.title}`} onClick={() => setModal({ kind: "topic-delete", topicId: t.id })} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-white text-brand-brick shadow-brutal-sm">
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">delete</span>
                              </button>
                            </span>
                            </div>
                            <TopicHandoff
                              topicId={t.id}
                              topicTitle={t.title}
                              matkul={active.matkul}
                              tautan={t.tautan ?? []}
                              onSave={saveTautan}
                              onDelete={deleteTautan}
                              notify={showToast}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Instruksi + catatan */}
                <section aria-label="Instruksi dan catatan" className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
                  <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">
                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">edit_note</span>
                    Instruksi & Catatan
                  </h3>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Instruksi dosen</span>
                    <textarea
                      value={active.instruksi}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => persist(touchWs(active.id, { instruksi: e.target.value.slice(0, LIMITS.instruksi) }))}
                      rows={3}
                      placeholder="Tempel instruksi dosen di sini — mis. Bab yang diujikan, format laporan…"
                      className="w-full rounded-xl border-[3px] border-black bg-brand-paper px-3 py-2 text-sm outline-none placeholder:text-brand-muted focus:bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Catatanku (tersimpan otomatis)</span>
                    <textarea
                      value={active.catatan}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => persist(touchWs(active.id, { catatan: e.target.value.slice(0, LIMITS.catatan) }))}
                      rows={4}
                      placeholder="Tulis ringkasanmu dengan bahasamu sendiri…"
                      className="w-full rounded-xl border-[3px] border-black bg-brand-paper px-3 py-2 text-sm outline-none placeholder:text-brand-muted focus:bg-white"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => downloadNotes("txt")} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">download</span>
                      Unduh .txt
                    </button>
                    <button type="button" onClick={() => downloadNotes("md")} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">download</span>
                      Unduh .md
                    </button>
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <div className="flex flex-col gap-5 lg:col-span-5">
                <section aria-label="Tugas dan tenggat" className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">assignment</span>
                      Tugas
                    </h3>
                    <button
                      type="button"
                      onClick={openTaskCreate}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-brand-blue px-3 font-label text-[11px] font-extrabold text-white shadow-brutal-sm transition-all active:translate-x-px active:translate-y-px active:shadow-none"
                    >
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">add</span>
                      Tambah
                    </button>
                  </div>
                  {active.tugas.length === 0 ? (
                    <p className="rounded-xl border-2 border-dashed border-black/30 bg-brand-paper p-4 text-sm font-medium text-brand-muted">
                      Belum ada tugas di ruang ini. Tambahkan tugas kuliah beserta tenggatnya.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {active.tugas.map((g) => {
                        const linked = g.taskId ? sharedById.get(g.taskId) : undefined;
                        return (
                          <li key={g.id} className={`flex items-start gap-2 rounded-xl border-2 p-3 ${g.done ? "border-black bg-brand-panel" : "border-black/15 bg-brand-paper"}`}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={g.done}
                              aria-label={`Tandai ${g.title}`}
                              onClick={() => toggleCourseTask(g.id)}
                              className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md border-[3px] border-black shadow-brutal-sm ${g.done ? "bg-brand-blue text-white" : "bg-white text-brand-navy"}`}
                            >
                              {g.done ? <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">check</span> : null}
                            </button>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-sm font-bold leading-snug ${g.done ? "line-through opacity-75" : ""}`}>{g.title}</span>
                              <span className="flex items-center gap-1 font-label text-[11px] font-extrabold uppercase text-brand-blue">
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[14px] leading-none">event</span>
                                <span>{g.deadline ? `Tenggat ${g.deadline}` : "Tanpa tenggat"}</span>
                              </span>
                              {linked ? (
                                <a href="/tools/jadwal" className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-blue">
                                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[14px] leading-none">link</span>
                                  <span className="truncate">Terhubung ke Tugas ({linked.status})</span>
                                </a>
                              ) : null}
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              {!linked && (
                                <button type="button" aria-label={`Kirim ke Tugas: ${g.title}`} title="Kirim ke daftar Tugas" onClick={() => sendToShared("course", g.id)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-brand-yellow shadow-brutal-sm">
                                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">assignment_add</span>
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label={`Ubah ${g.title}`}
                                onClick={() => {
                                  setFTitle(g.title);
                                  setFDeadline(g.deadline);
                                  setModal({ kind: "task", taskId: g.id });
                                }}
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-white shadow-brutal-sm"
                              >
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">edit</span>
                              </button>
                              <button type="button" aria-label={`Hapus ${g.title}`} onClick={() => setModal({ kind: "task-delete", taskId: g.id })} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-white text-brand-brick shadow-brutal-sm">
                                <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">delete</span>
                              </button>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <a href="/tools/jadwal" className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-[3px] border-black bg-brand-panel px-4 font-label text-xs font-bold shadow-brutal transition-all hover:bg-brand-yellow active:translate-x-px active:translate-y-px active:shadow-none">
                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">calendar_month</span>
                    Buka daftar Tugas
                  </a>
                </section>

                <section aria-label="Sumber belajar" className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">link</span>
                      Link Sumber
                    </h3>
                    <button
                      type="button"
                      onClick={openSourceCreate}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm transition-all hover:bg-brand-panel active:translate-x-px active:translate-y-px active:shadow-none"
                    >
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">add</span>
                      Tambah
                    </button>
                  </div>
                  {active.sumber.length === 0 ? (
                    <p className="rounded-xl border-2 border-dashed border-black/30 bg-brand-paper p-4 text-sm font-medium text-brand-muted">
                      Belum ada sumber. Simpan slide, video, atau jurnal yang kamu pakai.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {active.sumber.map((s) => (
                        <li key={s.id} className="flex items-start gap-2 rounded-xl border-2 border-black/15 bg-brand-paper p-3">
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">public</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{s.label}</span>
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-xs font-bold text-brand-blue underline">
                                {s.url}
                              </a>
                            ) : <span className="block text-xs text-brand-muted">Tanpa tautan</span>}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Ubah ${s.label}`}
                              onClick={() => {
                                setFLabel(s.label);
                                setFUrl(s.url);
                                setModal({ kind: "source", sourceId: s.id });
                              }}
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-white shadow-brutal-sm"
                            >
                              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">edit</span>
                            </button>
                            <button type="button" aria-label={`Hapus ${s.label}`} onClick={() => setModal({ kind: "source-delete", sourceId: s.id })} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-black bg-white text-brand-brick shadow-brutal-sm">
                              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">delete</span>
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-label="Kelola dataku" className="rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
                  <p className="flex items-start gap-1.5 text-sm font-bold">
                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">database</span>
                    <span>Dataku di perangkat ini</span>
                  </p>
                  <p className="mt-1 font-label text-[11px] font-bold text-brand-muted">
                    {store.workspaces.length} ruang • tersimpan lokal (tanpa akun, tanpa server)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={exportJson} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">download</span>
                      Ekspor JSON
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">upload</span>
                      Impor
                    </button>
                    <button type="button" onClick={() => setModal({ kind: "wipe" })} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold text-brand-brick shadow-brutal-sm">
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">delete_forever</span>
                      Hapus semua
                    </button>
                  </div>
                </section>
              </div>
            </div>

            {/* Transkrip Belajar Tahap 3 — di rute materi yang sama, tanpa rute/registry baru */}
            <div className="mt-5">
              <TranscriptPanel
                workspaces={store.workspaces.map((w) => ({
                  id: w.id,
                  matkul: w.matkul,
                  topik: w.topik.map((t) => ({ id: t.id, title: t.title })),
                }))}
                notify={showToast}
              />
            </div>
            </>
          )}
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        aria-hidden
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) importFile(f);
          e.target.value = "";
        }}
      />

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={modalTitle} onClick={() => setModal(null)}>
          <div ref={dialogRef} tabIndex={-1} className="w-full max-w-md rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal" onClick={(e) => e.stopPropagation()}>
            <h2 className="flex items-center gap-1.5 font-display text-lg font-bold">
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[22px] leading-none">edit</span>
              {modalTitle}
            </h2>

            {(modal.kind === "ws-create" || modal.kind === "ws-rename") && (
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Nama mata kuliah</span>
                  <input
                    autoFocus
                    value={fMatkul}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFMatkul(e.target.value)}
                    placeholder="mis. Basis Data Lanjut"
                    maxLength={LIMITS.matkul}
                    className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-medium outline-none focus:bg-white"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(null)} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-white px-4 font-label text-xs font-bold shadow-brutal">Batal</button>
                  <button type="button" onClick={submitWs} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-brand-blue px-4 font-label text-xs font-bold text-white shadow-brutal">Simpan</button>
                </div>
              </div>
            )}

            {(modal.kind === "ws-delete" || modal.kind === "topic-delete" || modal.kind === "source-delete" || modal.kind === "task-delete" || modal.kind === "wipe") && (
              <div className="mt-3 flex flex-col gap-3">
                <p className="flex items-start gap-2 text-sm font-medium text-brand-muted">
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">warning</span>
                  <span>
                    {modal.kind === "ws-delete" && "Ruang beserta topik, catatan, sumber, dan tugas di dalamnya akan dihapus dari perangkat ini. Tugas yang sudah dikirim ke daftar Tugas tidak ikut terhapus."}
                    {modal.kind === "topic-delete" && "Topik ini akan dihapus dari ruang. Tautan ke daftar Tugas (bila ada) tidak ikut terhapus."}
                    {modal.kind === "source-delete" && "Sumber ini akan dihapus dari ruang."}
                    {modal.kind === "task-delete" && "Tugas ini akan dihapus dari ruang. Tugas yang sudah dikirim ke daftar Tugas tidak ikut terhapus."}
                    {modal.kind === "wipe" && "Semua ruang belajar di halaman ini akan dihapus dari perangkat. Ekspor dulu bila masih butuh."}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(null)} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-white px-4 font-label text-xs font-bold shadow-brutal">Batal</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!active && modal.kind !== "wipe") return;
                      if (modal.kind === "ws-delete") confirmWsDelete(modal.id);
                      else if (modal.kind === "wipe") {
                        persist({ ...freshStore(), updatedAt: new Date().toISOString() });
                        setModal(null);
                        showToast("Semua data halaman ini dihapus.");
                      } else if (modal.kind === "topic-delete" && active) {
                        persist(touchWs(active.id, { topik: active.topik.filter((t) => t.id !== modal.topicId) }));
                        setModal(null);
                        showToast("Topik dihapus.");
                      } else if (modal.kind === "source-delete" && active) {
                        persist(touchWs(active.id, { sumber: active.sumber.filter((s) => s.id !== modal.sourceId) }));
                        setModal(null);
                        showToast("Sumber dihapus.");
                      } else if (modal.kind === "task-delete" && active) {
                        persist(touchWs(active.id, { tugas: active.tugas.filter((g) => g.id !== modal.taskId) }));
                        setModal(null);
                        showToast("Tugas dihapus.");
                      }
                    }}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-brand-brick px-4 font-label text-xs font-bold text-white shadow-brutal"
                  >
                    Ya, hapus
                  </button>
                </div>
              </div>
            )}

            {modal.kind === "topic" && (
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Judul topik / chapter</span>
                  <input
                    autoFocus
                    value={fTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFTitle(e.target.value)}
                    placeholder="mis. Bab 3: Normalisasi"
                    maxLength={LIMITS.judulTopik}
                    className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-medium outline-none focus:bg-white"
                  />
                </label>
                <div className="flex gap-2" role="radiogroup" aria-label="Status topik">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={fStatus === s}
                      onClick={() => setFStatus(s)}
                      className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black px-2 font-label text-[11px] font-extrabold shadow-brutal-sm ${fStatus === s ? "bg-brand-navy text-white" : "bg-white"}`}
                    >
                      {TOPIC_STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Target kecil (opsional)</span>
                  <input
                    value={fObjective}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFObjective(e.target.value)}
                    placeholder="mis. paham 3NF + 1 contoh"
                    maxLength={LIMITS.objective}
                    className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-medium outline-none focus:bg-white"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(null)} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-white px-4 font-label text-xs font-bold shadow-brutal">Batal</button>
                  <button type="button" onClick={submitTopic} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-brand-blue px-4 font-label text-xs font-bold text-white shadow-brutal">Simpan</button>
                </div>
              </div>
            )}

            {modal.kind === "source" && (
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Nama sumber</span>
                  <input
                    autoFocus
                    value={fLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFLabel(e.target.value)}
                    placeholder="mis. Slide dosen bab 3"
                    maxLength={LIMITS.labelSumber}
                    className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-medium outline-none focus:bg-white"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Tautan (http/https, opsional)</span>
                  <input
                    value={fUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFUrl(e.target.value)}
                    placeholder="https://…"
                    inputMode="url"
                    maxLength={LIMITS.urlSumber}
                    className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-medium outline-none focus:bg-white"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(null)} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-white px-4 font-label text-xs font-bold shadow-brutal">Batal</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!active || modal.kind !== "source") return;
                      if (modal.sourceId) {
                        const label = fLabel.trim().slice(0, LIMITS.labelSumber);
                        const url = fUrl.trim().slice(0, LIMITS.urlSumber);
                        if (!label && !url) {
                          showToast("Isi dulu nama atau tautan sumbernya.");
                          return;
                        }
                        if (url && !isValidHttpUrl(url)) {
                          showToast("Tautan harus http(s) yang valid.");
                          return;
                        }
                        persist(touchWs(active.id, { sumber: active.sumber.map((s) => (s.id === modal.sourceId ? { ...s, label: label || url, url } : s)) }));
                        setModal(null);
                        showToast("Sumber diperbarui.");
                      } else submitSource();
                    }}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-brand-blue px-4 font-label text-xs font-bold text-white shadow-brutal"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {modal.kind === "task" && (
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Judul tugas</span>
                  <input
                    autoFocus
                    value={fTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFTitle(e.target.value)}
                    placeholder="mis. Laporan praktikum 3"
                    maxLength={LIMITS.judulTugas}
                    className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-medium outline-none focus:bg-white"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Tenggat (opsional)</span>
                  <input
                    type="date"
                    value={fDeadline}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFDeadline(e.target.value)}
                    className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-medium outline-none focus:bg-white"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(null)} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-white px-4 font-label text-xs font-bold shadow-brutal">Batal</button>
                  <button type="button" onClick={submitTask} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-brand-blue px-4 font-label text-xs font-bold text-white shadow-brutal">Simpan</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-2xl border-[3px] border-black bg-brand-yellow px-4 py-3 font-label text-xs font-bold text-black shadow-brutal md:bottom-6">
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">check_circle</span>
          <span>{toast}</span>
        </div>
      )}
    </ToolShell>
  );
}
