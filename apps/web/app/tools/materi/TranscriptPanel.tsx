"use client";

import * as React from "react";
import {
  freshTranscripts,
  loadTranscripts,
  saveTranscripts,
  cleanSrtVtt,
  isSupportedCaptionFile,
  captionAsal,
  detectMediaUrl,
  validateTranscriptInput,
  searchTranscript,
  buildTxtExport,
  MAX_CAPTION_BYTES,
  MAX_TEKS,
  T_LIMITS,
  ASAL_LABEL,
  type Transcript,
  type TranscriptsStore,
  type CleanResult,
} from "./transcript-store";

type Phase = "idle" | "validating" | "processing" | "done" | "error";
type ComposerTab = "paste" | "file" | "link";

export interface LinkTarget {
  id: string;
  matkul: string;
  topik: Array<{ id: string; title: string }>;
}

function phaseLabel(p: Phase): string {
  if (p === "validating") return "Memvalidasi…";
  if (p === "processing") return "Memproses…";
  if (p === "done") return "Selesai";
  if (p === "error") return "Gagal";
  return "Menunggu input";
}

function todayId(): string {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function TranscriptPanel({
  workspaces,
  notify,
}: {
  workspaces: LinkTarget[];
  notify: (msg: string) => void;
}) {
  const [store, setStore] = React.useState<TranscriptsStore>(() => freshTranscripts());
  const [ready, setReady] = React.useState(false);
  const [corrupt, setCorrupt] = React.useState(false);

  // Komposer
  const [showComposer, setShowComposer] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [tab, setTab] = React.useState<ComposerTab>("paste");
  const [judul, setJudul] = React.useState("");
  const [sumber, setSumber] = React.useState("");
  const [tanggal, setTanggal] = React.useState(() => todayId());
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [cleanInfo, setCleanInfo] = React.useState<CleanResult | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [linkWs, setLinkWs] = React.useState("");
  const [linkTopic, setLinkTopic] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // Daftar
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [find, setFind] = React.useState("");
  const [noteDraft, setNoteDraft] = React.useState("");
  const [bmLabel, setBmLabel] = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const { store: loaded, corrupt: bad, dropped } = loadTranscripts();
    setStore(loaded);
    setCorrupt(bad);
    if (bad) notify("Data transkrip lama rusak — mulai dari daftar kosong yang aman.");
    else if (dropped > 0) notify(`${dropped} transkrip rusak dibuang, sisanya aman.`);
    setReady(true);
  }, [notify]);

  function persist(next: TranscriptsStore): boolean {
    setStore(next);
    const ok = saveTranscripts(next);
    if (!ok) notify("Penyimpanan penuh — unduh .txt transkrip penting, lalu hapus yang tidak perlu.");
    return ok;
  }

  function resetComposer() {
    setPhase("idle");
    setErrorMsg("");
    setTab("paste");
    setJudul("");
    setSumber("");
    setTanggal(todayId());
    setMediaUrl("");
    setDraft("");
    setCleanInfo(null);
    setFileName("");
    setLinkWs("");
    setLinkTopic("");
  }

  const mediaInfo = React.useMemo(() => (mediaUrl.trim() ? detectMediaUrl(mediaUrl) : null), [mediaUrl]);
  const linkWsTopics = React.useMemo(
    () => workspaces.find((w) => w.id === linkWs)?.topik ?? [],
    [workspaces, linkWs],
  );

  function fail(msg: string) {
    setErrorMsg(msg);
    setPhase("error");
  }

  // ----- Upload .srt/.vtt -----
  function pickFile(file: File) {
    setPhase("validating");
    if (!isSupportedCaptionFile(file.name)) {
      fail(`Berkas "${file.name}" tidak didukung. Unggah berkas caption .srt atau .vtt — bukan PDF/audio/video.`);
      return;
    }
    if (file.size > MAX_CAPTION_BYTES) {
      fail(`Berkas terlalu besar (${(file.size / 1_000_000).toFixed(1)} MB, maks 2 MB). Bagi caption menjadi beberapa berkas.`);
      return;
    }
    setPhase("processing");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result ?? "");
        const cleaned = cleanSrtVtt(raw);
        if (!cleaned.teks.trim()) {
          fail("Berkas terbaca tapi tidak ada teks yang bisa diambil. Coba tempel manual.");
          return;
        }
        setDraft(cleaned.teks.slice(0, MAX_TEKS));
        setCleanInfo(cleaned);
        setFileName(file.name);
        if (!judul.trim()) {
          setJudul(file.name.replace(/\.(srt|vtt)$/i, "").replace(/[_-]+/g, " ").trim().slice(0, T_LIMITS.judul));
        }
        setPhase("idle");
        notify(
          cleaned.tanpaTimestamp
            ? "Berkas dibaca — tanpa timestamp, disimpan apa adanya."
            : `Berkas dibaca — ${cleaned.barisDibuang} baris timestamp/nomor dibuang${cleaned.kembarDigabung > 0 ? `, ${cleaned.kembarDigabung} baris kembar digabung` : ""}.`,
        );
      } catch {
        fail("Gagal membaca berkas. Coba lagi atau tempel manual.");
      }
    };
    reader.onerror = () => fail("Gagal membaca berkas. Coba lagi atau tempel manual.");
    reader.readAsText(file);
  }

  // ----- Simpan -----
  function submit() {
    setPhase("validating");
    const errors = validateTranscriptInput(judul, draft);
    if (mediaUrl.trim() && mediaInfo?.kind === "invalid") {
      errors.push("Tautan video tidak valid (harus http(s)). Kosongkan atau perbaiki.");
    }
    if (errors.length > 0) {
      fail(errors.join(" "));
      return;
    }
    if (store.items.length >= T_LIMITS.items) {
      fail(`Maksimal ${T_LIMITS.items} transkrip tersimpan. Unduh lalu hapus yang lama.`);
      return;
    }
    setPhase("processing");
    const now = new Date().toISOString();
    const item: Transcript = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      judul: judul.trim().slice(0, T_LIMITS.judul),
      sumber: sumber.trim().slice(0, T_LIMITS.sumber),
      sumberUrl: mediaUrl.trim().slice(0, T_LIMITS.url),
      tanggal: tanggal.slice(0, 10),
      teks: draft.trim().slice(0, MAX_TEKS),
      catatan: [],
      bookmark: [],
      workspaceId: linkWs || undefined,
      topicId: linkTopic || undefined,
      asal: fileName ? captionAsal(fileName) : mediaUrl.trim() ? "tautan" : "paste",
      createdAt: now,
      updatedAt: now,
    };
    const next = { ...store, items: [item, ...store.items], updatedAt: now };
    if (!persist(next)) {
      fail("Penyimpanan penuh — transkrip tidak tersimpan. Unduh .txt dulu bila perlu, lalu hapus data lama.");
      return;
    }
    setPhase("done");
  }

  function closeDone() {
    setShowComposer(false);
    resetComposer();
  }

  // ----- Aksi per item -----
  function touchItem(id: string, patch: Partial<Transcript>) {
    const now = new Date().toISOString();
    persist({
      ...store,
      updatedAt: now,
      items: store.items.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t)),
    });
  }

  function copyText(t: Transcript) {
    const done = () => notify("Teks transkrip disalin.");
    try {
      const clip = navigator.clipboard;
      if (clip?.writeText) {
        clip.writeText(t.teks).then(done, () => fallbackCopy(t.teks, done));
      } else fallbackCopy(t.teks, done);
    } catch {
      fallbackCopy(t.teks, done);
    }
  }

  function fallbackCopy(text: string, done: () => void) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      done();
    } catch {
      notify("Gagal menyalin — blok lalu salin manual.");
    }
  }

  function downloadTxt(t: Transcript) {
    try {
      const blob = new Blob([buildTxtExport(t)], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transkrip-${t.judul.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "catatan"}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify("Transkrip .txt terunduh.");
    } catch {
      notify("Gagal mengunduh transkrip.");
    }
  }

  function addNote(t: Transcript) {
    const teks = noteDraft.trim().slice(0, T_LIMITS.catatan);
    if (!teks) {
      notify("Tulis dulu catatanmu.");
      return;
    }
    if (t.catatan.length >= T_LIMITS.catatanPerItem) {
      notify(`Maksimal ${T_LIMITS.catatanPerItem} catatan per transkrip.`);
      return;
    }
    touchItem(t.id, {
      catatan: [...t.catatan, { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, teks, createdAt: new Date().toISOString() }],
    });
    setNoteDraft("");
    notify("Catatan ditambahkan.");
  }

  function addBookmark(t: Transcript, hits: string[]) {
    const label = bmLabel.trim().slice(0, T_LIMITS.labelBookmark);
    if (!label) {
      notify("Isi dulu label penanda.");
      return;
    }
    if (t.bookmark.length >= T_LIMITS.bookmarkPerItem) {
      notify(`Maksimal ${T_LIMITS.bookmarkPerItem} penanda per transkrip.`);
      return;
    }
    const excerpt = (hits[0] ?? t.teks).slice(0, 140);
    touchItem(t.id, {
      bookmark: [...t.bookmark, { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label, excerpt, createdAt: new Date().toISOString() }],
    });
    setBmLabel("");
    notify("Penanda ditambahkan (tanpa timestamp — hanya label + kutipan).");
  }

  function resolveLink(t: Transcript): string | null {
    if (!t.workspaceId) return null;
    const ws = workspaces.find((w) => w.id === t.workspaceId);
    if (!ws) return "Ruang asal sudah dihapus";
    const topic = t.topicId ? ws.topik.find((x) => x.id === t.topicId) : undefined;
    if (t.topicId && !topic) return `${ws.matkul} • topik asal sudah dihapus`;
    return topic ? `${ws.matkul} • ${topic.title}` : ws.matkul;
  }

  const tabBtn = (v: ComposerTab, icon: string, text: string) =>
    `inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border-[3px] border-black px-3 font-label text-[11px] font-extrabold shadow-brutal-sm ${tab === v ? "bg-brand-navy text-white" : "bg-white"}`;

  return (
    <section aria-label="Transkrip belajar" className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">closed_caption</span>
          Transkrip Belajar
        </h3>
        <button
          type="button"
          onClick={() => {
            if (showComposer) {
              setShowComposer(false);
              resetComposer();
            } else {
              resetComposer();
              setShowComposer(true);
            }
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] border-black bg-brand-blue px-3 font-label text-[11px] font-extrabold text-white shadow-brutal-sm transition-all active:translate-x-px active:translate-y-px active:shadow-none"
        >
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">{showComposer ? "close" : "add"}</span>
          {showComposer ? "Tutup" : "Transkrip baru"}
        </button>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-brand-muted">
        <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">info</span>
        <span>Tempel teks atau unggah caption .srt/.vtt — semua dibersihkan dan disimpan di perangkatmu. Tanpa unduh otomatis, tanpa timestamp buatan.</span>
      </p>

      {!ready ? (
        <p className="rounded-xl border-2 border-black/15 bg-brand-paper p-4 text-sm font-medium text-brand-muted">Memuat transkrip…</p>
      ) : (
        <>
          {corrupt && (
            <p className="flex items-start gap-1.5 rounded-xl border-2 border-black bg-brand-brick/10 p-3 text-sm font-medium" role="alert">
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">warning</span>
              <span>Data transkrip lama rusak sehingga dimulai dari daftar kosong.</span>
            </p>
          )}

          {showComposer && (
            <div className="flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-brand-paper p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 font-label text-[11px] font-extrabold uppercase">
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">hourglass_empty</span>
                  Status: {phaseLabel(phase)}
                </p>
                {phase === "processing" && (
                  <p className="font-label text-[11px] font-bold text-brand-muted">Bekerja lokal — tanpa persen palsu…</p>
                )}
              </div>

              {phase === "error" && (
                <div className="flex flex-col gap-2 rounded-xl border-2 border-black bg-white p-3" role="alert">
                  <p className="flex items-start gap-1.5 text-sm font-medium">
                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">warning</span>
                    <span>{errorMsg}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhase("idle");
                        setErrorMsg("");
                      }}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-brand-blue px-3 font-label text-[11px] font-extrabold text-white shadow-brutal-sm"
                    >
                      Kembali mengedit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowComposer(false);
                        resetComposer();
                      }}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-[3px] border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm"
                    >
                      Buang & tutup
                    </button>
                  </div>
                </div>
              )}

              {phase === "done" ? (
                <div className="flex flex-col gap-2 rounded-xl border-2 border-black bg-white p-4 text-center">
                  <p className="flex items-center justify-center gap-1.5 font-display text-base font-bold">
                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">check_circle</span>
                    Transkrip tersimpan di perangkat ini
                  </p>
                  <button
                    type="button"
                    onClick={closeDone}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border-[3px] border-black bg-brand-blue px-4 font-label text-xs font-bold text-white shadow-brutal-sm"
                  >
                    Lihat di daftar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2" role="tablist" aria-label="Sumber teks transkrip">
                    <button type="button" role="tab" aria-selected={tab === "paste"} onClick={() => setTab("paste")} className={tabBtn("paste", "content_paste", "Tempel teks")}>
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">content_paste</span>
                      Tempel teks
                    </button>
                    <button type="button" role="tab" aria-selected={tab === "file"} onClick={() => setTab("file")} className={tabBtn("file", "upload", "Unggah")}>
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">upload</span>
                      Unggah .srt/.vtt
                    </button>
                    <button type="button" role="tab" aria-selected={tab === "link"} onClick={() => setTab("link")} className={tabBtn("link", "movie", "Tautan")}>
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">movie</span>
                      Tautan video
                    </button>
                  </div>

                  {tab === "paste" && (
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Tempel teks transkrip</span>
                      <textarea
                        value={draft}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          setDraft(e.target.value.slice(0, MAX_TEKS + 1000));
                          setCleanInfo(null);
                          setFileName("");
                        }}
                        rows={6}
                        placeholder="Tempel teks panjang di sini — bisa diedit sebelum disimpan…"
                        className="w-full rounded-xl border-[3px] border-black bg-white px-3 py-2 text-sm outline-none placeholder:text-brand-muted"
                      />
                    </label>
                  )}

                  {tab === "file" && (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-[3px] border-black bg-white px-4 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow"
                      >
                        <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">upload</span>
                        {fileName ? `Ganti berkas (${fileName})` : "Pilih berkas .srt / .vtt (maks 2 MB)"}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".srt,.vtt"
                        className="hidden"
                        aria-hidden
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const f = e.target.files?.[0];
                          if (f) pickFile(f);
                          e.target.value = "";
                        }}
                      />
                      {cleanInfo && (
                        <p className="flex items-start gap-1.5 rounded-xl border-2 border-black/15 bg-white p-3 text-xs text-brand-muted">
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">cleaning_services</span>
                          <span>
                            {cleanInfo.tanpaTimestamp
                              ? "Berkas tidak mengandung timestamp — disimpan apa adanya."
                              : `${cleanInfo.barisDibuang} baris timestamp/nomor/tag dibuang${cleanInfo.kembarDigabung > 0 ? `, ${cleanInfo.kembarDigabung} baris kembar digabung` : ""}. Tidak ada timestamp atau pembicara yang dibuat-buat.`}{" "}
                            Cek lalu edit draf di bawah sebelum simpan.
                          </span>
                        </p>
                      )}
                      {draft && tab === "file" && (
                        <label className="flex flex-col gap-1.5">
                          <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Draf — edit sebelum simpan ({draft.length.toLocaleString("id-ID")} karakter)</span>
                          <textarea
                            value={draft}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value.slice(0, MAX_TEKS + 1000))}
                            rows={6}
                            className="w-full rounded-xl border-[3px] border-black bg-white px-3 py-2 text-sm outline-none"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {tab === "link" && (
                    <div className="flex flex-col gap-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Tautan video (opsional — hanya format yang dicek)</span>
                        <input
                          value={mediaUrl}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMediaUrl(e.target.value)}
                          placeholder="https://youtube.com/… atau https://…zoom.us/…"
                          inputMode="url"
                          maxLength={T_LIMITS.url}
                          className="h-11 w-full rounded-xl border-[3px] border-black bg-white px-3 text-sm font-medium outline-none placeholder:text-brand-muted"
                        />
                      </label>
                      {mediaInfo && (
                        <p className="flex items-start gap-1.5 rounded-xl border-2 border-black/15 bg-white p-3 text-xs text-brand-muted">
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">info</span>
                          <span>{mediaInfo.note}</span>
                        </p>
                      )}
                      <p className="text-xs text-brand-muted">
                        Setelah ini kembali ke tab “Tempel teks” atau “Unggah .srt/.vtt” untuk mengisi isi transkripnya.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Judul transkrip *</span>
                      <input
                        value={judul}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJudul(e.target.value)}
                        placeholder="mis. Kuliah 3 — Regresi"
                        maxLength={T_LIMITS.judul}
                        className="h-11 w-full rounded-xl border-[3px] border-black bg-white px-3 text-sm font-medium outline-none placeholder:text-brand-muted"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Tanggal sumber</span>
                      <input
                        type="date"
                        value={tanggal}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTanggal(e.target.value)}
                        className="h-11 w-full rounded-xl border-[3px] border-black bg-white px-3 text-sm font-medium outline-none"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Label sumber (manual)</span>
                    <input
                      value={sumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSumber(e.target.value)}
                      placeholder="mis. YouTube — Kanal Statistika / Rekaman Zoom kelas A"
                      maxLength={T_LIMITS.sumber}
                      className="h-11 w-full rounded-xl border-[3px] border-black bg-white px-3 text-sm font-medium outline-none placeholder:text-brand-muted"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Hubungkan ke ruang</span>
                      <select
                        value={linkWs}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          setLinkWs(e.target.value);
                          setLinkTopic("");
                        }}
                        className="min-h-[44px] w-full rounded-xl border-[3px] border-black bg-white px-3 text-sm font-medium outline-none"
                      >
                        <option value="">— Tanpa tautan —</option>
                        {workspaces.map((w) => (
                          <option key={w.id} value={w.id}>{w.matkul}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Hubungkan ke topik</span>
                      <select
                        value={linkTopic}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLinkTopic(e.target.value)}
                        disabled={!linkWs}
                        className="min-h-[44px] w-full rounded-xl border-[3px] border-black bg-white px-3 text-sm font-medium outline-none disabled:opacity-40"
                      >
                        <option value="">— Seluruh ruang —</option>
                        {linkWsTopics.map((t) => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={phase === "validating" || phase === "processing"}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-[3px] border-black bg-brand-blue px-4 font-label text-xs font-bold text-white shadow-brutal transition-all active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-50"
                  >
                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">save</span>
                    {phase === "validating" ? "Memvalidasi…" : phase === "processing" ? "Memproses…" : "Simpan transkrip"}
                  </button>
                </>
              )}
            </div>
          )}

          {store.items.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-black/30 bg-brand-paper p-4 text-sm font-medium text-brand-muted">
              Belum ada transkrip tersimpan. Ketuk “Transkrip baru” untuk menempel teks atau mengunggah caption.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {store.items.map((t) => {
                const isOpen = openId === t.id;
                const link = resolveLink(t);
                const search = searchTranscript(t.teks, isOpen ? find : "");
                return (
                  <li key={t.id} className="rounded-xl border-2 border-black/15 bg-brand-paper p-3">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setOpenId(isOpen ? null : t.id);
                        setFind("");
                        setConfirmDeleteId(null);
                      }}
                      className="flex min-h-[44px] w-full items-center gap-2 text-left"
                    >
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">description</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{t.judul}</span>
                        <span className="block truncate font-label text-[11px] font-bold text-brand-muted">
                          {ASAL_LABEL[t.asal]}{t.sumber ? ` • ${t.sumber}` : ""}{t.tanggal ? ` • ${t.tanggal}` : ""}
                        </span>
                      </span>
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">{isOpen ? "expand_less" : "expand_more"}</span>
                    </button>

                    {isOpen && (
                      <div className="mt-2 flex flex-col gap-2 border-t-2 border-black/10 pt-2">
                        {link && (
                          <p className="flex items-center gap-1.5 text-xs font-bold text-brand-blue">
                            <span aria-hidden className="material-symbols-outlined shrink-0 text-[14px] leading-none">link</span>
                            <span className="truncate">Terhubung: {link}</span>
                          </p>
                        )}
                        <div className="max-h-48 overflow-y-auto rounded-lg border-2 border-black bg-white p-3 text-sm leading-relaxed">
                          {t.teks}
                        </div>

                        <label className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-black bg-white px-3">
                          <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">search</span>
                          <input
                            value={find}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFind(e.target.value)}
                            placeholder="Cari dalam transkrip…"
                            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-brand-muted"
                            aria-label={`Cari dalam ${t.judul}`}
                          />
                          {find.trim() && (
                            <span className="shrink-0 rounded-full border-2 border-black bg-brand-panel px-2 py-0.5 font-label text-[10px] font-extrabold">
                              {search.total} cocok
                            </span>
                          )}
                        </label>
                        {find.trim() && search.total > 0 && (
                          <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                            {search.parts.map((p, i) => (
                              <li key={i} className="rounded-lg border border-black/15 bg-white p-2 text-xs">…{p.slice(0, 220)}{p.length > 220 ? "…" : ""}</li>
                            ))}
                          </ul>
                        )}
                        {find.trim() && search.total === 0 && (
                          <p className="text-xs text-brand-muted">Tidak ada bagian yang cocok.</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => copyText(t)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow">
                            <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">content_copy</span>
                            Salin
                          </button>
                          <button type="button" onClick={() => downloadTxt(t)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm hover:bg-brand-yellow">
                            <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">download</span>
                            Unduh .txt
                          </button>
                          {confirmDeleteId === t.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <button type="button" onClick={() => {
                                persist({ ...store, items: store.items.filter((x) => x.id !== t.id), updatedAt: new Date().toISOString() });
                                setOpenId(null);
                                setConfirmDeleteId(null);
                                notify("Transkrip dihapus.");
                              }} className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-black bg-brand-brick px-3 font-label text-[11px] font-extrabold text-white shadow-brutal-sm">
                                Ya, hapus
                              </button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)} className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold shadow-brutal-sm">
                                Batal
                              </button>
                            </span>
                          ) : (
                            <button type="button" onClick={() => setConfirmDeleteId(t.id)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 font-label text-[11px] font-extrabold text-brand-brick shadow-brutal-sm">
                              <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">delete</span>
                              Hapus
                            </button>
                          )}
                        </div>

                        <div className="rounded-xl border-2 border-black/15 bg-white p-3">
                          <p className="flex items-center gap-1.5 text-xs font-bold">
                            <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">edit_note</span>
                            Catatan ({t.catatan.length})
                          </p>
                          {t.catatan.length > 0 && (
                            <ul className="mt-1.5 flex flex-col gap-1.5">
                              {t.catatan.map((n) => (
                                <li key={n.id} className="flex items-start gap-2 rounded-lg border border-black/10 bg-brand-paper p-2 text-xs">
                                  <span className="flex-1">{n.teks}</span>
                                  <button type="button" aria-label="Hapus catatan" onClick={() => touchItem(t.id, { catatan: t.catatan.filter((x) => x.id !== n.id) })} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white text-brand-brick">
                                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">delete</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-1.5 flex gap-1.5">
                            <input
                              value={openId === t.id ? noteDraft : ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteDraft(e.target.value)}
                              placeholder="Tulis catatan…"
                              maxLength={T_LIMITS.catatan}
                              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-black bg-brand-paper px-3 text-sm outline-none placeholder:text-brand-muted focus:bg-white"
                              aria-label="Catatan baru"
                            />
                            <button type="button" onClick={() => addNote(t)} className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl border-2 border-black bg-brand-blue px-3 font-label text-[11px] font-extrabold text-white shadow-brutal-sm">
                              Tambah
                            </button>
                          </div>
                        </div>

                        <div className="rounded-xl border-2 border-black/15 bg-white p-3">
                          <p className="flex items-center gap-1.5 text-xs font-bold">
                            <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">bookmark</span>
                            Penanda ({t.bookmark.length}) — label + kutipan, tanpa timestamp
                          </p>
                          {t.bookmark.length > 0 && (
                            <ul className="mt-1.5 flex flex-col gap-1.5">
                              {t.bookmark.map((b) => (
                                <li key={b.id} className="flex items-start gap-2 rounded-lg border border-black/10 bg-brand-paper p-2 text-xs">
                                  <button type="button" onClick={() => setFind(b.excerpt.slice(0, 40))} title="Tampilkan kutipan di pencarian" className="flex-1 text-left">
                                    <span className="block font-bold">{b.label}</span>
                                    {b.excerpt && <span className="block text-brand-muted">“{b.excerpt.slice(0, 120)}{b.excerpt.length > 120 ? "…" : ""}”</span>}
                                  </button>
                                  <button type="button" aria-label={`Hapus penanda ${b.label}`} onClick={() => touchItem(t.id, { bookmark: t.bookmark.filter((x) => x.id !== b.id) })} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white text-brand-brick">
                                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">delete</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-1.5 flex gap-1.5">
                            <input
                              value={openId === t.id ? bmLabel : ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBmLabel(e.target.value)}
                              placeholder="Label penanda — mis. Definisi regresi"
                              maxLength={T_LIMITS.labelBookmark}
                              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-black bg-brand-paper px-3 text-sm outline-none placeholder:text-brand-muted focus:bg-white"
                              aria-label="Label penanda baru"
                            />
                            <button type="button" onClick={() => addBookmark(t, search.total > 0 ? search.parts : [])} className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl border-2 border-black bg-brand-yellow px-3 font-label text-[11px] font-extrabold shadow-brutal-sm">
                              Tandai
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
