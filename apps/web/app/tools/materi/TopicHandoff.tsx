"use client";

import * as React from "react";
import { handoffQuery, scholarUrl, youtubeSearchUrl, openExternal } from "./handoff";
import {
  isValidHttpUrl,
  LIMITS,
  TAUTAN_JENIS_LABEL,
  type TopicTautan,
  type TautanJenis,
} from "./store";

const JENIS_ORDER: TautanJenis[] = ["eksternal", "catatan", "ringkasan-ai"];

function jenisBadge(j: TautanJenis): string {
  if (j === "catatan") return "bg-green-100 text-green-900";
  if (j === "ringkasan-ai") return "bg-brand-yellow text-black";
  return "bg-brand-panel text-brand-navy";
}

export function TopicHandoff({
  topicId,
  topicTitle,
  matkul,
  tautan,
  onSave,
  onDelete,
  notify,
}: {
  topicId: string;
  topicTitle: string;
  matkul: string;
  tautan: TopicTautan[];
  onSave: (topicId: string, link: { url: string; label: string; note: string; jenis: TautanJenis }) => void;
  onDelete: (topicId: string, linkId: string) => void;
  notify: (msg: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [note, setNote] = React.useState("");
  const [jenis, setJenis] = React.useState<TautanJenis>("eksternal");
  const query = handoffQuery(topicTitle, matkul);

  function openScholar() {
    if (!query) {
      notify("Judul topik masih kosong.");
      return;
    }
    if (!openExternal(scholarUrl(query))) notify("Popup diblokir — izinkan popup lalu coba lagi.");
  }

  function openYoutube() {
    if (!query) {
      notify("Judul topik masih kosong.");
      return;
    }
    if (!openExternal(youtubeSearchUrl(query))) notify("Popup diblokir — izinkan popup lalu coba lagi.");
  }

  function submit() {
    const u = url.trim().slice(0, LIMITS.urlTautan);
    if (!u) {
      notify("Tempel dulu URL-nya.");
      return;
    }
    if (!isValidHttpUrl(u)) {
      notify("URL harus http(s) yang valid.");
      return;
    }
    if (tautan.length >= LIMITS.tautanPerTopik) {
      notify(`Maksimal ${LIMITS.tautanPerTopik} tautan per topik.`);
      return;
    }
    onSave(topicId, {
      url: u,
      label: label.trim().slice(0, LIMITS.labelTautan) || u,
      note: note.trim().slice(0, LIMITS.noteTautan),
      jenis,
    });
    setUrl("");
    setLabel("");
    setNote("");
    setJenis("eksternal");
  }

  return (
    <div className="rounded-xl border-2 border-black/15 bg-white p-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full items-center gap-1.5 text-left font-label text-[11px] font-extrabold uppercase text-brand-navy"
      >
        <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">travel_explore</span>
        <span className="flex-1">Cari bahan di luar {tautan.length > 0 ? `(${tautan.length})` : ""}</span>
        <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">{open ? "expand_less" : "expand_more"}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={openScholar}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border-[3px] border-black bg-brand-blue px-3 font-label text-[11px] font-extrabold text-white shadow-brutal-sm transition-all hover:-translate-y-0.5 active:translate-x-px active:translate-y-px active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">school</span>
              Cari Jurnal terkait Topik Ini
            </button>
            <button
              type="button"
              onClick={openYoutube}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border-[3px] border-black bg-brand-brick px-3 font-label text-[11px] font-extrabold text-white shadow-brutal-sm transition-all hover:-translate-y-0.5 active:translate-x-px active:translate-y-px active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">play_circle</span>
              Cari Video Pembelajaran
            </button>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-brand-muted">
            <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">info</span>
            <span>
              Tombol di atas hanya membuka Google Scholar / YouTube di tab baru dengan kata kunci “{query || "…"}”.
              Ini handoff eksternal, bukan hasil ambilan Cademy — nilai sendiri apakah hasilnya relevan, benar peer-reviewed,
              atau benar akses-terbuka. Cademy tidak mengklaim apa pun soal itu.
            </span>
          </p>

          <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-black/25 bg-brand-paper p-3">
            <p className="text-xs font-bold">Simpan yang berguna ke topik ini</p>
            <input
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
              placeholder="Tempel URL https://…"
              inputMode="url"
              maxLength={LIMITS.urlTautan}
              className="h-11 w-full rounded-xl border-[3px] border-black bg-white px-3 text-sm font-medium outline-none placeholder:text-brand-muted"
              aria-label="URL bahan untuk topik ini"
            />
            <input
              value={label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
              placeholder="Label sumber — mis. Jurnal X / Video Y (manual)"
              maxLength={LIMITS.labelTautan}
              className="h-11 w-full rounded-xl border-[3px] border-black bg-white px-3 text-sm font-medium outline-none placeholder:text-brand-muted"
              aria-label="Label sumber manual"
            />
            <textarea
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              rows={2}
              placeholder="Kenapa berguna? mis. bagian menit 5 menjelaskan contoh 3NF…"
              maxLength={LIMITS.noteTautan}
              className="w-full rounded-xl border-[3px] border-black bg-white px-3 py-2 text-sm outline-none placeholder:text-brand-muted"
              aria-label="Alasan kenapa tautan ini berguna"
            />
            <div className="flex flex-col gap-1.5">
              <span className="font-label text-[11px] font-extrabold uppercase text-brand-muted">Jenis info (dideklarasikan kamu)</span>
              <div className="flex flex-col gap-1.5 sm:flex-row" role="radiogroup" aria-label="Jenis info tautan">
                {JENIS_ORDER.map((j) => (
                  <button
                    key={j}
                    type="button"
                    role="radio"
                    aria-checked={jenis === j}
                    onClick={() => setJenis(j)}
                    className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-2 border-black px-2 font-label text-[11px] font-extrabold ${jenis === j ? "bg-brand-navy text-white" : "bg-white"}`}
                  >
                    {j === "eksternal" ? "Hasil eksternal" : j === "catatan" ? "Catatanku" : "Ringkasan AI"}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={submit}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-[3px] border-black bg-brand-navy px-4 font-label text-[11px] font-extrabold text-white shadow-brutal-sm transition-all active:translate-x-px active:translate-y-px active:shadow-none"
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">bookmark_add</span>
              Simpan ke topik
            </button>
          </div>

          {tautan.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {tautan.map((x) => (
                <li key={x.id} className="flex items-start gap-2 rounded-lg border border-black/15 bg-brand-paper p-2">
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">link</span>
                  <span className="min-w-0 flex-1">
                    <a href={x.url} target="_blank" rel="noreferrer" className="block truncate text-xs font-bold text-brand-blue underline">
                      {x.label}
                    </a>
                    {x.note ? <span className="block text-xs text-brand-muted">Berguna karena: {x.note}</span> : null}
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-label text-[10px] font-extrabold uppercase ${jenisBadge(x.jenis)}`}>
                      {TAUTAN_JENIS_LABEL[x.jenis]}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus tautan ${x.label}`}
                    onClick={() => onDelete(topicId, x.id)}
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white text-brand-brick shadow-brutal-sm"
                  >
                    <span aria-hidden className="material-symbols-outlined shrink-0 text-[16px] leading-none">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
