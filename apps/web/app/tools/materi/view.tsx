"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";

type Tab = "ringkasan" | "daftar" | "diskusi" | "unduh";

interface Materi {
  id: string;
  modul: string;
  title: string;
  duration: string;
  totalSecs: number;
  tujuan: string[];
  poin: string[];
  kode?: string;
}

interface Progress {
  tasks: boolean[];
  done: boolean;
  comments: Array<{ nama: string; pesan: string }>;
  catatan?: string;
}

const KEY = "cademy:materi-progress";
const LAST_KEY = "cademy:materi-last";

const PLAYLIST: Materi[] = [
  {
    id: "modul-05",
    modul: "MODUL 05",
    title: "Pertemuan 5: Normalisasi & Desain Skema Relasional",
    duration: "38:10",
    totalSecs: 2290,
    tujuan: [
      "Memahami tujuan normalisasi: mengurangi duplikasi dan anomali data.",
      "Mengenali bentuk normal dasar (1NF sampai 3NF) dari contoh skema.",
      "Berlatih memecah tabel yang belum rapi menjadi skema relasional yang jelas.",
    ],
    poin: [
      "Normalisasi adalah proses merapikan skema agar setiap fakta disimpan di satu tempat.",
      "Anomali umum: data ganda saat insert, sulit update, dan baris hilang saat delete.",
      "Tidak selalu sampai bentuk tertinggi — sesuaikan dengan kebutuhan baca dan kesederhanaan.",
    ],
    kode: `-- Contoh pemecahan tabel yang belum rapi\nCREATE TABLE pelanggan (\n  id INT PRIMARY KEY,\n  nama TEXT NOT NULL\n);\n\nCREATE TABLE pesanan (\n  id INT PRIMARY KEY,\n  pelanggan_id INT REFERENCES pelanggan(id),\n  tanggal DATE NOT NULL\n);`,
  },
  {
    id: "modul-06",
    modul: "MODUL 06",
    title: "Pertemuan 6: Transaksi, Locking & Kontrol Konkurensi",
    duration: "41:35",
    totalSecs: 2495,
    tujuan: [
      "Memahami sifat transaksi: atomic, konsisten, terisolasi, dan tahan lama.",
      "Mengenali masalah umum saat banyak pengguna mengubah data bersamaan.",
      "Mengenal konsep locking dasar sebagai cara mengatur akses bergantian.",
    ],
    poin: [
      "Transaksi membungkus beberapa perubahan agar berhasil semua atau batal semua.",
      "Masalah konkurensi umum: perubahan tertimpa, baca data yang belum final, dan baca berulang yang hasilnya beda.",
      "Locking mengatur siapa boleh ubah baris duluan; transaksi yang pendek dan jelas mengurangi antrean.",
    ],
    kode: `-- Pola transaksi generik (bukan hasil ukur)\nBEGIN;\nUPDATE akun SET saldo = saldo - 100 WHERE id = 1;\nUPDATE akun SET saldo = saldo + 100 WHERE id = 2;\nCOMMIT;`,
  },
  {
    id: "modul-07",
    modul: "MODUL 07",
    title: "Pertemuan 7: Optimasi Query Database dan Pengindeksan Tingkat Lanjut",
    duration: "45:00",
    totalSecs: 2700,
    tujuan: [
      "Memahami peran indeks dalam mempercepat pencarian baris.",
      "Membaca rencana query (query plan) secara umum untuk menemukan pemindaian besar.",
      "Membiasakan pola query sederhana yang mudah dipahami basis data.",
    ],
    poin: [
      "Indeks membantu pencarian kolom yang sering difilter; tanpa indeks, basis data memindai seluruh tabel.",
      "Rencana query menunjukkan strategi baca tabel — pelajari polanya dari dokumentasi basis datamu.",
      "Indeks bukan gratis: tiap tulis data ikut memperbarui indeks, jadi buat hanya untuk kebutuhan nyata.",
    ],
    kode: `-- Contoh generik (materi bacaan, bukan hasil ukur)\nCREATE INDEX idx_pesanan_pelanggan ON pesanan(pelanggan_id);\nEXPLAIN SELECT * FROM pesanan WHERE pelanggan_id = 1;`,
  },
  {
    id: "modul-08",
    modul: "MODUL 08",
    title: "Modul 08: Partisi Tabel & Query Sharding",
    duration: "45:00",
    totalSecs: 2700,
    tujuan: [
      "Memahami konsep partisi: memecah tabel besar jadi bagian yang lebih kecil.",
      "Membedakan partisi dalam satu basis data dengan sharding antar basis data.",
      "Menimbang pemilihan kunci partisi dari pola akses yang umum.",
    ],
    poin: [
      "Partisi memecah tabel besar berdasarkan kunci (misalnya rentang tanggal) agar kueri menyentuh bagian yang perlu saja.",
      "Sharding menyebar data ke beberapa basis data; lebih kompleks dan butuh strategi operasional.",
      "Materi ini bersifat bacaan konseptual — praktiknya tergantung kebutuhan dan kesiapan tim.",
    ],
    kode: `-- Sketsa konseptual, sesuaikan dengan basis datamu\nCREATE TABLE log_aktivitas (\n  id INT,\n  tanggal DATE NOT NULL,\n  aksi TEXT\n) PARTITION BY RANGE (tanggal);`,
  },
  {
    id: "modul-09",
    modul: "MODUL 09",
    title: "Pertemuan 9: Replikasi & Backup Strategi Enterprise",
    duration: "47:20",
    totalSecs: 2840,
    tujuan: [
      "Membedakan replikasi (salinan berjalan) dengan backup (salinan arsip).",
      "Memahami pentingnya jadwal backup dan uji pemulihan berkala.",
      "Menyusun checklist pemulihan sederhana untuk keadaan darurat.",
    ],
    poin: [
      "Replikasi menjaga salinan berjalan untuk ketersediaan; backup menjaga arsip untuk pemulihan.",
      "Backup yang tidak pernah diuji pemulihannya sama dengan tidak punya backup.",
      "Catat langkah pemulihan: lokasi arsip, urutan restore, dan cara verifikasi data kembali.",
    ],
  },
];

