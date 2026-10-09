"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import { fmtSize, estimatePages, naiveText } from "@cademy/utils";

interface FileInfo { name: string; size: number; pages: number | null; text: string; error?: string; }

const PREVIEW_LIMIT = 2000;
const COPY_LIMIT = 5000;

async function copyTextWithFallback(text: string): Promise<boolean> {
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

export default function PdfPage() {
  const [files, setFiles] = React.useState<FileInfo[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [inputKey, setInputKey] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  function bersihkan() {
    setFiles([]);
    setInputKey((k) => k + 1);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setBusy(true);
    const next: FileInfo[] = [];
    for (const f of list) {
      if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") {
        next.push({ name: f.name, size: f.size, pages: null, text: "", error: "Bukan file PDF." });
        continue;
      }
      if (f.size > 20 * 1024 * 1024) {
        next.push({ name: f.name, size: f.size, pages: null, text: "", error: "Lebih dari 20 MB — kompres dulu." });
        continue;
      }
      const buf = await f.arrayBuffer();
      const header = new TextDecoder().decode(new Uint8Array(buf).slice(0, 5));
      if (header !== "%PDF-") {
        next.push({ name: f.name, size: f.size, pages: null, text: "", error: "Bukan file PDF (header tidak valid)." });
        continue;
      }
      next.push({ name: f.name, size: f.size, pages: estimatePages(buf), text: naiveText(buf) });
    }
    // APPEND: file baru ditambahkan ke daftar, bukan menimpa.
    setFiles((prev) => [...prev, ...next]);
    setBusy(false);
    // Reset input agar file yang sama bisa dipilih lagi.
    setInputKey((k) => k + 1);
  }

  async function salinTeks(text: string) {
    const ok = await copyTextWithFallback(text.slice(0, COPY_LIMIT));
    showToast(ok ? "Teks disalin ke clipboard!" : "Gagal menyalin — browser memblokir clipboard.");
  }

  const totalPages = files.reduce((a, f) => a + (f.pages ?? 0), 0);

  return (
    <ToolShell eyebrow="Hub / Alat" title="PDF Tools" description="Validasi file, hitung halaman, dan ekstrak teks sederhana — 100% di browser, tanpa upload." icon="📑" badge="Client-only" badgeTone="info">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">1. Pilih file PDF</h2>
            {files.length > 0 && <Button size="sm" variant="secondary" onClick={bersihkan}>Bersihkan daftar</Button>}
          </div>
          <input key={inputKey} type="file" accept="application/pdf,.pdf" multiple onChange={onPick} className="w-full rounded-xl border-[3px] border-dashed border-black bg-brand-paper p-4 font-body text-sm" />
          <p className="text-xs text-brand-muted">Batas 20MB per file. Estimasi halaman & ekstraksi teks dilakukan sepenuhnya di browser.</p>
          {busy && <p className="text-sm font-bold">⏳ Membaca file…</p>}
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={`${f.name}-${f.size}-${i}`} className="rounded-xl border-2 border-black/15 bg-brand-paper p-3 text-sm">
                <p className="font-bold">{f.name} <span className="font-normal text-brand-muted">({fmtSize(f.size)})</span></p>
                {f.error ? <p className="font-bold text-brand-brick">⚠️ {f.error}</p> : <p>📄 Estimasi halaman: <b>{f.pages ?? "tidak terdeteksi"}</b></p>}
              </div>
            ))}
            {files.length > 0 && <p className="text-sm font-bold">Total estimasi: {totalPages} halaman dari {files.length} file.</p>}
          </div>
        </Panel>
        <div className="space-y-3">
          <Panel>
            <h2 className="font-display text-lg font-bold">2. Merge / Split / Compress</h2>
            <p className="mt-1 rounded-lg bg-brand-yellow/60 p-2 text-xs font-bold">Panduan manual — halaman ini belum menggabungkan/memotong/mengompres file secara otomatis.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li><b>Merge:</b> gabungkan di server nanti — untuk sekarang urutkan file di atas lalu gunakan fitur Print → Save as PDF.</li>
              <li><b>Split:</b> catat rentang halaman dari estimasi di samping, lalu Print halaman tertentu → Save as PDF.</li>
              <li><b>Compress:</b> file &gt; 5 MB sebaiknya dikompres via tool OS; halaman ini hanya validasi ukuran.</li>
            </ul>
          </Panel>
          <Panel className="bg-white">
            <h2 className="font-display text-lg font-bold">3. Ekstrak teks (beta)</h2>
            <p className="text-xs text-brand-muted">Pratinjau dibatasi 2.000 karakter pertama per file. Ekstraksi sederhana di browser — PDF hasil pindaian/gambar tidak terbaca.</p>
            {files.length === 0 && <p className="text-sm text-brand-muted">Pilih PDF berbasis teks (bukan hasil scan) untuk melihat pratinjau ekstraksi.</p>}
            {files.map((f, i) => (
              <div key={`${f.name}-${f.size}-${i}`} className="mt-2">
                <p className="text-xs font-bold uppercase">{f.name}</p>
                <p className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border-2 border-dashed border-black/30 bg-brand-paper p-2 text-xs">
                  {f.text ? f.text.slice(0, PREVIEW_LIMIT) : "— teks tidak dapat diekstrak (kemungkinan PDF hasil scan/gambar)."}
                </p>
                {f.text && f.text.length > PREVIEW_LIMIT && (
                  <p className="mt-1 text-[11px] font-semibold text-brand-muted">
                    Pratinjau {PREVIEW_LIMIT} karakter pertama dari {f.text.length} karakter.
                  </p>
                )}
                {f.text && (
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => salinTeks(f.text)}>Salin teks</Button>
                )}
              </div>
            ))}
          </Panel>
        </div>
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
