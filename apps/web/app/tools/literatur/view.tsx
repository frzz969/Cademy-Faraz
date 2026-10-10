"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ToolShell } from "../../../components/ToolShell";
import { Button, Panel } from "@cademy/ui";
import { buildCsv, CSV_BOM } from "@cademy/utils/csv";
import { PREFILL_KEY, fmtAPA, fmtMLA, fmtChicago, fmtIEEE, fmtHarvard, fmtBibtex } from "@cademy/utils/citation";
import { parseThesisV2, THESIS_V2_KEY, type ThesisProject } from "@cademy/utils/thesis";
import {
  emptyProjRefsStore,
  defaultSections,
  linkRef,
  setDikutip,
  unlinkRef,
  refsForProject,
  refLinksFlat,
  orphanProjectIds,
  buildDaftarPustaka,
  applyMetaEdit,
  restoreMeta,
  statusMetadata,
  CITE_STYLES,
  type ProjRefsStore,
  type Formatter,
} from "@cademy/utils/proyek";
import {
  STATUS_LABEL,
  MATRIX_FIELDS,
  SEARCH_CSV_HEADER,
  MATRIX_CSV_HEADER,
  freshFavs,
  uid,
  slugifyNama,
  toArticle,
  dedupArticles,
  findDupId,
  authorsLabel,
  makePrefill,
  loadFavs,
  saveFavs,
  loadMatrix,
  saveMatrix,
  loadProjRefs,
  saveProjRefs,
  makeBackup,
  parseBackup,
  searchCsvRow,
  matrixCsvRow,
  buildMatrixMarkdown,
  type Article,
  type Collection,
  type FavsStore,
  type MatrixField,
  type MatrixRow,
  type ReadingStatus,
} from "./store";

const FORMATTERS: Record<string, Formatter> = {
  "APA 7": fmtAPA,
  "MLA 9": fmtMLA,
  Chicago: fmtChicago,
  IEEE: fmtIEEE,
  Harvard: fmtHarvard,
  BibTeX: fmtBibtex,
};

interface OpenAlexAuthor {
  author?: { display_name?: string };
}

interface OpenAlexWork {
  id?: string;
  display_name?: string | null;
  title?: string | null;
  doi?: string | null;
  publication_year?: number | null;
  cited_by_count?: number | null;
  authorships?: OpenAlexAuthor[];
  primary_location?: {
    source?: { display_name?: string | null };
  } | null;
  open_access?: { oa_url?: string | null } | null;
}

const inputCls =
  "h-12 w-full rounded-xl border-[3px] border-black bg-brand-panel px-4 font-body text-sm font-medium text-brand-navy placeholder:text-brand-muted shadow-brutal outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

const rowInputCls =
  "w-full rounded-lg border-2 border-black/60 bg-brand-panel px-2 py-1.5 font-body text-xs font-medium text-brand-navy placeholder:text-brand-muted outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue";

const pillCls =
  "inline-flex items-center rounded-full border-[3px] border-black bg-white px-3 py-1 font-label text-[11px] font-bold shadow-[3px_3px_0px_#000000] hover:bg-brand-panel";

const DIRS = [
  {
    grup: "Pencarian literatur umum",
    name: "OpenAlex",
    desc: "Pencarian lintas bidang + status open access. Sumber data pencarian tool ini.",
    href: "https://openalex.org/",
  },
  {
    grup: "Pencarian literatur umum",
    name: "Google Scholar",
    desc: "Penelusuran umum: artikel, tesis, dan versi lain publikasi.",
    href: "https://scholar.google.com/",
  },
  {
    grup: "Pencarian literatur umum",
    name: "Semantic Scholar",
    desc: "Pencarian artikel + karya terkait lewat model semantik.",
    href: "https://www.semanticscholar.org/",
  },
  {
    grup: "Jurnal & artikel open access",
    name: "DOAJ",
    desc: "Direktori jurnal/artikel akses terbuka. Bukan jaminan relevansi atau tingkat kualitas.",
    href: "https://doaj.org/",
  },
  {
    grup: "Jurnal & artikel open access",
    name: "CORE",
    desc: "Hasil dari repositori akses terbuka; tidak semua punya full text gratis.",
    href: "https://core.ac.uk/",
  },
  {
    grup: "Publikasi Indonesia",
    name: "GARUDA",
    desc: "Literasi & publikasi Indonesia (Kemdiktisaintek). Tidak punya API publik.",
    href: "https://garuda.kemdiktisaintek.go.id/",
  },
  {
    grup: "Publikasi Indonesia",
    name: "SINTA",
    desc: "Info jurnal, peneliti & pengindeksan. Akreditasi: cek tanggal periode resminya.",
    href: "https://sinta.kemdiktisaintek.go.id/",
  },
  {
    grup: "Metadata & DOI",
    name: "Crossref",
    desc: "Cek metadata publikasi via judul/penulis/DOI. Berada di DOI ≠ jurnal bereputasi.",
    href: "https://search.crossref.org/",
  },
  {
    grup: "Bidang khusus: kesehatan & hayati",
    name: "PubMed",
    desc: "Pencarian kedokteran/kesehatan (NCBI). Pakai filter Free full text.",
    href: "https://pubmed.ncbi.nlm.nih.gov/",
  },
  {
    grup: "Bidang khusus: kesehatan & hayati",
    name: "Europe PMC",
    desc: "Pencarian biologi/kesehatan dengan filter teks lengkap gratis.",
    href: "https://europepmc.org/",
  },
] as const;

type Status = "idle" | "loading" | "error" | "empty" | "done";

const MATRIX_LABEL: Record<MatrixField | "catatan", string> = {
  tujuan: "Tujuan",
  metode: "Metode",
  sampel: "Sampel",
  variabel: "Variabel",
  temuan: "Temuan",
  keterbatasan: "Keterbatasan",
  relevansi: "Relevansi dgn skripsi",
  catatan: "Catatan",
};

const EMPTY_ROW: MatrixRow = {
  tujuan: "",
  metode: "",
  sampel: "",
  variabel: "",
  temuan: "",
  keterbatasan: "",
  relevansi: "",
};

