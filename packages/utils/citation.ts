// Util sitasi murni — tanpa React/browser/network.
// Diekstrak dari apps/web/app/tools/citation/view.tsx.
//
// PERUBAHAN DISENGAJA dari perilaku lama (dicatat):
// 1. normDoiUrl: dulu hanya trim. Kini normalisasi "doi.org/..." + hapus spasi
//    menjadi URL bersih "https://doi.org/..."; DOI mentah "10.xxxx/..." juga
//    dinormalisasi ke URL. (Lama: "doi.org/10.x/y" atau "10.x/y" lolos mentah.)
// 2. parseAuthors: dulu pecah koma via /,(?=\s*[A-ZÀ-Ž])/ sehingga
//    "Sukarno, Hatta" pecah jadi dua penulis. Kini hanya split ";" / newline;
//    koma dianggap format "Last, First" satu penulis. lastName/firstNames/
//    initials disesuaikan agar memahami format koma tersebut.
// 3. fmtChicago (Jurnal): dulu pakai placeholder "vol=X, pp=-" saat data kosong.
//    Kini bagian volume/halaman dihilangkan bila data kosong.
// 4. fmtHarvard/fmtBibtex: dulu memanggil new Date() di dalam (tidak murni /
//    tidak deterministik). Kini tanggal akses jadi PARAMETER opsional
//    `diakses`; bila kosong, bagian "(Diakses: ...)" / note dihilangkan.
// 5. doiTail diekspor dan dipakai fmtIEEE/fmtHarvard/fmtBibtex (bukan
//    normDoiUrl mentah) agar teks bebas seperti "Gramedia" tak ditempel;
//    isDoiLike dilonggarkan ke pola /10\.\d{4,}\// di mana saja.

export type JenisSumber = "Jurnal" | "Buku" | "Skripsi/Tesis" | "Web";

/** Key jembatan literatur → sitasi (dibaca sekali lalu dihapus). Nilai tetap agar data lama kompatibel. */
export const PREFILL_KEY = "cademy:cite-prefill-v1";

export interface CiteInput {
  judul: string;
  penulis: string;
  tahun: string;
  penerbit: string;
  identifier: string;
  jenis: JenisSumber;
  volume: string;
  issue: string;
  halaman: string;
  edisi: string;
  institusi: string;
  jenisKarya: string;
  situs: string;
}

/** True bila tahun kosong (opsional) atau tepat 4 digit numerik. */
export function isTahunValid(tahun: string): boolean {
  const t = tahun.trim();
  if (!t) return true;
  return /^\d{4}$/.test(t);
}

/**
 * Pecah daftar penulis HANYA pada ";" / baris baru.
 * CATATAN: daftar koma gaya lama ("Budi Santoso, Siti Aminah") SENGAJA
 * terbaca sebagai 1 penulis format "Last, First" — bukan dua penulis.
 * Minta pengguna memisahkan beberapa penulis dengan ";" (lihat placeholder
 * input "pisahkan dengan ;").
 */