const DEFAULT_TASKS = [true, true, false];

const TASK_LABELS = [
  { title: "Baca ringkasan modul sampai selesai", sub: "Selesai • Bacaan" },
  { title: "Tulis catatan ringkasan sendiri", sub: "Selesai • Catatan" },
  { title: "Kerjakan latihan kuis umum", sub: "Sedang Dikerjakan" },
];

function loadAll(): Record<string, Progress> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Record<string, Progress>;
    return typeof p === "object" && p !== null ? p : {};
  } catch {
    return {};
  }
}

function defaultProgress(): Progress {
  return { tasks: [...DEFAULT_TASKS], done: false, comments: [], catatan: "" };
}

// Toleran field ekstra JSON lama: dibaca tanpa crash, lalu diabaikan.
function normalizeProgress(p: unknown): Progress {
  const base = defaultProgress();
  if (!p || typeof p !== "object") return base;
  const o = p as Partial<Progress>;
  return {
    tasks: Array.isArray(o.tasks) && o.tasks.length === base.tasks.length ? o.tasks : [...base.tasks],
    done: typeof o.done === "boolean" ? o.done : false,
    comments: Array.isArray(o.comments) ? o.comments : [],
    catatan: typeof o.catatan === "string" ? o.catatan : "",
  };
}

