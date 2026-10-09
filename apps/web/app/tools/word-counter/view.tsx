"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import { stats } from "@cademy/utils";

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

export default function WordCounterPage() {
  const [text, setText] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);
  const s = stats(text);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  async function salinRingkasan() {
    const ok = await copyTextWithFallback(
      `Kata: ${s.words}, Karakter: ${s.chars}, Kalimat: ${s.sentences}`
    );
    showToast(ok ? "Ringkasan disalin ke clipboard!" : "Gagal menyalin — browser memblokir clipboard.");
  }

  return (
    <ToolShell eyebrow="Hub / Alat" title="Word Counter" description="Hitung kata, karakter, kalimat, paragraf, estimasi waktu baca + skor keterbacaan. Bonus, 100% lokal." icon="🔤" badge="Bonus" badgeTone="info">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel className="space-y-2 bg-white lg:col-span-3">
          <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tempel atau ketik teks di sini…" className="min-h-64 w-full rounded-xl border-[3px] border-black bg-brand-panel px-4 py-3 font-body text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue" />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => salinRingkasan()}>Salin ringkasan</Button>
            <Button size="sm" variant="secondary" onClick={() => setText("")}>Bersihkan</Button>
          </div>
        </Panel>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          {[
            ["Kata", String(s.words)],
            ["Karakter", String(s.chars)],
            ["Tanpa spasi", String(s.charsNoSpace)],
            ["Kalimat", String(s.sentences)],
            ["Paragraf", String(s.paras)],
            ["Waktu baca", s.minutes < 1 ? `${Math.round(s.minutes * 60)} dtk` : `${s.minutes.toFixed(1)} mnt`],
          ].map(([k, v]) => (
            <Panel key={k} className="bg-white text-center">
              <p className="font-label text-[11px] font-bold uppercase text-brand-muted">{k}</p>
              <p className="font-display text-3xl font-extrabold">{v}</p>
            </Panel>
          ))}
          <Panel className="col-span-2 bg-brand-yellow text-center">
            <p className="font-label text-[11px] font-bold uppercase">Skor keterbacaan Flesch</p>
            <p className="font-display text-3xl font-extrabold">{text.trim() ? s.flesch.toFixed(0) : "—"}</p>
            <p className="text-sm font-bold">{text.trim() ? s.level : "Ketik teks untuk melihat skor."}</p>
            <p className="text-sm font-bold">{text.trim() ? `Jenjang AS ≈ ${s.grade.toFixed(1)}` : ""}</p>
            {text.trim() ? <p className="text-[11px] font-medium">setara kelas sekolah AS.</p> : null}
            <p className="mt-1 text-[11px] font-medium">Acuan kasar untuk teks berbahasa Inggris; kurang akurat untuk Bahasa Indonesia. Suku kata dihitung heuristik; untuk Bahasa Indonesia hanya indikatif.</p>
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
