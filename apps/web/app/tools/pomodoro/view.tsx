"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import { loadTasks, type SharedTask } from "../../../components/task-store";
import {
  normalizePomodoroState,
  pushPomodoroSession,
  totalMingguIni,
  type PomodoroSession,
} from "@cademy/utils";

const KEY = "cademy:pomodoro";
const inputCls = "h-11 w-full rounded-xl border-[3px] border-black bg-brand-panel px-3 text-center font-body text-sm font-bold outline-none focus:bg-white";

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}

function toISODateLocal(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function PomodoroPage() {
  const [fokus, setFokus] = React.useState(25);
  const [pendek, setPendek] = React.useState(5);
  const [panjang, setPanjang] = React.useState(15);
  const [mode, setMode] = React.useState<"fokus" | "pendek" | "panjang">("fokus");
  const [sisa, setSisa] = React.useState(25 * 60);
  const [jalan, setJalan] = React.useState(false);
  const [sesi, setSesi] = React.useState(0);
  const [totalMenit, setTotalMenit] = React.useState(0);
  const [sessions, setSessions] = React.useState<PomodoroSession[]>([]);
  const [tugasId, setTugasId] = React.useState<string>("");
  const [daftarTugas, setDaftarTugas] = React.useState<SharedTask[]>([]);
  // Deadline absolut (epoch ms) — dikoreksi tiap tick agar tak drift
  // saat tab di-throttle. Sesi HANYA dicatat saat timer mencapai 0.
  const deadlineRef = React.useRef<number | null>(null);
  // U2: durasi fokus yang dicatat = nilai SAAT MULAI, bukan fokus terkini.
  const menitMulaiRef = React.useRef<number>(25);
  // U3: ref agar interval tak closure basi (efek cukup depend on [jalan]).
  const modeRef = React.useRef(mode);
  modeRef.current = mode;
  const sisaRef = React.useRef(sisa);
  sisaRef.current = sisa;
  const sesiRef = React.useRef(sesi);
  sesiRef.current = sesi;
  const totalRef = React.useRef(totalMenit);
  totalRef.current = totalMenit;
  const sessionsRef = React.useRef(sessions);
  sessionsRef.current = sessions;
  const [konfirmReset, setKonfirmReset] = React.useState(false);

  React.useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      const norm = normalizePomodoroState(s);
      setSesi(norm.sesi);
      setTotalMenit(norm.totalMenit);
      setSessions(norm.sessions);
      if (typeof (s as Record<string, unknown>)["fokus"] === "number") {
        const v = (s as Record<string, number>)["fokus"];
        if (v >= 1 && v <= 120) setFokus(v);
      }
      if (typeof (s as Record<string, unknown>)["pendek"] === "number") {
        const v = (s as Record<string, number>)["pendek"];
        if (v >= 1 && v <= 60) setPendek(v);
      }
      if (typeof (s as Record<string, unknown>)["panjang"] === "number") {
        const v = (s as Record<string, number>)["panjang"];
        if (v >= 1 && v <= 60) setPanjang(v);
      }
    } catch {}
    try {
      setDaftarTugas(loadTasks().filter((t) => t.status === "todo" || t.status === "doing"));
    } catch {}
  }, []);
  React.useEffect(() => { localStorage.setItem(KEY, JSON.stringify({ sesi, totalMenit, fokus, pendek, panjang, sessions })); }, [sesi, totalMenit, fokus, pendek, panjang, sessions]);

  const durasi = mode === "fokus" ? fokus * 60 : mode === "pendek" ? pendek * 60 : panjang * 60;

  React.useEffect(() => { if (!jalan) setSisa(durasi); }, [durasi, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function mulaiAtauJeda() {
    if (jalan) {
      // Jeda: bekukan sisa; deadline dibuang. Bukan sesi selesai.
      setJalan(false);
      deadlineRef.current = null;
      return;
    }
    const awal = sisa <= 0 ? durasi : sisa;
    if (sisa <= 0) setSisa(durasi);
    // Catat durasi SAAT MULAI segar (bukan saat timer mencapai 0).
    if (mode === "fokus" && (sisa <= 0 || sisa >= durasi)) menitMulaiRef.current = fokus;
    deadlineRef.current = Date.now() + awal * 1000;
    setJalan(true);
  }

  function resetTimer() {
    // Reset sebelum habis: TIDAK mencatat sesi (hanya saat mencapai 0).
    setJalan(false);
    deadlineRef.current = null;
    setSisa(durasi);
  }

  const tugasTerpilih = daftarTugas.find((t) => t.id === tugasId);
  const tugasRef = React.useRef<SharedTask | undefined>(undefined);
  tugasRef.current = tugasTerpilih;

  React.useEffect(() => {
    if (!jalan) return;
    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + sisaRef.current * 1000;
    }
    const id = window.setInterval(() => {
      const dl = deadlineRef.current;
      if (dl === null) return;
      const left = Math.max(0, Math.round((dl - Date.now()) / 1000));
      setSisa(left);
      if (left <= 0) {
        window.clearInterval(id);
        deadlineRef.current = null;
        setJalan(false);
        if (modeRef.current === "fokus") {
          // Sesi dicatat HANYA saat timer mencapai 0 (sertakan tugas bila dipilih).
          const t = tugasRef.current;
          const entri: PomodoroSession = {
            date: toISODateLocal(new Date()),
            minutes: menitMulaiRef.current,
            ...(t ? { taskId: t.id, taskTitle: t.title } : {}),
          };
          const next = pushPomodoroSession(
            { sesi: sesiRef.current, totalMenit: totalRef.current, sessions: sessionsRef.current },
            entri,
          );
          setSesi(next.sesi);
          setTotalMenit(next.totalMenit);
          setSessions(next.sessions);
        }
        try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play().catch(() => {}); } catch {}
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [jalan]);

  React.useEffect(() => { document.title = `${fmt(sisa)} • Pomodoro — Cademy`; }, [sisa]);

  const progress = durasi > 0 ? 1 - sisa / durasi : 0;
  const mingguIni = totalMingguIni(sessions);
  const riwayat = [...sessions].reverse();

  return (
    <ToolShell eyebrow="Hub / Alat" title="Pomodoro Timer" description="Fokus 25 menit, istirahat 5/15 menit. Penghitung sesi tersimpan di browser." icon="⏱️" badge={`${sesi} sesi • ${totalMenit} mnt`} badgeTone="info">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel className="bg-white text-center lg:col-span-3">
          <div className="flex justify-center gap-2">
            {(["fokus", "pendek", "panjang"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setJalan(false); }} className={mode === m ? "rounded-full border-[3px] border-black bg-brand-blue px-4 py-1.5 font-label text-xs font-bold text-white shadow-brutal" : "rounded-full border-[3px] border-black bg-white px-4 py-1.5 font-label text-xs font-bold shadow-brutal"}>
                {m === "fokus" ? "🎯 Fokus" : m === "pendek" ? "☕ Pendek" : "🌴 Panjang"}
              </button>
            ))}
          </div>
          <p className="mt-4 font-display text-7xl font-extrabold tabular-nums">{fmt(sisa)}</p>
          <div className="mx-auto mt-3 h-4 max-w-sm overflow-hidden rounded-full border-2 border-black bg-brand-paper">
            <div className="h-full bg-brand-blue transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <label className="mx-auto mt-4 block max-w-sm text-left">
            <span className="mb-1 block font-label text-xs font-extrabold uppercase text-brand-navy">Tugas fokus (opsional)</span>
            <select
              value={tugasId}
              onChange={(e) => setTugasId(e.target.value)}
              className="h-11 w-full rounded-xl border-[3px] border-black bg-white px-3 font-body text-sm font-bold text-brand-navy outline-none focus:bg-brand-paper"
              aria-label="Pilih tugas fokus"
            >
              <option value="">Tanpa tugas</option>
              {daftarTugas.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={mulaiAtauJeda}>{jalan ? "⏸ Jeda" : "▶ Mulai"}</Button>
            <Button variant="secondary" onClick={resetTimer}>↺ Reset</Button>
          </div>
          <p className="mt-3 text-sm font-semibold text-brand-muted">Sesi fokus selesai: {sesi} • Total fokus: {totalMenit} menit • Minggu ini: {mingguIni} menit</p>
        </Panel>
        <div className="space-y-4 lg:col-span-2">
          <Panel className="h-fit space-y-3 bg-white">
            <h2 className="font-display text-lg font-bold">Durasi custom (menit)</h2>
            <div className="grid grid-cols-3 gap-2">
              <label className="block space-y-1"><span className="text-xs font-bold">Fokus</span><input type="number" min={1} max={120} className={inputCls} value={fokus} onChange={(e) => setFokus(Number(e.target.value) || 25)} /></label>
              <label className="block space-y-1"><span className="text-xs font-bold">Pendek</span><input type="number" min={1} max={60} className={inputCls} value={pendek} onChange={(e) => setPendek(Number(e.target.value) || 5)} /></label>
              <label className="block space-y-1"><span className="text-xs font-bold">Panjang</span><input type="number" min={1} max={60} className={inputCls} value={panjang} onChange={(e) => setPanjang(Number(e.target.value) || 15)} /></label>
            </div>
            {!konfirmReset ? (
              <Button size="sm" variant="secondary" onClick={() => setKonfirmReset(true)}>Reset statistik</Button>
            ) : (
              <span className="flex items-center gap-2 text-xs font-bold">
                Yakin reset?
                <Button size="sm" variant="secondary" onClick={() => { setSesi(0); setTotalMenit(0); setSessions([]); setKonfirmReset(false); }}>Ya, reset</Button>
                <Button size="sm" variant="secondary" onClick={() => setKonfirmReset(false)}>Batal</Button>
              </span>
            )}
          </Panel>
          <Panel className="h-fit bg-white">
            <h2 className="font-display text-lg font-bold">Riwayat sesi</h2>
            <p className="mt-1 text-xs font-bold text-brand-muted">Total minggu ini: {mingguIni} menit • {sessions.length} sesi tersimpan</p>
            {riwayat.length === 0 ? (
              <p className="mt-3 rounded-xl border-2 border-dashed border-black/30 p-3 text-center font-body text-xs text-brand-muted">Belum ada sesi. Sesi tercatat otomatis saat timer fokus mencapai 0.</p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
                {riwayat.map((s, i) => (
                  <li key={`${s.date}-${i}`} className="flex items-center justify-between gap-2 rounded-xl border-2 border-black/15 bg-brand-panel px-2.5 py-1.5 text-xs font-bold">
                    <span>{s.date}</span>
                    <span className="min-w-0 flex-1 truncate text-brand-muted">{s.taskTitle ?? "Tanpa tugas"}</span>
                    <span>{s.minutes} mnt</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </ToolShell>
  );
}