export default function MateriPage() {
  const [activeId, setActiveId] = React.useState<string>("modul-07");
  const [store, setStore] = React.useState<Record<string, Progress>>({});
  const [tab, setTab] = React.useState<Tab>("ringkasan");
  const [toast, setToast] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [nama, setNama] = React.useState("");
  const [pesan, setPesan] = React.useState("");
  const toastTimer = React.useRef<number | null>(null);

  const active = PLAYLIST.find((m) => m.id === activeId) ?? PLAYLIST[2];
  const activeIdx = PLAYLIST.findIndex((m) => m.id === activeId);
  const prog: Progress = normalizeProgress(store[active.id]);

  React.useEffect(() => {
    setStore(loadAll());
    try {
      const last = localStorage.getItem(LAST_KEY);
      if (last && PLAYLIST.some((m) => m.id === last)) setActiveId(last);
    } catch {
      /* abaikan */
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(KEY, JSON.stringify(store));
        localStorage.setItem(LAST_KEY, activeId);
      } catch {
        /* abaikan */
      }
    }
  }, [store, activeId, ready]);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  function patch(p: Partial<Progress>) {
    setStore((s) => ({ ...s, [active.id]: { ...normalizeProgress(s[active.id]), ...p } }));
  }

  function toggleTask(i: number) {
    const tasks = [...prog.tasks];
    tasks[i] = !tasks[i];
    patch({ tasks });
  }

  const doneCount = prog.tasks.filter(Boolean).length;
  const pct = Math.round((doneCount / prog.tasks.length) * 100);

  function gotoMateri(id: string) {
    setActiveId(id);
    setTab("ringkasan");
  }

  function addComment() {
    if (!pesan.trim()) {
      showToast("Tulis pesan diskusi dulu!");
      return;
    }
    patch({ comments: [...prog.comments, { nama: nama.trim() || "Mahasiswa", pesan: pesan.trim() }] });
    setPesan("");
    showToast("Komentar tersimpan di perangkat ini.");
  }

  function unduhRingkasan(kind: "txt" | "md") {
    const tasks = TASK_LABELS.map((t, i) => {
      const mark = prog.tasks[i] ? (kind === "md" ? "- [x]" : "[x]") : (kind === "md" ? "- [ ]" : "[ ]");
      return `${mark} ${t.title}`;
    }).join("\n");
    const tujuan = active.tujuan.map((t) => `- ${t}`).join("\n");
    const poin = active.poin.map((p) => `- ${p}`).join("\n");
    const kode = active.kode ? (kind === "md" ? `\n## Contoh\n\`\`\`sql\n${active.kode}\n\`\`\`\n` : `\nCONTOH\n${active.kode}\n`) : "";
    const catatan = (prog.catatan ?? "").trim() ? (kind === "md" ? `\n## Catatanku\n${(prog.catatan ?? "").trim()}\n` : `\nCATATANKU\n${(prog.catatan ?? "").trim()}\n`) : "";
    const body = kind === "md"
      ? `# ${active.title}\n\n**${active.modul}** • Estimasi belajar mandiri: ${active.duration} (estimasi)\n\nMateri bacaan — bukan hasil ukur.\n\n## Tujuan belajar\n${tujuan}\n\n## Poin kunci\n${poin}\n${kode}\n## Target mandiri (${doneCount}/${prog.tasks.length})\n${tasks}\n${catatan}`
      : `${active.title}\n${active.modul} • Estimasi belajar mandiri: ${active.duration} (estimasi)\n\nMateri bacaan — bukan hasil ukur.\n\nTUJUAN BELAJAR\n${tujuan}\n\nPOIN KUNCI\n${poin}\n${kode}\nTARGET MANDIRI (${doneCount}/${prog.tasks.length})\n${tasks}\n${catatan}`;
    const blob = new Blob([body], { type: kind === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ringkasan-${active.id}.${kind}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Ringkasan .${kind} terunduh!`);
  }

  const tabBtn = (t: Tab, label: string, extra?: string) =>
    tab === t
      ? "whitespace-nowrap rounded-full border-[3px] border-black bg-brand-blue px-4 py-2 font-label text-xs font-bold text-white shadow-brutal transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      : "whitespace-nowrap rounded-full border-[3px] border-black bg-white px-4 py-2 font-label text-xs font-bold text-brand-navy shadow-brutal transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

  return (
    <ToolShell
      eyebrow="Beranda / Belajar / Modul Mandiri"
      title="Detail Materi"
      description="Halaman belajar mandiri: ringkasan modul, checklist target, catatan, diskusi lokal, dan unduhan — progres tersimpan di browser."
      icon="menu_book"
      badge="Modul + Checklist"
      badgeTone="info"
    >
      {/* Breadcrumb + chip meta */}
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <nav className="mr-1 flex items-center gap-1.5 font-label text-xs font-bold uppercase tracking-wider text-brand-muted" aria-label="Breadcrumb">
            <span>Beranda</span>
            <span className="text-black">/</span>
            <span>Belajar</span>
            <span className="text-black">/</span>
            <span className="text-black underline decoration-brand-yellow decoration-2 underline-offset-4">{active.modul}</span>
          </nav>
          <span className="inline-flex items-center gap-1 rounded-full border-[3px] border-black bg-brand-brick px-2.5 py-1 font-label text-[11px] font-extrabold uppercase text-white shadow-brutal">
            <span className="material-symbols-outlined">lock</span> Wajib Semester 4
          </span>
          <span className="inline-flex items-center rounded-full border-[3px] border-black bg-white px-2.5 py-1 font-label text-[11px] font-extrabold uppercase shadow-brutal">
            3 SKS
          </span>
        </div>
        <div className="inline-flex items-center gap-2.5 self-start rounded-xl border-[3px] border-black bg-white px-3.5 py-1.5 shadow-brutal lg:self-auto">
          <span className="material-symbols-outlined">schedule</span>
          <div className="flex flex-col">
            <span className="font-label text-[10px] font-bold uppercase leading-none text-brand-muted">Belajar mandiri</span>
            <span className="text-sm font-bold leading-tight text-black">Estimasi {active.duration} • tersimpan lokal</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Kolom utama */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {/* Ringkasan Modul (pengganti player, statis & jujur) */}
          <div className="relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border-[3px] border-black bg-brand-navy p-5 shadow-brutal">
            <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(#CAE6FF 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
            <div className="relative z-10 inline-flex items-center gap-1.5 self-start rounded-full border-2 border-black bg-white px-3 py-1 font-label text-[11px] font-extrabold uppercase tracking-wider shadow-brutal-sm">
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              <span>Ringkasan Modul • {active.modul}</span>
            </div>
            <h2 className="relative z-10 font-display text-xl font-bold leading-tight text-white sm:text-2xl">{active.title}</h2>
            <p className="relative z-10 font-label text-xs font-bold uppercase text-brand-yellow">
              Estimasi waktu belajar mandiri: {active.duration} (estimasi)
            </p>
            <ul className="relative z-10 flex flex-col gap-2 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
              <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Tujuan belajar</span>
              {active.tujuan.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm font-medium text-black">
                  <span className="mt-0.5 material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Judul + catatan + status */}
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{active.title}</h1>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black/20 pb-4">
              <p className="max-w-md text-sm font-medium text-brand-muted">
                <strong className="font-bold text-black">Catatan belajar mandiri</strong> — isi ringkasanmu sendiri di bawah.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-brand-panel px-3 py-1 font-label text-[11px] font-extrabold shadow-brutal-sm">
                <span className={`h-2 w-2 rounded-full ${prog.done ? "bg-green-600" : "bg-brand-blue"}`} />
                Status: {prog.done ? "Modul selesai dipelajari" : "Sedang dipelajari"}
              </span>
            </div>
            <textarea
              value={prog.catatan ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => patch({ catatan: e.target.value })}
              rows={3}
              placeholder="Tulis ringkasanmu sendiri di sini — tersimpan otomatis di perangkat ini…"
              className="w-full rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-sm outline-none placeholder:text-brand-muted focus:bg-brand-panel"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button type="button" disabled={activeIdx <= 0} onClick={() => gotoMateri(PLAYLIST[activeIdx - 1].id)} className="rounded-full border-[3px] border-black bg-white px-4 py-2 font-label text-xs font-bold shadow-brutal disabled:opacity-40">
                  ← Materi sebelumnya
                </button>
                <button type="button" disabled={activeIdx >= PLAYLIST.length - 1} onClick={() => gotoMateri(PLAYLIST[activeIdx + 1].id)} className="rounded-full border-[3px] border-black bg-white px-4 py-2 font-label text-xs font-bold shadow-brutal disabled:opacity-40">
                  Berikutnya →
                </button>
              </div>
              <span className="font-label text-[11px] font-bold text-brand-muted">{activeIdx + 1} / {PLAYLIST.length}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <button type="button" onClick={() => setTab("ringkasan")} className={tabBtn("ringkasan", "")}><span className="material-symbols-outlined">menu_book</span> Ringkasan Materi</button>
            <button type="button" onClick={() => setTab("daftar")} className={tabBtn("daftar", "")}><span className="material-symbols-outlined">list</span> Daftar Modul</button>
            <button type="button" onClick={() => setTab("diskusi")} className={tabBtn("diskusi", "")}>
              <span className="material-symbols-outlined">chat_bubble</span> Diskusi <span className="ml-1 rounded-full border-2 border-black bg-brand-panel px-1.5 text-[10px]">{prog.comments.length}</span>
            </button>
            <button type="button" onClick={() => setTab("unduh")} className={tabBtn("unduh", "")}>⬇ Unduhan</button>
          </div>

          {tab === "ringkasan" && (
            <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full border-[3px] border-black bg-brand-panel" />
              <div className="z-10 flex items-center justify-between border-b-2 border-black pb-3">
                <h2 className="font-display text-xl font-bold"><span className="material-symbols-outlined">lightbulb</span> Poin Kunci</h2>
                <span className="rounded-full border-2 border-black bg-brand-panel px-2 py-0.5 font-label text-[11px] font-extrabold shadow-brutal-sm">Materi bacaan</span>
              </div>
              <p className="z-10 font-body text-sm leading-relaxed text-brand-muted">
                Ringkasan bacaan untuk <strong className="font-bold text-brand-navy">{active.title}</strong>. Bukan hasil ukur — pelajari konsepnya lalu tulis ulang dengan bahasamu di catatan.
              </p>
              <ul className="z-10 flex flex-col gap-2">
                {active.poin.map((p) => (
                  <li key={p} className="flex items-start gap-2 rounded-xl border-2 border-black/15 bg-brand-paper p-3 text-sm font-medium">
                    <span className="mt-0.5 material-symbols-outlined text-[18px]">check_circle</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {active.kode && (
                <div className="z-10 rounded-xl border-2 border-black bg-brand-panel p-4">
                  <span className="font-label text-[11px] font-extrabold uppercase">Contoh generik:</span>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg border-2 border-black bg-white p-3 font-mono text-xs leading-normal">{active.kode}</pre>
                </div>
              )}
            </div>
          )}

          {tab === "daftar" && (
            <div className="flex flex-col gap-2">
              {PLAYLIST.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => gotoMateri(m.id)}
                  className={`flex items-center gap-3 rounded-2xl border-[3px] border-black p-3 text-left shadow-brutal transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${m.id === active.id ? "bg-brand-panel" : "bg-white hover:bg-brand-paper"}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-black font-label text-xs font-extrabold ${m.id === active.id ? "bg-brand-blue text-white" : "bg-white"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-label text-[11px] font-extrabold uppercase text-brand-muted">{m.modul} • estimasi {m.duration}</span>
                    <span className="block truncate text-sm font-bold">{m.title}</span>
                  </span>
                  {m.id === active.id ? <span className="text-brand-blue"><span className="material-symbols-outlined">menu_book</span></span> : <span className="text-brand-muted">→</span>}
                </button>
              ))}
            </div>
          )}

          {tab === "diskusi" && (
            <div className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
              <h2 className="font-display text-lg font-bold"><span className="material-symbols-outlined">chat_bubble</span> Diskusi ({prog.comments.length})</h2>
              {prog.comments.length === 0 ? (
                <p className="rounded-xl border-2 border-dashed border-black/30 bg-brand-paper p-4 text-sm font-medium text-brand-muted">
                  Belum ada komentar — jadilah yang pertama. Komentar tersimpan lokal di perangkatmu.
                </p>
              ) : (
                prog.comments.map((c, i) => (
                  <div key={`${c.nama}-${i}`} className="rounded-xl border-2 border-black/15 bg-brand-paper p-3">
                    <p className="text-sm font-bold">{c.nama}</p>
                    <p className="text-sm text-brand-muted">{c.pesan}</p>
                  </div>
                ))
              )}
              <input value={nama} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNama(e.target.value)} placeholder="Nama (opsional)" className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-medium outline-none focus:bg-white" />
              <textarea value={pesan} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPesan(e.target.value)} rows={3} placeholder="Tulis pertanyaan atau tanggapan…" className="w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 py-2 text-sm outline-none focus:bg-white" />
              <button type="button" onClick={addComment} className="h-11 rounded-full border-[3px] border-black bg-brand-blue font-label text-xs font-bold uppercase text-white shadow-brutal transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none">
                Kirim Komentar
              </button>
            </div>
          )}

          {tab === "unduh" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
                <p className="text-sm font-bold"><span className="material-symbols-outlined">edit_note</span> Ringkasan materi {active.modul}</p>
                <p className="font-label text-[11px] font-bold text-brand-muted">Dibuat dari halaman ini • unduhan nyata</p>
                <span className="mt-2 flex gap-2">
                  <button type="button" onClick={() => unduhRingkasan("txt")} className="rounded-lg border-2 border-black bg-white px-3 py-1.5 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow">Unduh .txt</button>
                  <button type="button" onClick={() => unduhRingkasan("md")} className="rounded-lg border-2 border-black bg-white px-3 py-1.5 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow">Unduh .md</button>
                </span>
              </div>
              <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-brutal">
                <p className="text-sm font-bold"><span className="material-symbols-outlined">inventory_2</span> Slide PPT & Skrip SQL dosen</p>
                <p className="font-label text-[11px] font-bold text-brand-muted">Tidak tersedia di sini — minta via kelas atau SIAKAD.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="flex flex-col gap-4 rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
            <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-4">
              <h2 className="font-display text-xl font-bold"><span className="material-symbols-outlined">check_circle</span> Target Mandiri</h2>
              <span className="shrink-0 rounded-full border-2 border-black bg-brand-yellow px-3 py-1 font-label text-[11px] font-extrabold shadow-brutal-sm">
                {doneCount} dari {prog.tasks.length} selesai
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between font-label text-[11px] font-extrabold uppercase">
                <span>Progres modul</span>
                <span>{pct}% selesai</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full border-[3px] border-black bg-brand-panel p-0.5">
                <div className="h-full rounded-full border-r-2 border-black bg-brand-blue transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              {TASK_LABELS.map((t, i) => {
                const checked = prog.tasks[i] ?? false;
                return (
                  <label
                    key={t.title}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[3px] border-black p-3 shadow-brutal transition-transform active:translate-x-0.5 active:translate-y-0.5 select-none ${checked ? "bg-brand-panel" : "bg-white"}`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleTask(i)} className="sr-only" />
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[3px] border-black text-sm font-black shadow-brutal-sm ${checked ? "bg-brand-blue text-white" : "bg-white text-brand-navy"}`}>
                      {checked ? <span className="material-symbols-outlined">check</span> : ""}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`text-sm font-bold leading-snug ${checked ? "line-through opacity-75" : ""}`}>{t.title}</span>
                      <span className="mt-0.5 font-label text-[11px] font-extrabold uppercase text-brand-blue">{t.sub}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-start gap-2 rounded-2xl border-[3px] border-black bg-brand-panel p-3 shadow-brutal-sm">
              <span className="mt-0.5 shrink-0 text-lg"><span className="material-symbols-outlined">lightbulb</span></span>
              <p className="text-sm text-brand-muted">
                <strong className="font-bold text-black">Tip Belajar:</strong> Baca satu poin kunci, tulis ulang dengan bahasamu di catatan, lalu uji dengan latihan kuis umum.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <a
                href="/tools/quiz"
                className="flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-brand-blue px-6 py-4 font-display text-base font-bold text-white shadow-brutal transition-all hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <span>Latihan Kuis Umum</span>
                <span className="text-brand-yellow"><span className="material-symbols-outlined">bolt</span></span>
              </a>
              <button
                type="button"
                onClick={() => {
                  patch({ done: !prog.done });
                  showToast(prog.done ? "Tanda selesai dibatalkan." : "Modul berhasil ditandai!");
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-black px-6 py-3.5 font-label text-xs font-bold shadow-brutal transition-all active:translate-x-1 active:translate-y-1 active:shadow-none ${prog.done ? "bg-brand-panel text-brand-blue" : "bg-white text-brand-navy hover:bg-brand-panel"}`}
              >
                <span>{prog.done ? "Modul Berhasil Ditandai! " : "Tandai Modul Selesai"}</span>
                <span className="text-lg">{prog.done ? <span className="material-symbols-outlined">check_circle</span> : <span aria-hidden className="material-symbols-outlined">radio_button_unchecked</span>}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
            <div className="flex items-center justify-between">
              <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Silabus mendatang</span>
              <span className="rounded-md border border-black bg-brand-panel px-2 py-0.5 font-label text-[10px] font-bold">Minggu 8</span>
            </div>
            <button type="button" aria-disabled="true" onClick={() => showToast("Modul 08 terkunci — tersedia minggu depan, selesaikan Modul 07 dulu!")} className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl border-2 border-black bg-brand-paper p-3 text-left opacity-80 shadow-brutal-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white text-xl"><span className="material-symbols-outlined">storage</span></div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Modul 08: Partisi Tabel & Query Sharding</span>
                <span className="text-xs text-brand-muted">Tersedia Minggu Depan • Akses Terjadwal</span>
              </div>
              <span className="ml-auto flex items-center gap-1 rounded-full border-2 border-black bg-brand-yellow px-2 py-0.5 font-label text-[10px] font-extrabold uppercase text-black"><span className="material-symbols-outlined text-[14px]">lock</span> Terkunci</span>
            </button>
          </div>

          <div className="rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal">
            <p className="text-sm font-bold"><span className="material-symbols-outlined">edit_note</span> Ringkasan materi {active.modul}</p>
            <p className="font-label text-[10px] font-bold text-brand-muted">Unduhan nyata dari halaman ini</p>
            <span className="mt-2 flex gap-2">
              <button type="button" onClick={() => unduhRingkasan("txt")} className="rounded-lg border-2 border-black bg-white px-3 py-1.5 font-label text-[11px] font-extrabold shadow-brutal-sm transition-all hover:bg-brand-yellow active:translate-x-px active:translate-y-px active:shadow-none">
                .txt
              </button>
              <button type="button" onClick={() => unduhRingkasan("md")} className="rounded-lg border-2 border-black bg-white px-3 py-1.5 font-label text-[11px] font-extrabold shadow-brutal-sm transition-all hover:bg-brand-yellow active:translate-x-px active:translate-y-px active:shadow-none">
                .md
              </button>
            </span>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border-[3px] border-black bg-brand-yellow px-4 py-3 font-label text-xs font-bold text-black shadow-brutal">
          <span className="text-base"><span className="material-symbols-outlined">check_circle</span></span>
          <span>{toast}</span>
        </div>
      )}
    </ToolShell>
  );
}