function fmtAuthors(a: OpenAlexAuthor[] | undefined): string {
  const names = (a ?? [])
    .map((x) => x?.author?.display_name?.trim())
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return "—";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} dkk.`;
}

function cellMeta(v: string): string {
  return v.trim() ? v : "—";
}

// ---- Sub-komponen level modul (di luar komponen utama agar fokus
// input/textarea tidak hilang saat state berubah) ----

function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-24 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-2xl border-[3px] border-black bg-brand-navy px-4 py-3 font-body text-sm text-white shadow-brutal md:bottom-6"
    >
      <span aria-hidden>✓</span>
      <span>{msg}</span>
    </div>
  );
}

interface FavItemProps {
  a: Article;
  status: ReadingStatus;
  note: string;
  tags: string[];
  collections: Collection[];
  onStatus: (id: string, s: ReadingStatus) => void;
  onNote: (id: string, v: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onAddToCollection: (articleId: string, collectionId: string) => void;
  onSend: (a: Article) => void;
  onRemove: (id: string) => void;
}

function FavItem(p: FavItemProps) {
  const { a } = p;
  const [tagDraft, setTagDraft] = React.useState("");
  return (
    <li className="rounded-xl border-[3px] border-black bg-brand-paper p-3 shadow-[4px_4px_0px_#000000]">
      <p className="font-display text-sm font-bold sm:text-base">
        {cellMeta(a.title)}
      </p>
      <p className="mt-1 font-body text-xs text-brand-muted sm:text-sm">
        {authorsLabel(a.authors)} • {a.year ?? "—"} • {cellMeta(a.source)}
        {typeof a.citedBy === "number" ? ` • Disitasi ${a.citedBy}×` : null}
      </p>
      {a.doi ? (
        <a
          href={a.doi}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block break-all font-body text-[11px] text-brand-blue underline"
        >
          {a.doi}
        </a>
      ) : null}
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="font-label text-[11px] font-bold uppercase">
            Status baca
          </span>
          <select
            className={rowInputCls}
            value={p.status}
            onChange={(e) => p.onStatus(a.id, e.target.value as ReadingStatus)}
          >
            {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-label text-[11px] font-bold uppercase">
            Masukkan ke koleksi
          </span>
          <select
            className={rowInputCls}
            value=""
            onChange={(e) => {
              if (e.target.value) p.onAddToCollection(a.id, e.target.value);
            }}
          >
            <option value="">＋ Pilih koleksi…</option>
            {p.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-2 block space-y-1">
        <span className="font-label text-[11px] font-bold uppercase">
          Catatan pribadi
        </span>
        <textarea
          rows={2}
          className={`${rowInputCls} min-h-14 resize-y`}
          placeholder="cth: Metode cocok untuk bab 3 — baca penuh hal. 4–7."
          value={p.note}
          onChange={(e) => p.onNote(a.id, e.target.value)}
        />
      </label>
      <div className="mt-2 space-y-1">
        <span className="font-label text-[11px] font-bold uppercase">Tag</span>
        <div className="flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-brand-yellow px-2 py-0.5 font-label text-[11px] font-bold"
            >
              {t}
              <button
                type="button"
                aria-label={`Hapus tag ${t}`}
                onClick={() => p.onRemoveTag(a.id, t)}
                className="font-bold hover:text-brand-brick"
              >
                ×
              </button>
            </span>
          ))}
          {p.tags.length === 0 ? (
            <span className="font-body text-xs text-brand-muted">
              Belum ada tag.
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <input
            className={rowInputCls}
            placeholder="cth: metode-kualitatif"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                p.onAddTag(a.id, tagDraft);
                setTagDraft("");
              }
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              p.onAddTag(a.id, tagDraft);
              setTagDraft("");
            }}
          >
            + Tag
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => p.onSend(a)} className={pillCls}>
          Kirim ke Sitasi →
        </button>
        <button
          type="button"
          onClick={() => p.onRemove(a.id)}
          className="font-body text-xs font-bold text-brand-brick underline"
        >
          Hapus favorit
        </button>
      </div>
    </li>
  );
}

interface KoleksiCardProps {
  c: Collection;
  members: Article[];
  renaming: boolean;
  renameDraft: string;
  onRenameDraft: (v: string) => void;
  onStartRename: (id: string, current: string) => void;
  onCancelRename: () => void;
  onSaveRename: (id: string) => void;
  onDelete: (id: string) => void;
  onRemoveMember: (collectionId: string, articleId: string) => void;
  onSend: (a: Article) => void;
  onCsv: (c: Collection) => void;
}

function KoleksiCard(p: KoleksiCardProps) {
  const { c } = p;
  return (
    <div className="rounded-xl border-[3px] border-black bg-brand-paper p-3 shadow-[4px_4px_0px_#000000]">
      {p.renaming ? (
        <div className="flex gap-2">
          <input
            className={rowInputCls}
            value={p.renameDraft}
            onChange={(e) => p.onRenameDraft(e.target.value)}
            aria-label="Nama baru koleksi"
          />
          <Button size="sm" onClick={() => p.onSaveRename(c.id)}>
            Simpan
          </Button>
          <Button size="sm" variant="secondary" onClick={p.onCancelRename}>
            Batal
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-base font-bold">
            {c.name}{" "}
            <span className="font-body text-xs font-medium text-brand-muted">
              ({p.members.length} artikel)
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => p.onStartRename(c.id, c.name)}
            >
              Ganti nama
            </Button>
            <Button size="sm" variant="secondary" onClick={() => p.onCsv(c)}>
              Unduh CSV
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => p.onDelete(c.id)}
            >
              Hapus
            </Button>
          </div>
        </div>
      )}
      {p.members.length === 0 ? (
        <p className="mt-2 font-body text-xs text-brand-muted">
          Koleksi kosong — tambahkan artikel dari daftar favorit di atas.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {p.members.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-2 rounded-lg border-2 border-black/40 bg-white px-2 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate font-body text-xs font-bold">
                  {cellMeta(m.title)}
                </p>
                <p className="font-body text-[11px] text-brand-muted">
                  {authorsLabel(m.authors)} • {m.year ?? "—"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => p.onSend(m)}
                  className="font-body text-[11px] font-bold text-brand-blue underline"
                >
                  Sitasi →
                </button>
                <button
                  type="button"
                  onClick={() => p.onRemoveMember(c.id, m.id)}
                  className="font-body text-[11px] font-bold text-brand-brick underline"
                >
                  Keluarkan
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface MatriksTableProps {
  rows: Article[];
  getCell: (id: string, f: MatrixField) => string;
  getNote: (id: string) => string;
  onCell: (id: string, f: MatrixField, v: string) => void;
  onNote: (id: string, v: string) => void;
}

function MatriksTable(p: MatriksTableProps) {
  const thCls =
    "border-2 border-black bg-brand-yellow px-2 py-1.5 text-left font-label text-[11px] font-bold uppercase whitespace-nowrap";
  const tdMetaCls =
    "border-2 border-black/25 bg-white px-2 py-1.5 align-top font-body text-xs";
  const tdInputCls = "border-2 border-black/25 bg-white px-1 py-1 align-top";
  const cellInputCls =
    "w-full min-w-28 rounded-md border border-black/30 bg-brand-panel px-1.5 py-1 font-body text-xs outline-none focus:bg-white";
  return (
    <div className="overflow-x-auto rounded-xl border-[3px] border-black bg-white">
      <table className="w-full min-w-[1080px] border-collapse">
        <thead>
          <tr>
            <th className={thCls}>Judul</th>
            <th className={thCls}>Penulis</th>
            <th className={thCls}>Tahun</th>
            <th className={thCls}>Sumber</th>
            <th className={thCls}>DOI</th>
            {MATRIX_FIELDS.map((f) => (
              <th key={f} className={`${thCls} bg-brand-panel`}>
                {MATRIX_LABEL[f]}
              </th>
            ))}
            <th className={`${thCls} bg-brand-panel`}>
              {MATRIX_LABEL.catatan}
            </th>
          </tr>
        </thead>
        <tbody>
          {p.rows.map((a) => (
            <tr key={a.id}>
              <td className={`${tdMetaCls} max-w-56 font-bold`}>{cellMeta(a.title)}</td>
              <td className={`${tdMetaCls} max-w-40`}>
                {a.authors.length > 0 ? a.authors.join(", ") : "—"}
              </td>
              <td className={tdMetaCls}>{a.year ?? "—"}</td>
              <td className={`${tdMetaCls} max-w-40`}>{cellMeta(a.source)}</td>
              <td className={`${tdMetaCls} max-w-44`}>
                {a.doi ? (
                  <a
                    href={a.doi}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-brand-blue underline"
                  >
                    {a.doi}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              {MATRIX_FIELDS.map((f) => (
                <td key={f} className={tdInputCls}>
                  <input
                    className={cellInputCls}
                    aria-label={`${MATRIX_LABEL[f]} — ${a.title || a.id}`}
                    placeholder="isi manual…"
                    value={p.getCell(a.id, f)}
                    onChange={(e) => p.onCell(a.id, f, e.target.value)}
                  />
                </td>
              ))}
              <td className={tdInputCls}>
                <input
                  className={cellInputCls}
                  aria-label={`Catatan — ${a.title || a.id}`}
                  placeholder="isi manual…"
                  value={p.getNote(a.id)}
                  onChange={(e) => p.onNote(a.id, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LiteraturView() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [dari, setDari] = React.useState("");
  const [sampai, setSampai] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [results, setResults] = React.useState<OpenAlexWork[]>([]);
  const [formError, setFormError] = React.useState("");
  const [copiedDoi, setCopiedDoi] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("Gagal memuat — periksa internet lalu coba lagi.");
  const abortRef = React.useRef<AbortController | null>(null);

  // ---- Workspace riset (favorit, koleksi, matriks, cadangan) ----
  const [favs, setFavs] = React.useState<FavsStore>(() => freshFavs());
  const [matrix, setMatrix] = React.useState<Record<string, MatrixRow>>({});
  const [siap, setSiap] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);
  const [namaKoleksi, setNamaKoleksi] = React.useState("");
  const [editKoleksiId, setEditKoleksiId] = React.useState<string | null>(null);
  const [editNama, setEditNama] = React.useState("");
  const [scope, setScope] = React.useState<string>("favorit");
  const [pesanImpor, setPesanImpor] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // ---- Relasi referensi ↔ proyek skripsi (key aditif) ----
  const [projRefs, setProjRefs] = React.useState<ProjRefsStore>(() => emptyProjRefsStore());
  const [proyekList, setProyekList] = React.useState<ThesisProject[]>([]);
  const [proyekAktif, setProyekAktif] = React.useState("");
  const [pustakaTab, setPustakaTab] = React.useState<"semua" | "dikutip">("semua");
  const [editMetaId, setEditMetaId] = React.useState<string | null>(null);
  const [metaDraft, setMetaDraft] = React.useState({ title: "", authors: "", tahun: "", source: "", doi: "" });

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  React.useEffect(() => {
    try {
      const last = localStorage.getItem("literatur-last-q");
      if (last) setQ(last);
    } catch {
      /* abaikan */
    }
    try {
      const loaded = loadFavs();
      setFavs(loaded.store);
      const m = loadMatrix();
      setMatrix(m.matrix);
      if (loaded.direset || m.direset) {
        setToast("Data favorit tersimpan rusak — dikosongkan dengan aman, bukan diterima mentah.");
      }
    } catch {
      setFavs(freshFavs());
      setMatrix({});
    }
    // Relasi proyek (aditif) + daftar proyek skripsi (baca dari thesis-v2).
    try {
      setProjRefs(loadProjRefs());
    } catch {
      setProjRefs(emptyProjRefsStore());
    }
    try {
      const rawT = localStorage.getItem(THESIS_V2_KEY);
      const v2 = rawT ? parseThesisV2(JSON.parse(rawT)) : null;
      const list = v2?.projects ?? [];
      setProyekList(list);
      if (list.length > 0) setProyekAktif((cur) => cur || list[0].id);
    } catch {
      setProyekList([]);
    }
    setSiap(true);
    return () => abortRef.current?.abort();
  }, []);

  React.useEffect(() => {
    if (siap) saveFavs(favs);
  }, [favs, siap]);
  React.useEffect(() => {
    if (siap) saveMatrix(matrix);
  }, [matrix, siap]);
  React.useEffect(() => {
    if (siap) saveProjRefs(projRefs);
  }, [projRefs, siap]);

  async function cari(e?: React.FormEvent) {
    e?.preventDefault();
    const keyword = q.trim();
    if (!keyword) {
      setFormError("Kata kunci wajib diisi.");
      return;
    }
    setFormError("");
    const d = dari.trim();
    const s = sampai.trim();
    const isYear = (v: string) => v === "" || /^\d{4}$/.test(v);
    if (!isYear(d) || !isYear(s)) {
      setFormError("Tahun dari/sampai harus 4 digit angka (cth: 2020) atau kosong.");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 15000);

    setStatus("loading");
    setResults([]);
    try {
      localStorage.setItem("literatur-last-q", keyword);
    } catch {
      /* abaikan */
    }

    let url =
      `https://api.openalex.org/works?search=${encodeURIComponent(keyword)}` +
      `&per-page=10&mailto=cademy-app@localhost`;
    if (d || s) {
      const from = d || "1900";
      const to = s || String(new Date().getFullYear());
      url += `&filter=from_publication_date:${from}-01-01,to_publication_date:${to}-12-31`;
    }

    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("network");
      const json = (await res.json()) as { results?: OpenAlexWork[] };
      const list = (json.results ?? []).slice(0, 10);
      setResults(list);
      setStatus(list.length === 0 ? "empty" : "done");
    } catch (e) {
      if (ctrl.signal.aborted) {
        setErrorMsg("Pencarian dibatalkan / timeout (15 dtk) — coba lagi dengan kata kunci lebih spesifik.");
      } else if (typeof navigator !== "undefined" && !navigator.onLine) {
        setErrorMsg("Kamu offline — periksa koneksi internet lalu coba lagi.");
      } else {
        setErrorMsg("Gagal memuat — server tidak merespons. Coba lagi nanti.");
      }
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  async function salinDoi(doi: string) {
    try {
      await navigator.clipboard.writeText(doi);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = doi;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiedDoi(doi);
    setTimeout(() => setCopiedDoi(null), 1500);
  }

  // ---- Relasi referensi ↔ proyek skripsi (tautan by ID; artikel TIDAK disalin) ----

  const cloneRefs = (s: ProjRefsStore): ProjRefsStore => JSON.parse(JSON.stringify(s));
  const aktifProj = projRefs.byProject[proyekAktif];
  const orphanCount = orphanProjectIds(projRefs, proyekList.map((p) => p.id)).length;
  const sectionsAktif = aktifProj?.sections ?? defaultSections();
  const proyekAktifNama = proyekList.find((p) => p.id === proyekAktif)?.name ?? "Proyek";

  function tautkan(id: string, sections: string[], dikutip = false) {
    if (!proyekAktif) return;
    setProjRefs((s) => linkRef(cloneRefs(s), proyekAktif, id, sections, dikutip));
  }
  function setKutip(id: string, v: boolean) {
    if (!proyekAktif) return;
    setProjRefs((s) => setDikutip(cloneRefs(s), proyekAktif, id, v));
  }
  function putusTautan(id: string) {
    if (!proyekAktif) return;
    setProjRefs((s) => unlinkRef(cloneRefs(s), proyekAktif, id));
  }
  function ubahGayaProyek(g: string) {
    setProjRefs((s) => {
      const n = cloneRefs(s);
      if (n.byProject[proyekAktif]) n.byProject[proyekAktif].gayaSitasi = g;
      return n;
    });
  }
  function mulaiEditMeta(a: Article) {
    setEditMetaId(a.id);
    setMetaDraft({
      title: a.title,
      authors: a.authors.join("; "),
      tahun: a.year !== null && Number.isFinite(a.year) ? String(a.year) : "",
      source: a.source,
      doi: a.doi ?? "",
    });
  }
  function simpanMeta(id: string) {
    const cur = favs.articles[id];
    if (!cur) return;
    const tahun = metaDraft.tahun.trim();
    const authors = metaDraft.authors
      .split(/[;\n]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const patched = applyMetaEdit(cur, {
      title: metaDraft.title.trim() || cur.title,
      authors: authors.length > 0 ? authors : cur.authors,
      year: tahun && /^\d{4}$/.test(tahun) ? Number(tahun) : cur.year,
      source: metaDraft.source.trim() || cur.source,
      doi: metaDraft.doi.trim() || undefined,
    });
    setFavs((f) => ({ ...f, articles: { ...f.articles, [id]: patched } }));
    setEditMetaId(null);
    showToast("Metadata terkoreksi — snapshot API asli disimpan (tidak tertimpa).");
  }
  function pulihkanMeta(id: string) {
    setFavs((f) => {
      const cur = f.articles[id];
      if (!cur || !cur.original) return f;
      return { ...f, articles: { ...f.articles, [id]: restoreMeta(cur) } };
    });
    showToast("Metadata dikembalikan ke versi API.");
  }

  const daftarPustaka = React.useMemo(() => {
    if (!proyekAktif) return null;
    const gaya = aktifProj?.gayaSitasi ?? "APA 7";
    return buildDaftarPustaka(
      refLinksFlat(projRefs, proyekAktif),
      favs.articles,
      gaya,
      pustakaTab === "dikutip",
      FORMATTERS[gaya] ?? fmtAPA,
    );
  }, [projRefs, proyekAktif, favs.articles, pustakaTab, aktifProj?.gayaSitasi]);

  async function salinPustaka() {
    if (!daftarPustaka || daftarPustaka.items.length === 0) {
      showToast("Belum ada referensi pada cakupan ini.");
      return;
    }
    const teks = daftarPustaka.items.map((i) => i.sitasi).join("\n\n");
    try {
      await navigator.clipboard.writeText(teks);
      showToast("Daftar pustaka tersalin!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = teks;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Daftar pustaka tersalin (fallback)!");
    }
  }
  function unduhPustaka() {
    if (!daftarPustaka || daftarPustaka.items.length === 0) {
      showToast("Belum ada referensi pada cakupan ini.");
      return;
    }
    const isi = [
      `# Daftar Pustaka — ${proyekAktifNama}`,
      "",
      `Gaya sitasi: ${daftarPustaka.gaya}`,
      pustakaTab === "dikutip"
        ? "Cakupan: referensi yang ditandai dikutip (status dikelola pengguna — bukan hasil pemeriksaan naskah)."
        : "Cakupan: semua referensi yang ditautkan ke proyek.",
      "",
      ...daftarPustaka.items.map((i) => i.sitasi),
      "",
      daftarPustaka.perluDiperiksa > 0
        ? `> Perhatian: ${daftarPustaka.perluDiperiksa} referensi metadatanya belum lengkap — periksa sebelum dipakai.`
        : "",
      daftarPustaka.hilang.length > 0
        ? `> Catatan: ${daftarPustaka.hilang.length} referensi tidak ditemukan di favorit dan dilewati.`
        : "",
    ]
      .filter((x) => x !== "")
      .join("\n");
    unduhMdFile(`daftar-pustaka-${slugifyNama(proyekAktifNama)}.md`, isi);
  }

  // ---- Favorit ----

  function simpanFavorit(w: OpenAlexWork) {
    const a = toArticle(w);
    if (!a) {
      showToast("Artikel tanpa id OpenAlex — tidak disimpan.");
      return;
    }
    const dup = findDupId(favs, a);
    if (dup) {
      showToast("Sudah ada di favorit (duplikat DOI digabung).");
      return;
    }
    setFavs((f) => ({
      ...f,
      articles: { ...f.articles, [a.id]: a },
      readingStatus: { ...f.readingStatus, [a.id]: "belum" },
    }));
    showToast("Ditambahkan ke favorit!");
  }

  function hapusFavorit(id: string) {
    setFavs((f) => {
      const articles = { ...f.articles };
      delete articles[id];
      const readingStatus = { ...f.readingStatus };
      delete readingStatus[id];
      const notes = { ...f.notes };
      delete notes[id];
      const tags = { ...f.tags };
      delete tags[id];
      return {
        articles,
        collections: f.collections.map((c) => ({
          ...c,
          articleIds: c.articleIds.filter((x) => x !== id),
        })),
        readingStatus,
        notes,
        tags,
      };
    });
    setMatrix((m) => {
      if (!(id in m)) return m;
      const next = { ...m };
      delete next[id];
      return next;
    });
    showToast("Favorit dihapus.");
  }

  function ubahStatus(id: string, s: ReadingStatus) {
    setFavs((f) => ({ ...f, readingStatus: { ...f.readingStatus, [id]: s } }));
  }

  function ubahCatatan(id: string, v: string) {
    setFavs((f) => ({ ...f, notes: { ...f.notes, [id]: v } }));
  }

  function tambahTag(id: string, raw: string) {
    const t = raw.trim().replace(/\s+/g, "-");
    if (!t) {
      showToast("Tag kosong — tulis dulu.");
      return;
    }
    setFavs((f) => {
      const cur = f.tags[id] ?? [];
      if (cur.includes(t)) return f;
      return { ...f, tags: { ...f.tags, [id]: [...cur, t] } };
    });
  }

  function hapusTag(id: string, tag: string) {
    setFavs((f) => ({
      ...f,
      tags: { ...f.tags, [id]: (f.tags[id] ?? []).filter((x) => x !== tag) },
    }));
  }

  // ---- Koleksi ----

  function buatKoleksi() {
    const name = namaKoleksi.trim();
    if (!name) {
      showToast("Nama koleksi wajib diisi.");
      return;
    }
    const c: Collection = {
      id: uid(),
      name,
      articleIds: [],
      createdAt: new Date().toISOString(),
    };
    setFavs((f) => ({ ...f, collections: [...f.collections, c] }));
    setNamaKoleksi("");
    showToast(`Koleksi "${name}" dibuat!`);
  }

  function simpanRename(id: string) {
    const name = editNama.trim();
    if (!name) {
      showToast("Nama koleksi wajib diisi.");
      return;
    }
    setFavs((f) => ({
      ...f,
      collections: f.collections.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
    setEditKoleksiId(null);
    setEditNama("");
    showToast("Nama koleksi diperbarui!");
  }

  function hapusKoleksi(id: string) {
    const c = favs.collections.find((x) => x.id === id);
    if (!window.confirm(`Hapus koleksi "${c?.name ?? ""}"? Artikel favoritnya tetap tersimpan.`)) return;
    setFavs((f) => ({ ...f, collections: f.collections.filter((x) => x.id !== id) }));
    if (scope === id) setScope("favorit");
    showToast("Koleksi dihapus.");
  }

  function tambahKeKoleksi(articleId: string, collectionId: string) {
    setFavs((f) => ({
      ...f,
      collections: f.collections.map((c) =>
        c.id === collectionId && !c.articleIds.includes(articleId)
          ? { ...c, articleIds: [...c.articleIds, articleId] }
          : c,
      ),
    }));
    showToast("Artikel masuk koleksi!");
  }

  function hapusDariKoleksi(collectionId: string, articleId: string) {
    setFavs((f) => ({
      ...f,
      collections: f.collections.map((c) =>
        c.id === collectionId
          ? { ...c, articleIds: c.articleIds.filter((x) => x !== articleId) }
          : c,
      ),
    }));
  }

  // ---- Matriks ----

  function ubahSelMatrix(id: string, field: MatrixField, v: string) {
    setMatrix((m) => ({ ...m, [id]: { ...EMPTY_ROW, ...m[id], [field]: v } }));
  }

  // ---- Jembatan sitasi ----

  function kirimKeSitasi(a: Article) {
    try {
      localStorage.setItem(PREFILL_KEY, JSON.stringify(makePrefill(a)));
    } catch {
      showToast("Gagal menyiapkan data sitasi — storage diblokir.");
      return;
    }
    router.push("/tools/citation");
  }

  // ---- Unduhan CSV ----

  function unduhCsvFile(filename: string, header: string[], rows: unknown[][]) {
    const blob = new Blob([CSV_BOM + buildCsv(header, rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = filename;
    document.body.appendChild(el);
    el.click();
    el.remove();
    URL.revokeObjectURL(url);
    showToast("File CSV terunduh!");
  }

  function unduhMdFile(filename: string, isi: string) {
    const blob = new Blob([isi], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = filename;
    document.body.appendChild(el);
    el.click();
    el.remove();
    URL.revokeObjectURL(url);
    showToast("File Markdown terunduh!");
  }

  function hasilCariArticles(): Article[] {
    return dedupArticles(
      results.map(toArticle).filter((a): a is Article => a !== null),
    );
  }

  function unduhCsvCari() {
    const list = hasilCariArticles();
    if (list.length === 0) {
      showToast("Belum ada hasil cari untuk diunduh.");
      return;
    }
    unduhCsvFile("hasil-cari-literatur.csv", SEARCH_CSV_HEADER, list.map(searchCsvRow));
  }

  function anggotaKoleksi(c: Collection): Article[] {
    return dedupArticles(
      c.articleIds
        .map((id) => favs.articles[id])
        .filter((a): a is Article => Boolean(a)),
    );
  }

  function unduhCsvKoleksi(c: Collection) {
    const list = anggotaKoleksi(c);
    if (list.length === 0) {
      showToast(`Koleksi "${c.name}" masih kosong.`);
      return;
    }
    unduhCsvFile(
      `matriks-${slugifyNama(c.name)}.csv`,
      MATRIX_CSV_HEADER,
      list.map((a) => matrixCsvRow(a, matrix[a.id], favs.notes[a.id] ?? "")),
    );
  }

  // ---- Cadangan JSON ----

  function eksporCadangan() {
    const blob = new Blob([JSON.stringify(makeBackup(favs, matrix, projRefs), null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    const tgl = new Date().toISOString().slice(0, 10);
    el.download = `literatur-cadangan-${tgl}.json`;
    document.body.appendChild(el);
    el.click();
    el.remove();
    URL.revokeObjectURL(url);
    showToast("Cadangan JSON terunduh!");
  }

  async function imporCadangan(file: File) {
    setPesanImpor("");
    try {
      const text = await file.text();
      const parsed = parseBackup(JSON.parse(text));
      if (!parsed.ok) {
        setPesanImpor(parsed.pesan);
        showToast(parsed.pesan);
        return;
      }
      setFavs(parsed.favs);
      setMatrix(parsed.matrix);
      setProjRefs(parsed.projRefs);
      setScope("favorit");
      setPesanImpor("Cadangan dipulihkan — periksa favorit, koleksi & relasi proyekmu.");
      showToast("Cadangan dipulihkan!");
    } catch {
      const msg = "File cadangan rusak — tidak dipulihkan. Pilih file JSON cadangan yang valid.";
      setPesanImpor(msg);
      showToast(msg);
    }
  }

  const favList = React.useMemo(
    () => dedupArticles(Object.values(favs.articles)),
    [favs.articles],
  );
  const scopeKoleksi = favs.collections.find((c) => c.id === scope);
  const scopeRows = scopeKoleksi ? anggotaKoleksi(scopeKoleksi) : favList;
  const scopeName = scopeKoleksi ? scopeKoleksi.name : "Semua favorit";

  return (
    <ToolShell
      eyebrow="Hub / Alat"
      title="Pencari Jurnal"
      description="Cari artikel jurnal lewat OpenAlex + direktori Sinta, Garuda, DOAJ."
      icon="search"
      badge="OpenAlex"
      badgeTone="info"
    >
      <div className="space-y-4">
        <Panel className="space-y-3 bg-white">
          <h2 className="font-display text-lg font-bold">1. Cari artikel</h2>
          <form onSubmit={cari} className="space-y-3">
            <label className="block space-y-1">
              <span className="font-label text-xs font-bold uppercase">
                Kata kunci *
              </span>
              <input
                className={inputCls}
                placeholder="cth: pembelajaran berbasis proyek"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {formError ? (
              <p role="alert" className="text-xs font-bold text-brand-brick">
                {formError}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">
                  Tahun dari
                </span>
                <input
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="2020"
                  value={dari}
                  onChange={(e) => setDari(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="font-label text-xs font-bold uppercase">
                  Tahun sampai
                </span>
                <input
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="2025"
                  value={sampai}
                  onChange={(e) => setSampai(e.target.value)}
                />
              </label>
            </div>
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Mencari…" : "Cari"}
            </Button>
          </form>
          <p className="text-[11px] font-medium text-brand-muted">
            Data dari OpenAlex (openalex.org). Butuh internet.
          </p>
        </Panel>

        <Panel className="bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Hasil pencarian</h2>
            {status === "done" && results.length > 0 ? (
              <Button size="sm" variant="secondary" onClick={unduhCsvCari}>
                Unduh CSV
              </Button>
            ) : null}
          </div>
          {status === "idle" ? (
            <p className="mt-2 text-sm">
              Masukkan kata kunci lalu tekan Cari.
            </p>
          ) : null}
          {status === "loading" ? (
            <p className="mt-2 text-sm font-bold" aria-live="polite">
              Mencari…
            </p>
          ) : null}
          {status === "error" ? (
            <p className="mt-2 text-sm font-bold" role="alert">
              {errorMsg}
            </p>
          ) : null}
          {status === "empty" ? (
            <p className="mt-2 text-sm" aria-live="polite">
              Tidak ada hasil untuk kata kunci itu.
            </p>
          ) : null}
          {status === "done" ? (
            <ul className="mt-3 space-y-3">
              {results.map((w, i) => {
                const title = w?.display_name ?? w?.title ?? "—";
                const year = w?.publication_year ? String(w.publication_year) : "—";
                const source =
                  w?.primary_location?.source?.display_name ?? "—";
                const cited =
                  typeof w?.cited_by_count === "number"
                    ? String(w.cited_by_count)
                    : "—";
                const doi = w?.doi ?? undefined;
                const oa = w?.open_access?.oa_url ?? undefined;
                const art = toArticle(w);
                const tersimpan = art ? findDupId(favs, art) !== null : false;
                return (
                  <li
                    key={w?.id ?? `${title}-${i}`}
                    className="rounded-xl border-[3px] border-black bg-brand-paper p-3 shadow-[4px_4px_0px_#000000]"
                  >
                    <p className="font-display text-sm font-bold sm:text-base">
                      {title || "—"}
                    </p>
                    <p className="mt-1 font-body text-xs text-brand-muted sm:text-sm">
                      {fmtAuthors(w?.authorships)} • {year} • {source} •
                      Disitasi {cited}×
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {doi ? (
                        <>
                          <a
                            href={doi}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full border-[3px] border-black bg-white px-3 py-1 font-label text-[11px] font-bold shadow-[3px_3px_0px_#000000] hover:bg-brand-panel"
                          >
                            DOI
                          </a>
                          <button
                            type="button"
                            onClick={() => salinDoi(doi)}
                            className="inline-flex items-center rounded-full border-[3px] border-black bg-brand-yellow px-3 py-1 font-label text-[11px] font-bold shadow-[3px_3px_0px_#000000] hover:brightness-95"
                          >
                            {copiedDoi === doi ? "✓ Tersalin!" : "Salin DOI"}
                          </button>
                        </>
                      ) : null}
                      {oa ? (
                        <a
                          href={oa}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border-[3px] border-black bg-white px-3 py-1 font-label text-[11px] font-bold shadow-[3px_3px_0px_#000000] hover:bg-brand-panel"
                        >
                          Akses terbuka
                        </a>
                      ) : null}
                      {!doi && !oa ? (
                        <span className="font-body text-xs text-brand-muted">
                          Tidak ada tautan tersedia.
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 border-t-2 border-dashed border-black/20 pt-2">
                      {tersimpan ? (
                        <span className="inline-flex items-center rounded-full border-[3px] border-black bg-brand-yellow px-3 py-1 font-label text-[11px] font-bold">
                          ★ Tersimpan
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => simpanFavorit(w)}
                          className="inline-flex items-center rounded-full border-[3px] border-black bg-brand-blue px-3 py-1 font-label text-[11px] font-bold text-white shadow-[3px_3px_0px_#000000] hover:bg-brand-navy"
                        >
                          ＋ Favorit
                        </button>
                      )}
                      {art ? (
                        <button
                          type="button"
                          onClick={() => kirimKeSitasi(art)}
                          className="inline-flex items-center rounded-full border-[3px] border-black bg-white px-3 py-1 font-label text-[11px] font-bold shadow-[3px_3px_0px_#000000] hover:bg-brand-panel"
                        >
                          Kirim ke Sitasi →
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Panel>

        <Panel className="space-y-3 bg-white">
          <h2 className="font-display text-lg font-bold">
            2. Favorit ({favList.length})
          </h2>
          <p className="text-[11px] font-medium text-brand-muted">
            Favorit &amp; koleksi tersimpan di browser ini saja (localStorage) — tidak sinkron
            antarperangkat; unduh cadangan JSON bila penting.
          </p>
          {favList.length === 0 ? (
            <p className="text-sm">
              Belum ada favorit. Simpan artikel dari hasil pencarian di atas dengan tombol ＋ Favorit.
            </p>
          ) : (
            <ul className="space-y-3">
              {favList.map((a) => (
                <FavItem
                  key={a.id}
                  a={a}
                  status={favs.readingStatus[a.id] ?? "belum"}
                  note={favs.notes[a.id] ?? ""}
                  tags={favs.tags[a.id] ?? []}
                  collections={favs.collections}
                  onStatus={ubahStatus}
                  onNote={ubahCatatan}
                  onAddTag={tambahTag}
                  onRemoveTag={hapusTag}
                  onAddToCollection={tambahKeKoleksi}
                  onSend={kirimKeSitasi}
                  onRemove={hapusFavorit}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="space-y-3 bg-white">
          <h2 className="font-display text-lg font-bold">
            3. Koleksi ({favs.collections.length})
          </h2>
          <p className="text-xs font-medium text-brand-muted">
            Kelompokkan favorit per topik — cth: “Bab 2 — Metode”, “ bacaan wajib”.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className={inputCls}
              placeholder="Nama koleksi baru…"
              value={namaKoleksi}
              onChange={(e) => setNamaKoleksi(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buatKoleksi();
                }
              }}
            />
            <div className="shrink-0">
              <Button onClick={buatKoleksi}>+ Buat koleksi</Button>
            </div>
          </div>
          {favs.collections.length === 0 ? (
            <p className="text-sm">Belum ada koleksi.</p>
          ) : (
            <div className="space-y-3">
              {favs.collections.map((c) => (
                <KoleksiCard
                  key={c.id}
                  c={c}
                  members={anggotaKoleksi(c)}
                  renaming={editKoleksiId === c.id}
                  renameDraft={editNama}
                  onRenameDraft={setEditNama}
                  onStartRename={(id, cur) => {
                    setEditKoleksiId(id);
                    setEditNama(cur);
                  }}
                  onCancelRename={() => {
                    setEditKoleksiId(null);
                    setEditNama("");
                  }}
                  onSaveRename={simpanRename}
                  onDelete={hapusKoleksi}
                  onRemoveMember={hapusDariKoleksi}
                  onSend={kirimKeSitasi}
                  onCsv={unduhCsvKoleksi}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel className="space-y-3 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">4. Matriks literatur</h2>
            {scopeRows.length > 0 ? (
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (scopeKoleksi) unduhCsvKoleksi(scopeKoleksi);
                    else if (favList.length > 0)
                      unduhCsvFile(
                        "matriks-semua-favorit.csv",
                        MATRIX_CSV_HEADER,
                        favList.map((a) => matrixCsvRow(a, matrix[a.id], favs.notes[a.id] ?? "")),
                      );
                  }}
                >
                  Unduh CSV
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    unduhMdFile(
                      `matriks-${slugifyNama(scopeName)}.md`,
                      buildMatrixMarkdown(
                        scopeName,
                        scopeRows.map((a) => ({
                          article: a,
                          row: matrix[a.id],
                          catatan: favs.notes[a.id] ?? "",
                        })),
                      ),
                    )
                  }
                >
                  Unduh .md
                </Button>
              </span>
            ) : null}
          </div>
          <p className="text-xs font-medium text-brand-muted">
            Kolom penulis/tahun/judul/sumber/DOI hanya tampilan (read-only) dari data API — sel “—”
            berarti datanya memang tidak tersedia. Kolom tujuan/metode/sampel/variabel/temuan/
            keterbatasan/relevansi/catatan diisi manual olehmu dan tidak pernah diisi otomatis.
          </p>
          <label className="block max-w-sm space-y-1">
            <span className="font-label text-xs font-bold uppercase">
              Tampilkan matriks untuk
            </span>
            <select
              className={rowInputCls}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="favorit">Semua favorit ({favList.length})</option>
              {favs.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({anggotaKoleksi(c).length})
                </option>
              ))}
            </select>
          </label>
          {scopeRows.length === 0 ? (
            <p className="text-sm">
              {scopeKoleksi
                ? `Koleksi "${scopeName}" masih kosong — tambahkan artikel dari daftar favorit.`
                : "Belum ada favorit untuk ditampilkan di matriks."}
            </p>
          ) : (
            <>
              <p className="text-xs font-bold">
                {scopeName} — {scopeRows.length} artikel. Geser tabel ke samping di layar kecil.
              </p>
              <MatriksTable
                rows={scopeRows}
                getCell={(id, f) => matrix[id]?.[f] ?? ""}
                getNote={(id) => favs.notes[id] ?? ""}
                onCell={ubahSelMatrix}
                onNote={ubahCatatan}
              />
            </>
          )}
        </Panel>

        <Panel className="space-y-3 bg-white">
          <h2 className="font-display text-lg font-bold">5. Projek Skripsi &amp; Daftar Pustaka</h2>
          {proyekList.length === 0 ? (
            <p className="text-sm">
              Belum ada proyek skripsi. Buat dulu di{" "}
              <a href="/tools/thesis-checker" className="font-bold text-brand-blue underline">
                Thesis Checker
              </a>{" "}
              — halaman ini hanya menautkan referensi yang sudah kamu simpan, tanpa menyalin data.
            </p>
          ) : (
            <>
              <label className="block max-w-sm space-y-1">
                <span className="font-label text-xs font-bold uppercase">Pilih proyek skripsi</span>
                <select
                  className={rowInputCls}
                  value={proyekAktif}
                  onChange={(e) => setProyekAktif(e.target.value)}
                >
                  {proyekList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.docType})
                    </option>
                  ))}
                </select>
              </label>
              {orphanCount > 0 && (
                <p className="rounded-xl bg-brand-yellow/60 p-2 text-xs font-bold">
                  {orphanCount} relasi untuk proyek yang sedang tidak terbaca disimpan aman —
                  tidak dihapus. Buka kembali proyeknya di Thesis Checker untuk melihatnya lagi.
                </p>
              )}

              {/* Referensi proyek — tautan by ID, artikel tidak disalin */}
              <div className="border-t-2 border-dashed border-black/20 pt-3">
                <h3 className="font-display text-base font-bold">Referensi proyek</h3>
                <p className="mt-0.5 text-xs text-brand-muted">
                  Tautkan artikel favorit ke bab. Artikel tetap satu entitas — bisa dipakai banyak
                  proyek tanpa menggandakan data.
                </p>
                {favList.length === 0 ? (
                  <p className="mt-2 text-sm">Belum ada favorit — simpan artikel dari hasil cari dulu.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {favList.map((a) => {
                      const link = aktifProj?.refs[a.id];
                      const meta = statusMetadata(a);
                      return (
                        <div key={a.id} className="rounded-xl border-2 border-black/20 bg-brand-paper p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-sm font-bold">{a.title || "(tanpa judul)"}</p>
                            <span
                              className={
                                meta.status === "lengkap"
                                  ? "rounded-full border-2 border-black bg-green-100 px-2 py-0.5 font-label text-[11px] font-bold"
                                  : "rounded-full border-2 border-black bg-brand-yellow/60 px-2 py-0.5 font-label text-[11px] font-bold"
                              }
                            >
                              {meta.status === "lengkap"
                                ? "Metadata: lengkap"
                                : `Metadata: perlu diperiksa (${meta.hilang.join(", ")})`}
                            </span>
                          </div>
                          <label className="mt-1.5 flex items-center gap-2 text-sm font-bold">
                            <input
                              type="checkbox"
                              checked={Boolean(link)}
                              onChange={(e) => {
                                if (e.target.checked) tautkan(a.id, []);
                                else putusTautan(a.id);
                              }}
                            />
                            Masukkan ke proyek ini
                            {a.diperbaiki && (
                              <span className="font-label text-[11px] font-bold uppercase text-brand-blue">
                                terkoreksi
                              </span>
                            )}
                          </label>
                          {link && (
                            <>
                              <div className="mt-1.5 flex flex-wrap gap-2">
                                {sectionsAktif.map((s) => (
                                  <label key={s.id} className="flex items-center gap-1.5 text-xs font-bold">
                                    <input
                                      type="checkbox"
                                      checked={link.sections.includes(s.id)}
                                      onChange={(e) => {
                                        const next = e.target.checked
                                          ? [...link.sections, s.id]
                                          : link.sections.filter((x) => x !== s.id);
                                        tautkan(a.id, next, link.dikutip);
                                      }}
                                    />
                                    {s.nama}
                                  </label>
                                ))}
                              </div>
                              <label className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                                <input
                                  type="checkbox"
                                  checked={link.dikutip}
                                  onChange={(e) => setKutip(a.id, e.target.checked)}
                                />
                                Tandai dikutip
                                <span className="font-normal text-brand-muted">
                                  (status yang kamu kelola — Cademy belum memeriksa naskahmu)
                                </span>
                              </label>
                            </>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => mulaiEditMeta(a)}>
                              Perbaiki metadata
                            </Button>
                            {a.original && (
                              <Button size="sm" variant="secondary" onClick={() => pulihkanMeta(a.id)}>
                                Kembalikan ke metadata API
                              </Button>
                            )}
                          </div>
                          {editMetaId === a.id && (
                            <div className="mt-2 space-y-2 rounded-xl border-2 border-black/15 bg-white p-3">
                              <p className="text-xs font-bold text-brand-muted">
                                Koreksi milikmu. Snapshot API asli disimpan sekali dan tidak tertimpa
                                — hasil koreksi belum tentu “terverifikasi”.
                              </p>
                              <input
                                className={inputCls}
                                value={metaDraft.title}
                                onChange={(e) => setMetaDraft((d) => ({ ...d, title: e.target.value }))}
                                aria-label="Judul"
                                placeholder="Judul"
                              />
                              <input
                                className={inputCls}
                                value={metaDraft.authors}
                                onChange={(e) => setMetaDraft((d) => ({ ...d, authors: e.target.value }))}
                                aria-label="Penulis"
                                placeholder="Penulis (pisahkan dengan ; )"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  className={inputCls}
                                  value={metaDraft.tahun}
                                  onChange={(e) => setMetaDraft((d) => ({ ...d, tahun: e.target.value }))}
                                  aria-label="Tahun"
                                  placeholder="Tahun"
                                />
                                <input
                                  className={inputCls}
                                  value={metaDraft.doi}
                                  onChange={(e) => setMetaDraft((d) => ({ ...d, doi: e.target.value }))}
                                  aria-label="DOI"
                                  placeholder="DOI"
                                />
                              </div>
                              <input
                                className={inputCls}
                                value={metaDraft.source}
                                onChange={(e) => setMetaDraft((d) => ({ ...d, source: e.target.value }))}
                                aria-label="Sumber"
                                placeholder="Sumber / jurnal"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => simpanMeta(a.id)}>
                                  Simpan koreksi
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => setEditMetaId(null)}>
                                  Batal
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Daftar pustaka */}
              <div className="border-t-2 border-dashed border-black/20 pt-3">
                <h3 className="font-display text-base font-bold">Daftar pustaka</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPustakaTab("semua")}
                    className={pustakaTab === "semua" ? pillCls + " bg-brand-blue text-white" : pillCls}
                  >
                    Semua referensi proyek ({aktifProj ? Object.keys(aktifProj.refs).length : 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPustakaTab("dikutip")}
                    className={pustakaTab === "dikutip" ? pillCls + " bg-brand-blue text-white" : pillCls}
                  >
                    Referensi yang ditandai dikutip (
                    {refsForProject(projRefs, proyekAktif).filter((r) => r.link.dikutip).length})
                  </button>
                </div>
                <label className="mt-2 block max-w-sm space-y-1">
                  <span className="font-label text-xs font-bold uppercase">Gaya sitasi</span>
                  <select
                    className={rowInputCls}
                    value={aktifProj?.gayaSitasi ?? "APA 7"}
                    onChange={(e) => ubahGayaProyek(e.target.value)}
                  >
                    {CITE_STYLES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                {daftarPustaka && (
                  <>
                    {daftarPustaka.items.length === 0 ? (
                      <p className="mt-2 text-sm">
                        {pustakaTab === "dikutip"
                          ? "Belum ada referensi yang ditandai dikutip pada proyek ini."
                          : "Belum ada referensi yang ditautkan ke proyek ini."}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1.5 rounded-xl border-2 border-dashed border-black/30 bg-brand-paper p-3">
                        {daftarPustaka.items.map((i) => (
                          <p key={i.articleId} className="text-sm">
                            {i.sitasi}
                            {i.metaHilang.length > 0 && (
                              <span className="ml-1 font-label text-[11px] font-bold text-brand-brick">
                                (kurang: {i.metaHilang.join(", ")})
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    )}
                    {(daftarPustaka.perluDiperiksa > 0 || daftarPustaka.hilang.length > 0) && (
                      <p className="mt-1.5 text-xs font-bold text-brand-brick">
                        {daftarPustaka.perluDiperiksa > 0
                          ? `${daftarPustaka.perluDiperiksa} referensi metadatanya belum lengkap — periksa sebelum dipakai. `
                          : ""}
                        {daftarPustaka.hilang.length > 0
                          ? `${daftarPustaka.hilang.length} referensi tidak ditemukan di favorit dan dilewati.`
                          : ""}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" onClick={salinPustaka}>
                        Salin daftar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={unduhPustaka}>
                        Unduh .md
                      </Button>
                    </div>
                    <p className="mt-1.5 text-xs text-brand-muted">
                      “Ditandai dikutip” dikelola kamu, bukan hasil pemeriksaan naskah. Format pakai
                      gaya yang dipilih; aturan kampus/jurnal bisa menambah ketentuan.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </Panel>

        <Panel className="space-y-3 bg-white">
          <h2 className="font-display text-lg font-bold">6. Cadangan (ekspor/impor)</h2>
          <p className="text-xs font-medium text-brand-muted">
            Unduh cadangan JSON bila data penting — favorit &amp; koleksi hanya di browser ini.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={eksporCadangan}>
              Unduh cadangan JSON
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              Pulihkan dari JSON…
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Pilih file cadangan JSON"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) imporCadangan(f);
              }}
            />
          </div>
          {pesanImpor ? (
            <p role="status" className="text-xs font-bold">
              {pesanImpor}
            </p>
          ) : null}
        </Panel>

        <Panel className="bg-brand-panel">
          <h2 className="font-display text-lg font-bold">
             7. Direktori Pencarian Literatur
          </h2>
          <p className="mt-1 text-xs font-medium">
            Semua dikelompokkan per fungsi dan dibuka sebagai tautan keluar. Perlu dibedakan:
            pencarian, metadata, abstrak, dan teks lengkap punya akses berbeda — teks penuh
            tetap bergantung lisensi penerbit. OpenAlex adalah sumber data pencarian di
            halaman ini; yang lain belum terintegrasi API.
          </p>
          <div className="mt-3 space-y-4">
            {[...new Set(DIRS.map((d) => d.grup))].map((grup) => (
              <div key={grup}>
                <p className="font-label text-xs font-bold uppercase text-brand-muted">
                  {grup}
                </p>
                <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {DIRS.filter((d) => d.grup === grup).map((d) => (
                    <a
                      key={d.name}
                      href={d.href}
                      target="_blank"
                      rel="noopener"
                      className="rounded-xl border-[3px] border-black bg-white p-3 shadow-[4px_4px_0px_#000000] transition-all hover:bg-brand-paper"
                    >
                      <p className="font-display text-base font-bold">{d.name}</p>
                      <p className="mt-0.5 font-body text-xs text-brand-muted">
                        {d.desc}
                      </p>
                      <p className="mt-2 font-label text-[11px] font-bold uppercase">
                        Tautan keluar — kebijakan layanan milik penyedia
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Toast msg={toast} />
    </ToolShell>
  );
}
