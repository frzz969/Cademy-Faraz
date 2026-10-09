"use client";

import * as React from "react";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import {
  PREFILL_KEY,
  parseAuthors,
  fmtAPA,
  fmtMLA,
  fmtChicago,
  fmtIEEE,
  fmtHarvard,
  fmtBibtex,
  isDoiLike,
  extractDoi,
  isTahunValid,
  type CiteInput,
  type JenisSumber,
} from "@cademy/utils";

const EMPTY: CiteInput = {
  judul: "",
  penulis: "",
  tahun: "",
  penerbit: "",
  identifier: "",
  jenis: "Jurnal",
  volume: "",
  issue: "",
  halaman: "",
  edisi: "",
  institusi: "",
  jenisKarya: "Skripsi",
  situs: "",
};

const STYLES = ["APA 7", "MLA 9", "Chicago", "IEEE", "Harvard", "BibTeX"] as const;
type Style = (typeof STYLES)[number];

const JENIS: JenisSumber[] = ["Jurnal", "Buku", "Skripsi/Tesis", "Web"];

const inputCls =
  "h-12 w-full rounded-xl border-[3px] border-black bg-brand-panel px-4 font-body text-sm font-medium text-brand-navy placeholder:text-brand-muted shadow-brutal outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

interface CrossrefMsg {
  title?: string[];
  author?: { family?: string; given?: string }[];
  published?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  URL?: string;
  DOI?: string;
}

