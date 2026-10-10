"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import { fromMateri, formatDeck, type Card } from "@cademy/utils";

const KEY = "cademy:flashcards";
const uid = (): string => {
  try {
    const c = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* abaikan — pakai fallback */
  }
  return Math.random().toString(36).slice(2, 9);
};
const inputCls = "w-full rounded-xl border-[3px] border-black bg-brand-panel px-4 py-3 font-body text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

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

function isCardArray(v: unknown): v is Card[] {
  return (
    Array.isArray(v) &&
    v.every(
      (c) =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Card).id === "string" &&
        typeof (c as Card).depan === "string" &&
        typeof (c as Card).belakang === "string",
    )
  );
}

export default function FlashcardsPage() {
  const [cards, setCards] = React.useState<Card[]>([]);
  const [materi, setMateri] = React.useState("");
  const [depan, setDepan] = React.useState("");
  const [belakang, setBelakang] = React.useState("");
  const [idx, setIdx] = React.useState(0);
  const [flip, setFlip] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? "[]";
      const s: unknown = JSON.parse(raw);
      if (isCardArray(s)) {
        setCards(s);
      } else {
        setCards([]);
        if (raw.trim() !== "[]" && raw.trim() !== "") {
          setToast("Data deck tersimpan rusak — deck dikosongkan, bukan diterima mentah.");
        }
      }
    } catch {
      setCards([]);
      setToast("Data deck tersimpan rusak — deck dikosongkan.");
    }
    setReady(true);
  }, []);
  React.useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(cards)); }, [cards, ready]);
  React.useEffect(() => { setFlip(false); if (idx >= cards.length) setIdx(0); }, [idx, cards.length]);

  const cur = cards[idx];

  function shuffle() {
    setCards((c) => {
      const a = [...c];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
    setIdx(0);
  }

  function deckText(): string {
    return formatDeck(cards);
  }

  async function salinDeck() {
    const ok = await copyTextWithFallback(`Deck Flashcards Cademy (${cards.length} kartu)\n\n${deckText()}`);
    showToast(ok ? "Deck disalin ke clipboard!" : "Gagal menyalin — browser memblokir clipboard.");
  }

  function unduhDeck() {
    const blob = new Blob([`Deck Flashcards Cademy (${cards.length} kartu)\n\n${deckText()}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deck-flashcards.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function tambahManual() {
    if (!depan.trim() || !belakang.trim()) {
      showToast("Isi depan dan belakang kartu dulu.");
      return;
    }
    setCards((c) => [...c, { id: uid(), depan: depan.trim(), belakang: belakang.trim() }]);
    setDepan(""); setBelakang("");
    showToast("Kartu ditambahkan!");
  }

  function buatDariMateri() {
    const n = fromMateri(materi, uid);
    if (n.length === 0) {
      showToast("Materi kosong — tulis satu baris per kartu dulu.");
      return;
    }
    setCards((c) => [...c, ...n]);
    setMateri(""); setIdx(0);
    showToast(`${n.length} kartu dibuat dari materi!`);
  }

  function hapusSemua() {
    if (cards.length === 0) return;
    if (!window.confirm(`Hapus semua ${cards.length} kartu? Tindakan ini tidak bisa dibatalkan.`)) return;
    setCards([]);
    showToast("Semua kartu dihapus.");
  }

  return (
    <ToolShell eyebrow="Hub / Alat" title="Flashcards" description="Ubah materi menjadi kartu depan-belakang. Klik kartu untuk membalik, tersimpan di browser." icon="🃏" badge={`${cards.length} kartu`} badgeTone="info">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Panel className="bg-white text-center">
            {cur ? (
              <button type="button" onClick={() => setFlip((v) => !v)} className="w-full" aria-label="Balik kartu">
                <p className="font-label text-xs font-bold uppercase text-brand-muted">{flip ? "Belakang — klik untuk balik" : `Depan — klik untuk balik (${idx + 1}/${cards.length})`}</p>
                <div className="mx-auto mt-2 flex min-h-44 items-center justify-center rounded-2xl border-[3px] border-black bg-brand-panel p-6 shadow-brutal">
                  <p className="font-display text-xl font-bold">{flip ? cur.belakang : cur.depan}</p>
                </div>
              </button>
            ) : (
              <p className="py-10 text-sm text-brand-muted">Belum ada kartu. Generate dari materi atau tambah manual.</p>
            )}
            {cur && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIdx((i) => (i - 1 + cards.length) % cards.length)}>← Prev</Button>
                <Button size="sm" variant="secondary" onClick={shuffle}>🔀 Acak</Button>
                <Button size="sm" variant="secondary" onClick={() => setIdx((i) => (i + 1) % cards.length)}>Next →</Button>
              </div>
            )}
            {cur && (
              <button type="button" onClick={() => setCards((c) => c.filter((x) => x.id !== cur.id))} className="mt-2 text-xs font-bold text-brand-brick underline">Hapus kartu ini</button>
            )}
            {cards.length > 0 && (
              <span className="mt-2 flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={salinDeck}>Salin deck</Button>
                <Button size="sm" variant="secondary" onClick={unduhDeck}>Unduh .txt</Button>
              </span>
            )}
          </Panel>
          <Panel className="space-y-2 bg-white">
            <h2 className="font-display text-lg font-bold">Tambah manual</h2>
            <input className={inputCls} placeholder="Depan (istilah/pertanyaan)" value={depan} onChange={(e) => setDepan(e.target.value)} />
            <input className={inputCls} placeholder="Belakang (definisi/jawaban)" value={belakang} onChange={(e) => setBelakang(e.target.value)} />
            <Button size="sm" onClick={tambahManual}>+ Tambah kartu</Button>
          </Panel>
        </div>
        <Panel className="h-fit space-y-2 bg-white">
          <h2 className="font-display text-lg font-bold">Generate dari materi</h2>
          <p className="text-xs text-brand-muted">Satu baris = satu kartu. Gunakan <b>Istilah | Definisi</b> atau biarkan otomatis. Dibatasi 30 kartu per generate agar deck tetap fokus — ulangi untuk materi panjang.</p>
          <textarea rows={8} className={`${inputCls} min-h-36`} placeholder={"cth:\nFotosintesis | Proses …\nMetode ilmiah | Langkah …"} value={materi} onChange={(e) => setMateri(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={buatDariMateri}>Generate kartu</Button>
            <Button size="sm" variant="danger" onClick={hapusSemua}>Hapus semua</Button>
          </div>
        </Panel>
      </div>
      {toast && (
        <div aria-live="polite" className="fixed bottom-24 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-2xl border-[3px] border-black bg-brand-navy px-4 py-3 font-body text-sm text-white shadow-brutal md:bottom-6">
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none text-brand-yellow">check_circle</span>
          <span>{toast}</span>
        </div>
      )}
    </ToolShell>
  );
}
