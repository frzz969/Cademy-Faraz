"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import { generate, sentences, type Q, type QType } from "@cademy/utils";

const inputCls = "w-full rounded-xl border-[3px] border-black bg-brand-panel px-4 py-3 font-body text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

export default function QuizPage() {
  const [materi, setMateri] = React.useState("");
  const [jumlah, setJumlah] = React.useState("5");
  const [tipe, setTipe] = React.useState<QType>("campuran");
  const [soal, setSoal] = React.useState<Q[]>([]);
  const [showKunci, setShowKunci] = React.useState(false);
  const [jawab, setJawab] = React.useState<Record<string, string>>({});
  const [info, setInfo] = React.useState("");
  // Cek mandiri esai: user menilai jawabannya sendiri (jujur, bukan auto-nilai).
  const [mandiri, setMandiri] = React.useState<Record<string, "benar" | "salah">>({});

  function buat() {
    const diminta = Math.min(Math.max(Number(jumlah) || 5, 1), 30);
    const tersedia = sentences(materi).length;
    const hasil = generate(materi, diminta, tipe);
    setJumlah(String(diminta));
    setSoal(hasil);
    setJawab({}); setMandiri({}); setShowKunci(false);
    if (tersedia > 0 && diminta > hasil.length) {
      setInfo(`Permintaan ${diminta} soal dibatasi menjadi ${hasil.length} (materi hanya punya ${tersedia} kalimat unik — duplikat dicegah).`);
    } else {
      setInfo("");
    }
  }

  function reset() {
    setSoal([]);
    setJawab({});
    setMandiri({});
    setShowKunci(false);
    setInfo("");
  }

  function nilaiEsai(qid: string, v: "benar" | "salah") {
    setMandiri((m) => ({ ...m, [qid]: v }));
  }

  function formatHasil(): string {
    return soal.map((q, idx) => {
      const j = jawab[q.id] ? `Jawabanmu: ${jawab[q.id]}` : "Belum dijawab";
      const m = q.tipe === "Esai" && mandiri[q.id] ? `\nPenilaian mandiri: ${mandiri[q.id]}` : "";
      const kunci = `Kunci: ${q.kunci}\nPembahasan: ${q.pembahasan}`;
      const opsi = q.opsi ? `\nOpsi:\n${q.opsi.map((o) => `- ${o}`).join("\n")}` : "";
      return `${idx + 1}. [${q.tipe}] ${q.soal}${opsi}\n${j}${m}\n${kunci}`;
    }).join("\n\n");
  }

  function salinHasil() {
    const teks = `Kuis Cademy — Skor ${skor}/${soal.length}\n\n${formatHasil()}`;
    try {
      void navigator.clipboard.writeText(teks);
    } catch {
      /* abaikan */
    }
  }

  function unduhHasil() {
    const blob = new Blob([`Kuis Cademy — Skor ${skor}/${soal.length}\n\n${formatHasil()}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kuis-cademy.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Esai dinilai dari cek mandiri user; pilihan ganda & benar/salah otomatis.
  const skor = soal.filter((q) => {
    if (q.tipe === "Esai") return mandiri[q.id] === "benar";
    return jawab[q.id] && jawab[q.id].toLowerCase().trim() === q.kunci.toLowerCase().trim();
  }).length;

  return (
    <ToolShell eyebrow="Hub / Alat" title="Quiz Generator" description="Tempel materi kuliah → dapat soal pilihan ganda, benar/salah, dan esai + kunci otomatis. Template-based, tanpa AI server." icon="❓" badge="Template-based" badgeTone="info">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="space-y-3 bg-white">
          <h2 className="font-display text-lg font-bold">1. Materi</h2>
          <textarea rows={8} className={`${inputCls} min-h-40`} placeholder="Tempel 3–10 kalimat materi di sini…" value={materi} onChange={(e) => setMateri(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1"><span className="font-label text-xs font-bold uppercase">Jumlah soal (1–30)</span>
              <input
                type="number"
                min={1}
                max={30}
                className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-bold"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
              />
              <span className="flex gap-1.5 pt-1">
                {["3", "5", "10"].map((p) => (
                  <button key={p} type="button" onClick={() => setJumlah(p)} className={`rounded-full border-2 border-black px-2.5 py-0.5 font-label text-[11px] font-bold ${jumlah === p ? "bg-brand-blue text-white" : "bg-white"}`}>
                    {p}
                  </button>
                ))}
              </span>
            </label>
            <label className="block space-y-1"><span className="font-label text-xs font-bold uppercase">Tipe</span>
              <select className="h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-sm font-bold" value={tipe} onChange={(e) => setTipe(e.target.value as QType)}>
                <option value="campuran">Campuran</option><option value="mcq">Pilihan ganda</option><option value="benar-salah">Benar/Salah</option><option value="esai">Esai</option>
              </select>
            </label>
          </div>
          <Button className="w-full" onClick={buat} disabled={materi.trim().length < 20}>Buat kuis</Button>
          {materi.trim().length < 20 && <p className="text-xs font-semibold text-brand-brick">Materi minimal ~20 karakter agar soal bermakna.</p>}
          {info && <p className="text-xs font-semibold">{info}</p>}
        </Panel>
        <div className="space-y-3">
          <Panel className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{soal.length === 0 ? "Belum ada soal." : `${soal.length} soal • Skor: ${skor}/${soal.length}`}</p>
            {soal.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setShowKunci((v) => !v)}>{showKunci ? "Sembunyikan kunci" : "Tampilkan kunci"}</Button>
                <Button size="sm" variant="secondary" onClick={salinHasil}>Salin hasil</Button>
                <Button size="sm" variant="secondary" onClick={unduhHasil}>Unduh .txt</Button>
                <Button size="sm" variant="secondary" onClick={reset}>Reset</Button>
              </span>
            )}
          </Panel>
          {soal.map((q, idx) => (
            <Panel key={q.id} className="bg-white">
              <p className="font-label text-[11px] font-bold uppercase text-brand-muted">{idx + 1}. {q.tipe}</p>
              <p className="mt-1 font-body text-sm font-semibold">{q.soal}</p>
              {q.opsi && (
                <div className="mt-2 grid gap-1.5">
                  {q.opsi.map((o, oi) => (
                    <button key={`${q.id}-${oi}`} type="button" onClick={() => setJawab((j) => ({ ...j, [q.id]: o }))} className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold ${jawab[q.id] === o ? "border-black bg-brand-yellow" : "border-black/20 bg-brand-paper hover:border-black"}`}>{o}</button>
                  ))}
                </div>
              )}
              {(q.tipe === "Benar / Salah") && (
                <div className="mt-2 flex gap-2">
                  {(["Benar", "Salah"] as const).map((o) => (
                    <button key={`${q.id}-${o}`} type="button" onClick={() => setJawab((j) => ({ ...j, [q.id]: o }))} className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-bold ${jawab[q.id] === o ? "border-black bg-brand-yellow" : "border-black/20 bg-brand-paper"}`}>{o}</button>
                  ))}
                </div>
              )}
              {q.tipe === "Esai" && (
                <div className="mt-2 space-y-2">
                  <label className="block space-y-1">
                    <span className="font-label text-xs font-bold uppercase">Jawabanmu (esai tidak dinilai otomatis)</span>
                    <textarea
                      rows={3}
                      className={inputCls}
                      placeholder="Tulis jawabanmu dengan bahasamu…"
                      value={jawab[q.id] ?? ""}
                      onChange={(e) => setJawab((j) => ({ ...j, [q.id]: e.target.value }))}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Cek mandiri:</span>
                    <button
                      type="button"
                      onClick={() => nilaiEsai(q.id, "benar")}
                      aria-pressed={mandiri[q.id] === "benar"}
                      className={`rounded-full border-2 border-black px-3 py-1 text-xs font-bold ${mandiri[q.id] === "benar" ? "bg-brand-yellow" : "bg-brand-paper"}`}
                    >
                      ✓ Saya benar
                    </button>
                    <button
                      type="button"
                      onClick={() => nilaiEsai(q.id, "salah")}
                      aria-pressed={mandiri[q.id] === "salah"}
                      className={`rounded-full border-2 border-black px-3 py-1 text-xs font-bold ${mandiri[q.id] === "salah" ? "bg-brand-yellow" : "bg-brand-paper"}`}
                    >
                      ✗ Saya salah
                    </button>
                  </div>
                  <p className="text-[11px] font-medium text-brand-muted">Skor esai dihitung dari penilaian mandirimu — bandingkan jawabanmu dengan kunci sebelum menandai.</p>
                </div>
              )}
              {showKunci && (
                <div className="mt-2 rounded-xl bg-brand-panel p-2 text-sm">
                  <p><b>Kunci:</b> {q.kunci}</p>
                  <p className="text-brand-muted">{q.pembahasan}</p>
                </div>
              )}
            </Panel>
          ))}
        </div>
      </div>
    </ToolShell>
  );
}