export function parseAuthors(raw: string): string[] {
  return raw
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function lastName(full: string): string {
  const t = full.trim();
  if (!t) return full;
  const comma = t.indexOf(",");
  if (comma >= 0) return t.slice(0, comma).trim() || t;
  const parts = t.split(/\s+/);
  return parts[parts.length - 1] ?? full;
}

export function firstNames(full: string): string {
  const t = full.trim();
  if (!t) return "";
  const comma = t.indexOf(",");
  if (comma >= 0) return t.slice(comma + 1).trim();
  const parts = t.split(/\s+/);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join(" ");
}

export function initials(full: string): string {
  const t = full.trim();
  if (!t) return t;
  const comma = t.indexOf(",");
  if (comma >= 0) {
    const last = t.slice(0, comma).trim();
    const firsts = t
      .slice(comma + 1)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (firsts.length === 0) return last;
    const init = firsts.map((p) => `${p[0]?.toUpperCase()}.`).join(" ");
    return `${last}, ${init}`;
  }
  const parts = t.split(/\s+/);
  if (parts.length <= 1) return full;
  const last = parts[parts.length - 1];
  const init = parts
    .slice(0, -1)
    .map((p) => `${p[0]?.toUpperCase()}.`)
    .join(" ");
  return `${last}, ${init}`;
}

export function apaAuthors(authors: string[]): string {
  if (authors.length === 0) return "";
  const mapped = authors.map(initials);
  if (mapped.length === 1) return mapped[0];
  if (mapped.length === 2) return `${mapped[0]}, & ${mapped[1]}`;
  return `${mapped.slice(0, -1).join(", ")}, & ${mapped[mapped.length - 1]}`;
}

export function mlaAuthors(authors: string[]): string {
  if (authors.length === 0) return "";
  // Pakai helper sadar-koma (lastName/firstNames) — jangan String.replace,
  // yang menyisakan koma ganda untuk input "Last, First" ("Sukarno, Hatta").
  const firstLead = firstNames(authors[0]).trim();
  const lead = firstLead
    ? `${lastName(authors[0])}, ${firstLead}`
    : lastName(authors[0]);
  if (authors.length === 1) return lead;
  if (authors.length === 2) return `${lead}, and ${authors[1]}`;
  return `${lead}, et al`;
}

export function sentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  const lowered = t.toLowerCase();
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

export function ieeeAuthor(full: string): string {
  const t = full.trim();
  if (!t) return t;
  const comma = t.indexOf(",");
  if (comma >= 0) {
    // "Last, First Middle" -> "F. M. Last"
    const last = t.slice(0, comma).trim();
    const firsts = t
      .slice(comma + 1)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (firsts.length === 0) return last;
    const init = firsts.map((p) => `${p[0]?.toUpperCase()}.`).join(" ");
    return `${init} ${last}`;
  }
  const parts = t.split(/\s+/);
  if (parts.length <= 1) return t;
  const last = parts[parts.length - 1];
  const init = parts
    .slice(0, -1)
    .map((p) => `${p[0]?.toUpperCase()}.`)
    .join(" ");
  return `${init} ${last}`;
}

export function ieeeAuthors(authors: string[]): string {
  if (authors.length === 0) return "[Tanpa penulis]";
  return authors.map(ieeeAuthor).join(", ");
}

export function chicagoAuthors(authors: string[]): string {
  if (authors.length === 0) return "[Tanpa penulis]";
  if (authors.length === 1) return `${lastName(authors[0])}, ${firstNames(authors[0])}`.trim();
  if (authors.length === 2)
    return `${lastName(authors[0])}, ${firstNames(authors[0])}, dan ${firstNames(authors[1])} ${lastName(authors[1])}`
      .replace(/\s+/g, " ")
      .trim();
  return `${lastName(authors[0])}, ${firstNames(authors[0])}, et al.`.replace(/\s+/g, " ").trim();
}

export function apaName(authors: string[]): string {
  if (authors.length === 0) return "[Tanpa penulis]";
  return apaAuthors(authors);
}

export function mlaName(authors: string[]): string {
  if (authors.length === 0) return "[Tanpa penulis]";
  return mlaAuthors(authors);
}

export function normDoiUrl(id: string): string {
  const compact = id.trim().replace(/\s+/g, "");
  if (!compact) return "";
  if (/^https?:\/\//i.test(compact)) return compact;
  const m = compact.match(/10\.\d{4,}\/\S+/);
  if (m) {
    const doi = m[0].replace(/[).,;]+$/, "");
    return `https://doi.org/${doi}`;
  }
  return compact;
}

export function isDoiLike(s: string): boolean {
  const t = s.trim();
  return /10\.\d{4,}\//.test(t) || t.includes("doi.org/");
}

/**
 * URL DOI/HTTP yang layak ditempel di ekor sitasi — HANYA bila identifier
 * terlihat seperti DOI atau URL http(s). Teks bebas (mis. "Gramedia")
 * dikembalikan "" agar tak ditempel mentah ke sitasi.
 */
export function doiTail(identifier: string): string {
  const t = identifier.trim();
  if (!t) return "";
  if (!isDoiLike(t) && !/^https?:\/\//i.test(t)) return "";
  return normDoiUrl(t);
}

export function extractDoi(s: string): string {
  const t = s.trim();
  const m = t.match(/10\.\d{4,}\/\S+/);
  return m ? m[0].replace(/[).,;]+$/, "") : t;
}

export function fmtAPA(d: CiteInput, authors: string[]): string {
  const year = d.tahun.trim() || "t.t.";
  const title = d.judul.trim() ? sentenceCase(d.judul) : "[Tanpa judul]";
  const doi = doiTail(d.identifier);
  if (d.jenis === "Jurnal") {
    const jurnal = d.penerbit.trim() || "[Nama jurnal]";
    let volPart = "";
    if (d.volume.trim()) volPart = `, ${d.volume.trim()}${d.issue.trim() ? `(${d.issue.trim()})` : ""}`;
    else if (d.issue.trim()) volPart = ` (${d.issue.trim()})`;
    const pages = d.halaman.trim() ? `, ${d.halaman.trim()}` : "";
    const tail = doi ? ` ${doi}` : "";
    return `${apaName(authors)} (${year}). ${title}. ${jurnal}${volPart}${pages}.${tail}`.replace(/\s+/g, " ").trim();
  }
  if (d.jenis === "Buku") {
    const ed = d.edisi.trim() ? ` (${d.edisi.trim()}).` : "";
    const pub = d.penerbit.trim() ? ` ${d.penerbit.trim()}.` : "";
    return `${apaName(authors)} (${year}).${ed} ${title}.${pub}`.replace(/\s+/g, " ").trim();
  }
  if (d.jenis === "Skripsi/Tesis") {
    const karya = d.jenisKarya.trim() || "Skripsi";
    const inst = d.institusi.trim() || "[Nama institusi]";
    return `${apaName(authors)} (${year}). ${title} [${karya} tidak diterbitkan, ${inst}].`;
  }
  const situs = d.situs.trim() || "[Nama situs]";
  const tail = doi ? ` ${doi}` : "";
  return `${apaName(authors)} (${year}). ${title}. ${situs}.${tail}`.replace(/\s+/g, " ").trim();
}

export function fmtMLA(d: CiteInput, authors: string[]): string {
  const title = d.judul.trim() || "[Tanpa judul]";
  const year = d.tahun.trim();
  const doi = doiTail(d.identifier);
  if (d.jenis === "Jurnal") {
    const jurnal = d.penerbit.trim() || "[Nama jurnal]";
    const vol = d.volume.trim() ? `, vol. ${d.volume.trim()}` : "";
    const no = d.issue.trim() ? `, no. ${d.issue.trim()}` : "";
    const yr = year ? `, ${year}` : "";
    const pp = d.halaman.trim() ? `, pp. ${d.halaman.trim()}` : "";
    const tail = doi ? ` ${doi}.` : "";
    return `${mlaName(authors)}. "${title}." ${jurnal}${vol}${no}${yr}${pp}.${tail}`.replace(/\s+/g, " ").trim();
  }
  if (d.jenis === "Buku") {
    const pub = d.penerbit.trim() ? ` ${d.penerbit.trim()},` : "";
    const yr = year ? ` ${year}.` : "";
    return `${mlaName(authors)}. ${title}.${pub}${yr}`.replace(/\s+/g, " ").trim();
  }
  if (d.jenis === "Skripsi/Tesis") {
    const karya = d.jenisKarya.trim() || "Skripsi";
    const inst = d.institusi.trim() || "[Nama institusi]";
    const yr = year ? ` ${year}.` : "";
    return `${mlaName(authors)}. "${title}."${yr} ${inst}, ${karya}.`.replace(/\s+/g, " ").trim();
  }
  const situs = d.situs.trim() || "[Nama situs]";
  const yr = year ? `, ${year}` : "";
  const tail = doi ? `, ${doi}.` : ".";
  return `${mlaName(authors)}. "${title}." ${situs}${yr}${tail}`.replace(/\s+/g, " ").trim();
}

export function fmtChicago(d: CiteInput, authors: string[]): string {
  const year = d.tahun.trim() || "t.t.";
  const title = d.judul.trim() || "[Tanpa judul]";
  const doi = doiTail(d.identifier);
  const a = chicagoAuthors(authors);
  if (d.jenis === "Jurnal") {
    const jurnal = d.penerbit.trim() || "[Nama jurnal]";
    const vol = d.volume.trim();
    const no = d.issue.trim();
    const pp = d.halaman.trim();
    // PERUBAHAN: tanpa placeholder "X" / "-"; bagian kosong dihilangkan.
    const volPart = vol ? ` ${vol}${no ? ` (${no})` : ""}` : no ? ` ${no}` : "";
    const ppPart = pp ? `: ${pp}` : "";
    const tail = doi ? ` ${doi}.` : "";
    return `${a}. ${year}. "${title}." ${jurnal}${volPart}${ppPart}.${tail}`.replace(/\s+/g, " ").trim();
  }
  if (d.jenis === "Buku") {
    const pub = d.penerbit.trim() || "[Penerbit]";
    return `${a}. ${year}. ${title}. ${pub}.`;
  }
  if (d.jenis === "Skripsi/Tesis") {
    const karya = d.jenisKarya.trim() || "Skripsi";
    const inst = d.institusi.trim() || "[Nama institusi]";
    return `${a}. ${year}. "${title}." ${karya}, ${inst}.`;
  }
  const situs = d.situs.trim() || "[Nama situs]";
  const tail = doi ? ` ${doi}.` : "";
  return `${a}. ${year}. "${title}." ${situs}.${tail}`.replace(/\s+/g, " ").trim();
}

export function fmtIEEE(d: CiteInput, authors: string[]): string {
  const a = ieeeAuthors(authors);
  const title = d.judul.trim() || "[Tanpa judul]";
  const year = d.tahun.trim() || "t.t.";
  const doi = doiTail(d.identifier);
  if (d.jenis === "Jurnal") {
    const jurnal = d.penerbit.trim() || "[Nama jurnal]";
    const vol = d.volume.trim() ? `, vol. ${d.volume.trim()}` : "";
    const no = d.issue.trim() ? `, no. ${d.issue.trim()}` : "";
    const pp = d.halaman.trim() ? `, pp. ${d.halaman.trim()}` : "";
    return `[1] ${a}, "${title}," ${jurnal}${vol}${no}${pp}, ${year}.`;
  }
  if (d.jenis === "Buku") {
    const pub = d.penerbit.trim() || "[Penerbit]";
    return `[1] ${a}, ${title}. ${pub}, ${year}.`;
  }
  if (d.jenis === "Skripsi/Tesis") {
    const karya = d.jenisKarya.trim() || "Skripsi";
    const inst = d.institusi.trim() || "[Nama institusi]";
    return `[1] ${a}, "${title}," ${karya}, ${inst}, ${year}.`;
  }
  const situs = d.situs.trim() || "[Nama situs]";
  return `[1] ${a}, "${title}," ${situs}, ${year}. [Online]. Tersedia: ${doi || "-"}`;
}

export function fmtHarvard(d: CiteInput, authors: string[], diakses?: string): string {
  const a =
    authors.length === 0
      ? "[Tanpa penulis]"
      : authors.length > 3
        ? `${lastName(authors[0])} et al.`
        : authors.map(lastName).join(" dan ");
  const year = d.tahun.trim() || "t.t.";
  const title = d.judul.trim() || "[Tanpa judul]";
  const doi = doiTail(d.identifier) || "-";
  const akses = diakses ? ` (Diakses: ${diakses})` : "";
  if (d.jenis === "Jurnal") {
    const jurnal = d.penerbit.trim() || "[Nama jurnal]";
    const vol = d.volume.trim() ? ` ${d.volume.trim()}` : "";
    const no = d.issue.trim() ? `(${d.issue.trim()})` : "";
    const pp = d.halaman.trim() ? `, hlm. ${d.halaman.trim()}` : "";
    return `${a} (${year}) '${title}', ${jurnal}${vol}${no}${pp}. Tersedia di: ${doi}${akses}.`;
  }
  if (d.jenis === "Buku") {
    const pub = d.penerbit.trim() || "[Penerbit]";
    return `${a} (${year}) '${title}', ${pub}.`;
  }
  if (d.jenis === "Skripsi/Tesis") {
    const karya = d.jenisKarya.trim() || "Skripsi";
    const inst = d.institusi.trim() || "[Nama institusi]";
    return `${a} (${year}) '${title}', ${karya}, ${inst}.`;
  }
  const situs = d.situs.trim() || "[Nama situs]";
  return `${a} (${year}) '${title}', ${situs}. Tersedia di: ${doi}${akses}.`;
}

export function bibKey(authors: string[], year: string): string {
  return `${lastName(authors[0] || "anon").toLowerCase().replace(/[^a-z]/g, "") || "anon"}${year.trim() || "nd"}`;
}

export function fmtBibtex(d: CiteInput, authors: string[], diakses?: string): string {
  const key = bibKey(authors, d.tahun);
  const au = authors.join(" and ");
  const year = d.tahun.trim();
  const title = d.judul.trim();
  const doi = doiTail(d.identifier);
  if (d.jenis === "Jurnal") {
    const lines = [
      `@article{${key},`,
      au ? `  author = {${au}},` : undefined,
      title ? `  title = {${title}},` : undefined,
      d.penerbit.trim() ? `  journal = {${d.penerbit.trim()}},` : undefined,
      year ? `  year = {${year}},` : undefined,
      d.volume.trim() ? `  volume = {${d.volume.trim()}},` : undefined,
      d.issue.trim() ? `  number = {${d.issue.trim()}},` : undefined,
      d.halaman.trim() ? `  pages = {${d.halaman.trim()}},` : undefined,
      doi ? `  doi = {${doi}}` : undefined,
      `}`,
    ].filter(Boolean);
    return lines.join("\n");
  }
  if (d.jenis === "Buku") {
    const lines = [
      `@book{${key},`,
      au ? `  author = {${au}},` : undefined,
      title ? `  title = {${title}},` : undefined,
      d.penerbit.trim() ? `  publisher = {${d.penerbit.trim()}},` : undefined,
      year ? `  year = {${year}},` : undefined,
      d.edisi.trim() ? `  edition = {${d.edisi.trim()}}` : undefined,
      `}`,
    ].filter(Boolean);
    return lines.join("\n");
  }
  if (d.jenis === "Skripsi/Tesis") {
    const lines = [
      `@mastersthesis{${key},`,
      au ? `  author = {${au}},` : undefined,
      title ? `  title = {${title}},` : undefined,
      d.institusi.trim() ? `  school = {${d.institusi.trim()}},` : undefined,
      year ? `  year = {${year}}` : undefined,
      `}`,
    ].filter(Boolean);
    return lines.join("\n");
  }
  const lines = [
    `@misc{${key},`,
    au ? `  author = {${au}},` : undefined,
    title ? `  title = {${title}},` : undefined,
    year ? `  year = {${year}},` : undefined,
    doi ? `  url = {${doi}},` : undefined,
    diakses ? `  note = {Diakses: ${diakses}}` : undefined,
    `}`,
  ].filter(Boolean);
  return lines.join("\n");
}
