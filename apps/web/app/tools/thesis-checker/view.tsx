"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import { loadTasks, saveTasks } from "../../../components/task-store";
import {
  BIMBINGAN_KEY,
  addBimbingan,
  bimbinganPerProject,
  bimbinganTag,
  bimbinganTaskInput,
  emptyBimbinganStore,
  hitungBimbingan,
  makeBimbingan,
  orphanBimbingan,
  parseBimbinganStore,
  resolveTaskLink,
  setStatusBimbingan,
  setTaskBimbingan,
  todayLocal,
  type Bimbingan,
  type BimbinganStore,
} from "@cademy/utils";
import {
  KNOWN_THESIS_IDS,
  THESIS_V1_KEY,
  THESIS_V2_KEY,
  buildLaporanMarkdown,
  defaultProject,
  hitungProgressProyek,
  migrateV1ToV2,
  parseThesisV2,
  resolveRevisionLink,
  revisionTag,
  revisionTaskTitle,
  type LabelItem,
  type ThesisDocType,
  type ThesisProject,
  type ThesisStatus,
  type ThesisV2,
} from "@cademy/utils";

interface Item {
  id: string;
  label: string;
}
const GROUPS: Array<{ id: string; title: string; items: Item[] }> = [
  { id: "bab", title: "Kelengkapan Bab", items: [
    { id: "cover", label: "Cover, lembar pengesahan & abstrak" },
    { id: "bab1", label: "Bab 1: latar belakang, rumusan & tujuan jelas" },
    { id: "bab2", label: "Bab 2: kajian pustaka mutakhir & kerangka teori" },
    { id: "bab3", label: "Bab 3: metode (desain, data, analisis) lengkap" },
    { id: "bab45", label: "Bab 4–5: hasil, pembahasan & simpulan sinkron" },
    { id: "pustaka", label: "Daftar pustaka + lampiran" },
  ]},
  { id: "struktur", title: "Struktur & Format", items: [
    { id: "nomor", label: "Penomoran bab/tabel/gambar konsisten" },
    { id: "font", label: "Font, spasi & margin sesuai panduan kampus" },
    { id: "tabel", label: "Setiap tabel/gambar dirujuk di teks" },
    { id: "konsisten", label: "Istilah & singkatan konsisten" },
  ]},
  { id: "sitasi", title: "Sitasi & Orisinalitas", items: [
    { id: "gaya", label: "Gaya sitasi konsisten (APA/MLA/Chicago)" },
    { id: "doi", label: "DOI/URL sumber tercantum & dapat diakses" },
    { id: "kutip", label: "Kutipan langsung < 10% (acuan umum — cek pedoman kampusmu) & diberi tanda kutip" },
    { id: "plagiasi", label: "Cek plagiarisme di bawah batas kampus (acuan umum — cek pedoman kampusmu)" },
  ]},
  { id: "bahasa", title: "Bahasa & Kata", items: [
    { id: "baku", label: "Kata baku (di/ke, -kan) sudah benar" },
    { id: "kalimat", label: "Kalimat efektif, tidak bertele-tele" },
    { id: "typo", label: "Bebas typo — sudah proofread 2x" },
  ]},
];

const LABELS: LabelItem[] = GROUPS.flatMap((g) =>
  g.items.map((i) => ({ id: i.id, label: i.label, group: g.title })),
);
const labelOf = (id: string): string =>
  LABELS.find((l) => l.id === id)?.label ?? id;

const DOC_TYPES: ThesisDocType[] = ["proposal", "skripsi", "tesis", "laporan"];
const STATUS: ThesisStatus[] = ["belum", "perlu", "selesai"];

const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const inputCls =
  "h-10 w-full rounded-xl border-[3px] border-black bg-white px-2.5 font-body text-xs text-brand-navy outline-none placeholder:text-brand-muted focus:bg-brand-paper";