export default function CitationPage() {
  const [form, setForm] = React.useState<CiteInput>(EMPTY);
  const [style, setStyle] = React.useState<Style>("APA 7");
  const [copied, setCopied] = React.useState(false);
  const [doiMsg, setDoiMsg] = React.useState("");
  const [doiLoading, setDoiLoading] = React.useState(false);
  const authors = parseAuthors(form.penulis);
  const todayLabel = React.useMemo(() => new Date().toLocaleDateString("id-ID"), []);

  // Jembatan dari halaman literatur: baca PREFILL_KEY SEKALI
  // saat mount (prefill form) lalu HAPUS key. Tanpa key ini halaman tetap
  // mandiri seperti biasa.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFILL_KEY);
      if (!raw) return;
      localStorage.removeItem(PREFILL_KEY);
      const p = JSON.parse(raw) as {
        title?: unknown;
        authors?: unknown;
        year?: unknown;
        journal?: unknown;
        doi?: unknown;
        url?: unknown;
      };
      if (!p || typeof p !== "object") return;
      const judul = typeof p.title === "string" ? p.title.trim() : "";
      const daftar = Array.isArray(p.authors)
        ? p.authors
            .filter((a): a is string => typeof a === "string")
            .map((a) => a.trim())
            .filter(Boolean)
        : typeof p.authors === "string"
          ? p.authors.split(/[;\n]+/).map((a) => a.trim()).filter(Boolean)
          : [];
      const tahun =
        typeof p.year === "number"
          ? String(p.year)
          : typeof p.year === "string"
            ? p.year.trim()
            : "";
      const jurnal = typeof p.journal === "string" ? p.journal.trim() : "";
      const doi = typeof p.doi === "string" ? p.doi.trim() : "";
      const url = typeof p.url === "string" ? p.url.trim() : "";
      if (!judul && daftar.length === 0 && !tahun && !jurnal && !doi && !url) return;
      setForm((f) => ({
        ...f,
        judul: judul || f.judul,
        penulis: daftar.length > 0 ? daftar.join("; ") : f.penulis,
        tahun: tahun || f.tahun,
        jenis: jurnal ? "Jurnal" : f.jenis,
        penerbit: jurnal || f.penerbit,
        identifier: doi || url || f.identifier,
      }));
    } catch {
      /* abaikan — form tetap mandiri */
    }
  }, []);

  const outputs: Record<Style, string> = {
    "APA 7": fmtAPA(form, authors),
    "MLA 9": fmtMLA(form, authors),
    "Chicago": fmtChicago(form, authors),
    "IEEE": fmtIEEE(form, authors),
    "Harvard": fmtHarvard(form, authors, todayLabel),
    "BibTeX": fmtBibtex(form, authors, todayLabel),
  };

  const missing: string[] = [];
  if (!form.judul.trim()) missing.push("judul");
  if (form.jenis === "Jurnal") {
    if (!form.penerbit.trim()) missing.push("nama jurnal");
    if (authors.length === 0) missing.push("penulis");
    if (!form.tahun.trim()) missing.push("tahun");
  } else if (form.jenis === "Buku") {
    if (authors.length === 0) missing.push("penulis");
    if (!form.tahun.trim()) missing.push("tahun");
    if (!form.penerbit.trim()) missing.push("penerbit");
  } else if (form.jenis === "Skripsi/Tesis") {
    if (authors.length === 0) missing.push("penulis");
    if (!form.tahun.trim()) missing.push("tahun");
    if (!form.institusi.trim()) missing.push("institusi/universitas");
  } else {
    if (!form.situs.trim()) missing.push("nama situs");
    if (!form.identifier.trim()) missing.push("URL");
  }
  // Validasi tahun numerik: tolak teks bebas dengan pesan jujur.
  const tahunOk = isTahunValid(form.tahun);
  const valid = missing.length === 0 && tahunOk;
  const current = outputs[style];

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function set<K extends keyof CiteInput>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setJenis(j: JenisSumber) {
    setForm((f) => ({ ...f, jenis: j }));
  }

  function bersihkan() {
    setForm(EMPTY);
    setStyle("APA 7");
    setDoiMsg("");
  }

  async function autofillDoi() {
    const raw = form.identifier.trim();
    if (!isDoiLike(raw)) {
      setDoiMsg("Masukkan DOI valid (cth: 10.xxxx/xxxxx) di kolom DOI/URL dulu.");
      return;
    }
    const doi = extractDoi(raw);
    setDoiLoading(true);
    setDoiMsg("");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=cademy-app@localhost`, { signal: ctrl.signal });
      if (!res.ok) throw new Error("not-found");
      const json = (await res.json()) as { message?: CrossrefMsg };
      const m = json.message;
      if (!m) throw new Error("not-found");
      const title = m.title?.[0] ?? "";
      const au = (m.author ?? [])
        .map((a) => [a.given, a.family].filter(Boolean).join(" ").trim())
        .filter(Boolean)
        .join("; ");
      const dp = m.published?.["date-parts"]?.[0]?.[0] ?? m["published-print"]?.["date-parts"]?.[0]?.[0] ?? m["published-online"]?.["date-parts"]?.[0]?.[0];
      const year = dp ? String(dp) : "";
      const journal = m["container-title"]?.[0] ?? "";
      setForm((f) => ({
        ...f,
        judul: title || f.judul,
        penulis: au || f.penulis,
        tahun: year || f.tahun,
        penerbit: journal || f.penerbit,
        volume: m.volume ?? f.volume,
        issue: m.issue ?? f.issue,
        halaman: (m.page ?? f.halaman).replace(/-/g, "-"),
        identifier: m.URL || m.DOI ? `https://doi.org/${m.DOI ?? ""}`.replace(/\/$/, "") || m.URL || f.identifier : f.identifier,
      }));
      setDoiMsg("Data DOI berhasil diisi — periksa kembali sebelum dipakai.");
    } catch {
      setDoiMsg("DOI tidak ditemukan atau offline — isi manual.");
    } finally {
      clearTimeout(timer);
      setDoiLoading(false);
    }
  }

  return (
    <ToolShell
      eyebrow="Hub / Alat"
      title="Citation Generator"
      description="Susun sitasi APA 7, MLA 9, Chicago, IEEE, Harvard + BibTeX. 100% client-side, tanpa server."
      icon="📑"
      badge="APA • MLA • IEEE"
      badgeTone="info"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="space-y-3 bg-white">
          <h2 className="font-display text-lg font-bold">1. Data sumber</h2>
          <label className="block space-y-1">
            <span className="font-label text-xs font-bold uppercase">Jenis sumber *</span>
            <select className={inputCls} value={form.jenis} onChange={(e) => setJenis(e.target.value as JenisSumber)}>
              {JENIS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-label text-xs font-bold uppercase">Judul *</span>
            <input className={inputCls} placeholder="cth: Pengaruh AI pada pembelajaran" value={form.judul} onChange={(e) => set("judul", e.target.value)} />
          </label>
          {form.jenis !== "Web" ? (
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Penulis * (pisahkan dengan ; )</span>
              <input className={inputCls} placeholder="cth: Budi Santoso; Siti Aminah" value={form.penulis} onChange={(e) => set("penulis", e.target.value)} />
            </label>
          ) : (
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Penulis / organisasi (pisahkan dengan ; )</span>
              <input className={inputCls} placeholder="cth: Budi Santoso; Kemdikbud" value={form.penulis} onChange={(e) => set("penulis", e.target.value)} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">{form.jenis === "Web" ? "Tahun / tanggal" : "Tahun *"}</span>
              <input className={inputCls} inputMode="numeric" placeholder="2024" value={form.tahun} onChange={(e) => set("tahun", e.target.value)} />
            </label>
            {form.jenis === "Jurnal" && (
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Nama jurnal *</span>
                <input className={inputCls} placeholder="cth: Jurnal Pendidikan Indonesia" value={form.penerbit} onChange={(e) => set("penerbit", e.target.value)} />
              </label>
            )}
            {form.jenis === "Buku" && (
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Penerbit *</span>
                <input className={inputCls} placeholder="cth: Gramedia" value={form.penerbit} onChange={(e) => set("penerbit", e.target.value)} />
              </label>
            )}
            {form.jenis === "Skripsi/Tesis" && (
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Institusi / universitas *</span>
                <input className={inputCls} placeholder="cth: Universitas Indonesia" value={form.institusi} onChange={(e) => set("institusi", e.target.value)} />
              </label>
            )}
            {form.jenis === "Web" && (
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Nama situs *</span>
                <input className={inputCls} placeholder="cth: Kompas.com" value={form.situs} onChange={(e) => set("situs", e.target.value)} />
              </label>
            )}
          </div>
          {!tahunOk && (
            <p role="alert" className="text-xs font-semibold text-brand-brick">
              Tahun harus 4 digit angka (cth: 2024) — teks bebas tidak diterima.
            </p>
          )}
          {form.jenis === "Jurnal" && (
            <div className="grid grid-cols-3 gap-3">
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Volume</span>
                <input className={inputCls} placeholder="cth: 10" value={form.volume} onChange={(e) => set("volume", e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Issue / No</span>
                <input className={inputCls} placeholder="cth: 2" value={form.issue} onChange={(e) => set("issue", e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">Halaman</span>
                <input className={inputCls} placeholder="cth: 100-115" value={form.halaman} onChange={(e) => set("halaman", e.target.value)} />
              </label>
            </div>
          )}
          {form.jenis === "Buku" && (
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Edisi (opsional)</span>
              <input className={inputCls} placeholder="cth: Ed. ke-3" value={form.edisi} onChange={(e) => set("edisi", e.target.value)} />
            </label>
          )}
          {form.jenis === "Skripsi/Tesis" && (
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">Jenis karya</span>
              <select className={inputCls} value={form.jenisKarya} onChange={(e) => set("jenisKarya", e.target.value)}>
                {["Skripsi", "Tesis", "Disertasi"].map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-1">
            <span className="font-label text-xs font-bold uppercase">{form.jenis === "Web" ? "URL *" : "DOI / URL"}</span>
            <input className={inputCls} placeholder="https://doi.org/… atau URL…" value={form.identifier} onChange={(e) => set("identifier", e.target.value)} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={autofillDoi}>
              {doiLoading ? "Mencari DOI…" : "Isi otomatis dari DOI"}
            </Button>
          </div>
          {doiMsg && <p className="text-xs font-semibold">{doiMsg}</p>}
          {!valid && tahunOk && <p className="text-xs font-semibold text-brand-brick">Lengkapi {missing.join(", ")} untuk hasil akurat.</p>}
        </Panel>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={style === s
                  ? "rounded-full border-[3px] border-black bg-brand-blue px-3 py-1.5 font-label text-xs font-bold text-white shadow-brutal"
                  : "rounded-full border-[3px] border-black bg-white px-3 py-1.5 font-label text-xs font-bold shadow-brutal hover:bg-brand-panel"}
              >
                {s}
              </button>
            ))}
          </div>
          <Panel>
            <h2 className="font-display text-lg font-bold">2. Hasil — {style}</h2>
            <p className="mt-2 min-h-20 whitespace-pre-wrap rounded-xl border-2 border-dashed border-black/30 bg-brand-paper p-3 font-body text-sm">
              {current}
            </p>
            <p className="mt-2 text-xs">Keluaran teks polos: terapkan cetak miring judul jurnal/buku di dokumen akhirmu.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => copy(current)}>{copied ? "✓ Tersalin!" : "Salin hasil"}</Button>
              <Button size="sm" variant="secondary" onClick={() => copy(Object.entries(outputs).map(([k, v]) => `[${k}]\n${v}`).join("\n\n"))}>
                Salin semua gaya
              </Button>
              <Button size="sm" variant="secondary" onClick={bersihkan}>
                Bersihkan form
              </Button>
            </div>
            <p className="mt-3 text-xs">Selalu periksa kembali sebelum dipakai. Panduan resmi: apastyle.apa.org • style.mla.org • Chicago Manual of Style • IEEE Reference Guide.</p>
          </Panel>
        </div>
      </div>
    </ToolShell>
  );
}