export default function ThesisPage() {
  const [projects, setProjects] = React.useState<ThesisProject[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");
  const [ready, setReady] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [namaBaru, setNamaBaru] = React.useState("");
  const [konfirmHapus, setKonfirmHapus] = React.useState(false);
  const [konfirmPutus, setKonfirmPutus] = React.useState<string | null>(null);
  // Id tugas Jadwal yang masih ada — untuk validasi tautan revisi.
  const [taskIds, setTaskIds] = React.useState<Set<string> | null>(null);
  // Log bimbingan (key aditif `cademy:bimbingan-v1`) — mandiri dari tugas.
  const [bimbStore, setBimbStore] = React.useState<BimbinganStore>(() => emptyBimbinganStore());
  const [logForm, setLogForm] = React.useState({
    tanggal: todayLocal(),
    masukan: "",
    sectionId: "",
    tindakLanjut: "",
    deadline: "",
  });
  const [konfirmPutusBimb, setKonfirmPutusBimb] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // MIGRASI saat mount: v2 → pakai; hanya v1 → proyek default; rusak → default kosong + toast.
  React.useEffect(() => {
    let v2: ThesisV2 | null = null;
    try {
      const raw = localStorage.getItem(THESIS_V2_KEY);
      if (raw) v2 = parseThesisV2(JSON.parse(raw));
    } catch {
      v2 = null;
    }
    if (v2 && v2.projects.length > 0) {
      setProjects(v2.projects);
      setActiveId(v2.projects[0].id);
      setReady(true);
      return;
    }
    if (v2 && v2.projects.length === 0) {
      const p = defaultProject();
      setProjects([p]);
      setActiveId(p.id);
      setReady(true);
      return;
    }
    // Tak ada v2 valid → coba v1.
    let v1raw: string | null = null;
    try {
      v1raw = localStorage.getItem(THESIS_V1_KEY);
    } catch {
      v1raw = null;
    }
    if (v1raw) {
      try {
        const parsed: unknown = JSON.parse(v1raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const mig = migrateV1ToV2(parsed, KNOWN_THESIS_IDS);
          setProjects(mig.projects);
          setActiveId(mig.projects[0].id);
          try {
            localStorage.setItem(THESIS_V2_KEY, JSON.stringify(mig));
          } catch {}
          // Key LAMA dipertahankan (jangan dihapus).
          setReady(true);
          showToast("Data lama dimigrasi ke proyek baru!");
          return;
        }
        throw new Error("v1 bukan objek");
      } catch {
        // v1 rusak → proyek default kosong + toast.
        const p = defaultProject();
        setProjects([p]);
        setActiveId(p.id);
        setReady(true);
        showToast("Data lama rusak — mulai dengan proyek baru.");
        return;
      }
    }
    // v2 rusak (ada tapi tak valid) + tanpa v1 → default kosong + toast.
    let v2AdaTapiRusak = false;
    try {
      v2AdaTapiRusak = localStorage.getItem(THESIS_V2_KEY) !== null;
    } catch {}
    const p = defaultProject();
    setProjects([p]);
    setActiveId(p.id);
    setReady(true);
    if (v2AdaTapiRusak) showToast("Data lama rusak — mulai dengan proyek baru.");
  }, [showToast]);

  React.useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(THESIS_V2_KEY, JSON.stringify({ version: 2, projects }));
    } catch {}
  }, [projects, ready]);

  // Log bimbingan: muat sekali (toleran — rusak → kosong, jangan crash),
  // simpan otomatis. Relasi orphan TIDAK diprune (ditandai di UI).
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(BIMBINGAN_KEY);
      setBimbStore(parseBimbinganStore(raw ? JSON.parse(raw) : null));
    } catch {
      setBimbStore(emptyBimbinganStore());
    }
  }, []);
  React.useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(BIMBINGAN_KEY, JSON.stringify(bimbStore));
    } catch {}
  }, [bimbStore, ready]);

  // Validasi tautan revisi saat render: hapus entri basi (tugas dihapus
  // manual di Jadwal) agar tombol tak terkunci "Sudah jadi tugas" selamanya.
  const refreshTaskIds = React.useCallback(() => {
    try {
      setTaskIds(new Set(loadTasks().map((t) => t.id)));
    } catch {
      setTaskIds(new Set());
    }
  }, []);
  React.useEffect(() => {
    if (!ready) return;
    refreshTaskIds();
    window.addEventListener("focus", refreshTaskIds);
    window.addEventListener("storage", refreshTaskIds);
    return () => {
      window.removeEventListener("focus", refreshTaskIds);
      window.removeEventListener("storage", refreshTaskIds);
    };
  }, [ready, refreshTaskIds]);
  React.useEffect(() => {
    if (!ready || taskIds === null) return;
    const tasks = [...taskIds].map((id) => ({ id }));
    setProjects((list) => {
      let berubah = false;
      const next = list.map((p) => {
        const links: Record<string, string | undefined> = { ...p.revisionLinks };
        for (const [k, v] of Object.entries(links)) {
          if (v !== undefined && resolveRevisionLink(v, tasks) === null) {
            delete links[k];
            berubah = true;
          }
        }
        return { ...p, revisionLinks: links };
      });
      return berubah ? next : list;
    });
  }, [ready, taskIds]);

  const aktif: ThesisProject | undefined = projects.find((p) => p.id === activeId) ?? projects[0];
  const { selesai, total, pct } = aktif
    ? hitungProgressProyek(aktif, KNOWN_THESIS_IDS)
    : { selesai: 0, total: 17, pct: 0 };

  function patchAktif(fn: (p: ThesisProject) => ThesisProject) {
    if (!aktif) return;
    setProjects((list) => list.map((p) => (p.id === aktif.id ? fn(p) : p)));
  }

  function setStatus(itemId: string, status: ThesisStatus) {
    patchAktif((p) => ({
      ...p,
      states: { ...p.states, [itemId]: { ...(p.states[itemId] ?? { status: "belum" }), status } },
    }));
  }

  function setField(itemId: string, field: "note" | "page" | "deadline", value: string) {
    patchAktif((p) => ({
      ...p,
      states: { ...p.states, [itemId]: { ...(p.states[itemId] ?? { status: "belum" }), [field]: value } },
    }));
  }

  function buatProyek() {
    const nama = namaBaru.trim() || `Proyek ${projects.length + 1}`;
    const p = defaultProject(nama);
    setProjects((list) => [...list, p]);
    setActiveId(p.id);
    setNamaBaru("");
    setKonfirmHapus(false);
    setKonfirmPutus(null);
    showToast(`Proyek "${nama}" dibuat!`);
  }

  function gantiNama(nama: string) {
    if (!aktif) return;
    patchAktif((p) => ({ ...p, name: nama }));
  }

  function gantiDocType(docType: ThesisDocType) {
    patchAktif((p) => ({ ...p, docType }));
  }

  function hapusAktif() {
    if (!aktif) return;
    if (!konfirmHapus) {
      setKonfirmHapus(true);
      return;
    }
    const sisa = projects.filter((p) => p.id !== aktif.id);
    const fallback = sisa.length > 0 ? sisa : [defaultProject()];
    setProjects(fallback);
    setActiveId(fallback[0].id);
    setKonfirmHapus(false);
    showToast("Proyek dihapus!");
  }

  function jadikanTugas(itemId: string) {
    if (!aktif) return;
    const tag = revisionTag(aktif.id, itemId);
    try {
      const semua = loadTasks();
      const linkLama = aktif.revisionLinks[itemId];
      if (resolveRevisionLink(linkLama, semua) !== null) return; // ANTI DUPLIKAT: masih terlink valid.
      if (linkLama !== undefined) {
        // Tautan basi (tugas dihapus di Jadwal) → hapus entri, lanjut normal.
        patchAktif((p) => {
          const links = { ...p.revisionLinks };
          delete links[itemId];
          return { ...p, revisionLinks: links };
        });
      }
      const cocok = semua.find((t) => t.tag === tag);
      if (cocok) {
        // Tugas sudah ada (mis. dibuat manual) → tautkan saja, jangan ganda.
        patchAktif((p) => ({ ...p, revisionLinks: { ...p.revisionLinks, [itemId]: cocok.id } }));
        setTaskIds(new Set([...semua.map((t) => t.id), cocok.id]));
        showToast("Sudah jadi tugas — ditautkan ke tugas yang ada!");
        return;
      }
      const st = aktif.states[itemId];
      const baru = {
        id: uid(),
        source: "jadwal" as const,
        status: "todo" as const,
        prioritas: "sedang" as const,
        title: revisionTaskTitle(labelOf(itemId)),
        description: st?.note ?? "",
        dueDate: st?.deadline ?? "",
        tag,
        progres: 0,
        catatan: 0,
        createdAt: new Date().toISOString(),
      };
      saveTasks([...semua, baru]);
      setTaskIds(new Set([...semua.map((t) => t.id), baru.id]));
      patchAktif((p) => ({ ...p, revisionLinks: { ...p.revisionLinks, [itemId]: baru.id } }));
      showToast("Tugas revisi dibuat di Jadwal!");
    } catch {
      showToast("Gagal membuat tugas — coba lagi.");
    }
  }

  function putusTautan(itemId: string) {
    if (!aktif) return;
    if (konfirmPutus !== itemId) {
      setKonfirmPutus(itemId);
      return;
    }
    patchAktif((p) => {
      const links = { ...p.revisionLinks };
      delete links[itemId];
      return { ...p, revisionLinks: links };
    });
    setKonfirmPutus(null);
    showToast("Tautan diputus — tugas di Jadwal tetap ada.");
  }

  // ---- Log bimbingan & tindak lanjut ----
  const cloneBimb = (s: BimbinganStore): BimbinganStore => JSON.parse(JSON.stringify(s));
  const bimbAktif: Bimbingan[] = aktif ? bimbinganPerProject(bimbStore, aktif.id) : [];
  const bimbHit = hitungBimbingan(bimbAktif);
  const bimbOrphan = orphanBimbingan(bimbStore, projects.map((p) => p.id));

  function tambahLog() {
    if (!aktif) return;
    const masukan = logForm.masukan.trim();
    const tindak = logForm.tindakLanjut.trim();
    if (!masukan || !tindak) {
      showToast("Masukan dosen dan tindak lanjut wajib diisi.");
      return;
    }
    const log = makeBimbingan({
      tanggal: logForm.tanggal,
      masukan,
      sectionId: logForm.sectionId.trim() || undefined,
      tindakLanjut: tindak,
      deadline: logForm.deadline || undefined,
    });
    const next = cloneBimb(bimbStore);
    addBimbingan(next, aktif.id, log);
    setBimbStore(next);
    setLogForm({ tanggal: todayLocal(), masukan: "", sectionId: "", tindakLanjut: "", deadline: "" });
    showToast("Catatan bimbingan ditambahkan!");
  }

  function ubahStatusLog(id: string, status: "terbuka" | "selesai") {
    if (!aktif) return;
    const next = cloneBimb(bimbStore);
    setStatusBimbingan(next, aktif.id, id, status);
    setBimbStore(next);
  }

  function jadikanTugasBimbingan(logId: string) {
    if (!aktif) return;
    const log = bimbinganPerProject(bimbStore, aktif.id).find((b) => b.id === logId);
    if (!log) return;
    try {
      const semua = loadTasks();
      // ANTI DUPLIKAT: tautan yang masih valid → selesai.
      if (log.taskId && resolveTaskLink(log.taskId, semua) !== null) {
        showToast("Sudah jadi tugas — ditautkan ke tugas yang ada!");
        return;
      }
      const input = bimbinganTaskInput(log, aktif.id, aktif.name, log.sectionId);
      const cocok = semua.find((t) => t.tag === input.tag);
      let taskId: string;
      if (cocok) {
        taskId = cocok.id; // tugas sudah ada → tautkan saja, jangan gandakan
      } else {
        const baru = {
          id: uid(),
          source: "jadwal" as const,
          status: "todo" as const,
          prioritas: "sedang" as const,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate || "",
          tag: input.tag,
          progres: 0,
          catatan: 0,
          createdAt: new Date().toISOString(),
        };
        saveTasks([...semua, baru]); // BISA THROW → log tetap aman (taskId belum diset)
        taskId = baru.id;
      }
      const next = cloneBimb(bimbStore);
      setTaskBimbingan(next, aktif.id, logId, taskId);
      setBimbStore(next);
      setTaskIds(new Set([...semua.map((t) => t.id), taskId]));
      showToast(cocok ? "Sudah jadi tugas — ditautkan ke tugas yang ada!" : "Tindak lanjut dijadwalkan di Jadwal!");
    } catch {
      // Revisi E: kegagalan TIDAK menghapus log bimbingan.
      showToast("Gagal membuat tugas — catatan bimbingan tetap aman.");
    }
  }

  function putusTautanBimb(logId: string) {
    if (!aktif) return;
    if (konfirmPutusBimb !== logId) {
      setKonfirmPutusBimb(logId);
      return;
    }
    const next = cloneBimb(bimbStore);
    setTaskBimbingan(next, aktif.id, logId, undefined);
    setBimbStore(next);
    setKonfirmPutusBimb(null);
    showToast("Tautan diputus — tugas di Jadwal tetap ada.");
  }

  function unduhLaporan() {
    if (!aktif) return;
    const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const md = buildLaporanMarkdown(aktif, LABELS, tanggal);
    try {
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-revisi-${aktif.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "proyek"}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Laporan .md diunduh!");
    } catch {
      showToast("Gagal mengunduh — coba lagi.");
    }
  }

  return (
    <ToolShell eyebrow="Hub / Alat" title="Thesis Checker" description="Checklist skripsi per proyek: bab, struktur, sitasi, dan bahasa. Progress tersimpan otomatis." icon="bolt" badge={`Beta • ${pct}%`} badgeTone="beta">
      {/* Pemilih proyek */}
      <Panel className="mb-4 space-y-3 bg-white">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2">
            <span className="font-label text-xs font-extrabold uppercase text-brand-navy">Proyek</span>
            <select
              value={aktif?.id ?? ""}
              onChange={(e) => { setActiveId(e.target.value); setKonfirmHapus(false); setKonfirmPutus(null); }}
              className={`${inputCls} h-11 font-bold`}
              aria-label="Pilih proyek"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <input
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              placeholder="Nama proyek baru…"
              className={`${inputCls} h-11 sm:w-44`}
              aria-label="Nama proyek baru"
            />
            <Button size="sm" onClick={buatProyek}>Buat</Button>
          </div>
        </div>
        {aktif && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex flex-1 items-center gap-2">
              <span className="font-label text-xs font-extrabold uppercase text-brand-navy">Ganti nama</span>
              <input
                value={aktif.name}
                onChange={(e) => gantiNama(e.target.value)}
                className={`${inputCls} h-11 font-bold`}
                aria-label="Ganti nama proyek"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="font-label text-xs font-extrabold uppercase text-brand-navy">Jenis</span>
              <select
                value={aktif.docType}
                onChange={(e) => gantiDocType(e.target.value as ThesisDocType)}
                className={`${inputCls} h-11 w-36 font-bold`}
                aria-label="Jenis dokumen"
              >
                {DOC_TYPES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            {!konfirmHapus ? (
              <Button size="sm" variant="secondary" onClick={hapusAktif}>Hapus</Button>
            ) : (
              <span className="flex items-center gap-2 rounded-xl border-2 border-black bg-brand-paper p-1.5 text-xs font-bold">
                Yakin hapus?
                <Button size="sm" variant="secondary" onClick={hapusAktif}>Ya, hapus</Button>
                <Button size="sm" variant="secondary" onClick={() => setKonfirmHapus(false)}>Batal</Button>
              </span>
            )}
          </div>
        )}
        <p className="font-body text-xs text-brand-muted">Proyek tersimpan di browser ini (localStorage). Unduh laporan .md untuk dibagikan. File ini bukan cadangan data dan tidak dapat digunakan untuk memulihkan data Cademy.</p>
      </Panel>

      {/* Progress */}
      <Panel className="mb-4 bg-white">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>{selesai}/{total} selesai</span><span>{pct}%</span>
        </div>
        <div className="mt-2 h-5 overflow-hidden rounded-full border-[3px] border-black bg-brand-paper">
          <div className="h-full bg-brand-yellow transition-all" style={{ width: `${pct}%` }} />
        </div>
        {pct === 100 && <p className="mt-2 flex items-center gap-1.5 font-bold text-green-700"><span aria-hidden className="material-symbols-outlined text-[20px]">celebration</span> Siap sidang! Tetap minta review pembimbing ya.</p>}
      </Panel>

      {/* Log bimbingan & tindak lanjut */}
      <Panel className="mb-4 space-y-3 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Log Bimbingan &amp; Tindak Lanjut</h2>
          {aktif ? (
            <span className="rounded-full border-2 border-black bg-brand-panel px-2 py-0.5 text-xs font-bold">
              {bimbHit.terbuka} terbuka · {bimbHit.selesai} selesai
            </span>
          ) : null}
        </div>
        <p className="font-body text-xs text-brand-muted">
          Catat tiap bimbingan: tanggal, masukan dosen, bab terkait, tindak lanjut, tenggat.
          Tersimpan di browser ini (localStorage). Tindak lanjut bisa dijadikan tugas di Jadwal
          tanpa membuat duplikat — catatan tetap aman walau tugas gagal dibuat atau dihapus.
        </p>
        {bimbOrphan.length > 0 && (
          <p className="rounded-xl bg-brand-yellow/60 p-2 text-xs font-bold">
            {bimbOrphan.length} catatan untuk proyek yang sedang tidak terbaca disimpan aman — tidak dihapus.
          </p>
        )}
        {aktif ? (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Tanggal</span>
                <input
                  type="date"
                  className={`${inputCls} h-11`}
                  value={logForm.tanggal}
                  onChange={(e) => setLogForm((f) => ({ ...f, tanggal: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Bab terkait (opsional)</span>
                <input
                  className={`${inputCls} h-11`}
                  placeholder="cth: Bab 3"
                  value={logForm.sectionId}
                  onChange={(e) => setLogForm((f) => ({ ...f, sectionId: e.target.value }))}
                />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="font-label text-xs font-bold uppercase">Masukan dosen *</span>
                <textarea
                  rows={2}
                  className={`${inputCls} h-auto py-2`}
                  value={logForm.masukan}
                  onChange={(e) => setLogForm((f) => ({ ...f, masukan: e.target.value }))}
                  placeholder="cth: pertegas metode analisis data"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Tindak lanjut *</span>
                <input
                  className={`${inputCls} h-11`}
                  value={logForm.tindakLanjut}
                  onChange={(e) => setLogForm((f) => ({ ...f, tindakLanjut: e.target.value }))}
                  placeholder="cth: tulis ulang bab 3"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Tenggat (opsional)</span>
                <input
                  type="date"
                  className={`${inputCls} h-11`}
                  value={logForm.deadline}
                  onChange={(e) => setLogForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </label>
            </div>
            <div>
              <Button size="sm" onClick={tambahLog}>Tambah catatan</Button>
            </div>
            {bimbAktif.length === 0 ? (
              <p className="text-sm">
                Belum ada catatan bimbingan untuk proyek ini — kosong sampai kamu tambahkan sendiri.
              </p>
            ) : (
              <div className="space-y-2">
                {bimbAktif.map((b) => {
                  const terlink = b.taskId !== undefined;
                  const basi = terlink && taskIds !== null && !taskIds.has(b.taskId!);
                  return (
                    <div key={b.id} className="rounded-xl border-2 border-black/20 bg-brand-paper p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold">
                          {b.tanggal}{b.sectionId ? ` · ${b.sectionId}` : ""}
                        </p>
                        <span
                          className={`rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-bold ${
                            b.status === "selesai" ? "bg-green-100" : "bg-brand-yellow/60"
                          }`}
                        >
                          {b.status === "selesai" ? "selesai" : "terbuka"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">Masukan: {b.masukan}</p>
                      <p className="mt-0.5 text-sm font-bold">
                        Tindak lanjut: {b.tindakLanjut}
                        {b.deadline ? ` (tenggat ${b.deadline})` : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {b.status === "terbuka" ? (
                          <Button size="sm" variant="secondary" onClick={() => ubahStatusLog(b.id, "selesai")}>
                            Tandai selesai
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => ubahStatusLog(b.id, "terbuka")}>
                            Buka lagi
                          </Button>
                        )}
                        {terlink ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-bold ${
                                basi ? "bg-brand-brick text-white" : "bg-white"
                              }`}
                            >
                              {basi ? "tautan basi" : "sudah jadi tugas"}
                            </span>
                            {konfirmPutusBimb === b.id ? (
                              <>
                                <Button size="sm" variant="secondary" onClick={() => putusTautanBimb(b.id)}>
                                  Ya, putus
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => setKonfirmPutusBimb(null)}>
                                  Batal
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => setKonfirmPutusBimb(b.id)}>
                                Putus tautan
                              </Button>
                            )}
                          </span>
                        ) : (
                          <Button size="sm" onClick={() => jadikanTugasBimbingan(b.id)}>
                            Jadikan tugas
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </Panel>

      {/* 17 item */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GROUPS.map((g) => {
          const gHit = aktif ? g.items.filter((i) => aktif.states[i.id]?.status === "selesai").length : 0;
          return (
            <Panel key={g.id} className="bg-white">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{g.title}</h2>
                <span className="rounded-full border-2 border-black bg-brand-panel px-2 py-0.5 text-xs font-bold">{gHit}/{g.items.length}</span>
              </div>
              <div className="mt-3 space-y-3">
                {g.items.map((it) => {
                  const st = aktif?.states[it.id];
                  const status: ThesisStatus = st?.status ?? "belum";
                  const linkId = aktif?.revisionLinks[it.id];
                  const terlink =
                    linkId !== undefined &&
                    (taskIds === null ||
                      resolveRevisionLink(linkId, [...taskIds].map((id) => ({ id }))) !== null);
                  return (
                    <div key={it.id} className={`rounded-xl border-2 p-2.5 ${status === "selesai" ? "border-black/20 bg-brand-paper opacity-80" : "border-black/20 bg-white"}`}>
                      <p className={`text-sm font-semibold ${status === "selesai" ? "line-through" : ""}`}>{it.label}</p>
                      <div className="mt-2 flex gap-1.5" role="group" aria-label={`Status: ${it.label}`}>
                        {STATUS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(it.id, s)}
                            aria-pressed={status === s}
                            className={`flex-1 rounded-full border-2 border-black px-2 py-1 font-label text-[11px] font-extrabold uppercase shadow-[2px_2px_0px_#000000] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                              status === s
                                ? s === "selesai" ? "bg-green-600 text-white" : s === "perlu" ? "bg-brand-yellow text-black" : "bg-brand-navy text-white"
                                : "bg-white text-brand-navy hover:bg-brand-panel"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <input
                          value={st?.page ?? ""}
                          onChange={(e) => setField(it.id, "page", e.target.value)}
                          placeholder="Hal. (cth. 12)"
                          className={inputCls}
                          aria-label={`Halaman: ${it.label}`}
                        />
                        <input
                          type="date"
                          value={st?.deadline ?? ""}
                          onChange={(e) => setField(it.id, "deadline", e.target.value)}
                          className={inputCls}
                          aria-label={`Deadline: ${it.label}`}
                        />
                      </div>
                      <textarea
                        value={st?.note ?? ""}
                        onChange={(e) => setField(it.id, "note", e.target.value)}
                        rows={1}
                        placeholder="Catatan revisi…"
                        className="mt-1.5 w-full rounded-xl border-[3px] border-black bg-white px-2.5 py-1.5 font-body text-xs text-brand-navy outline-none placeholder:text-brand-muted focus:bg-brand-paper"
                        aria-label={`Catatan: ${it.label}`}
                      />
                      {status === "perlu" && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={terlink}
                            onClick={() => jadikanTugas(it.id)}
                          >
                            {terlink ? "Sudah jadi tugas" : "Jadikan Tugas"}
                          </Button>
                          {linkId !== undefined && (
                            konfirmPutus !== it.id ? (
                              <Button size="sm" variant="secondary" onClick={() => putusTautan(it.id)}>
                                Putus tautan
                              </Button>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-bold">
                                Putus? Tugas di Jadwal tetap ada.
                                <Button size="sm" variant="secondary" onClick={() => putusTautan(it.id)}>Ya, putus</Button>
                                <Button size="sm" variant="secondary" onClick={() => setKonfirmPutus(null)}>Batal</Button>
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={unduhLaporan}>Unduh Laporan Revisi (.md)</Button>
      </div>

      {toast && (
        <div aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border-[3px] border-black bg-brand-navy px-4 py-3 font-body text-sm text-white shadow-brutal">
          <span aria-hidden className="material-symbols-outlined text-[20px] text-brand-yellow">check_circle</span>
          <span>{toast}</span>
        </div>
      )}
    </ToolShell>
  );
}
