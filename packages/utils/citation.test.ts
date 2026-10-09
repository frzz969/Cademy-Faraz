import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseAuthors,
  lastName,
  firstNames,
  initials,
  sentenceCase,
  apaAuthors,
  mlaAuthors,
  ieeeAuthors,
  chicagoAuthors,
  fmtAPA,
  fmtMLA,
  fmtChicago,
  fmtIEEE,
  fmtHarvard,
  fmtBibtex,
  bibKey,
  normDoiUrl,
  isDoiLike,
  extractDoi,
  isTahunValid,
  type CiteInput,
} from "./citation.ts";

const base: CiteInput = {
  judul: "Pengaruh AI pada pembelajaran",
  penulis: "Budi Santoso; Siti Aminah",
  tahun: "2024",
  penerbit: "Jurnal Pendidikan Indonesia",
  identifier: "",
  jenis: "Jurnal",
  volume: "10",
  issue: "2",
  halaman: "100-115",
  edisi: "",
  institusi: "",
  jenisKarya: "Skripsi",
  situs: "",
};

describe("citation utils (smoke + fix P1)", () => {
  it("smoke: parseAuthors dasar", () => {
    assert.deepEqual(parseAuthors("Budi Santoso; Siti Aminah"), ["Budi Santoso", "Siti Aminah"]);
  });

  it("FIX: parseAuthors jangan pecah 'Sukarno, Hatta'", () => {
    // Perilaku lama (salah): pecah koma -> ["Sukarno", "Hatta"].
    // Perilaku baru (benar): koma = format "Last, First" satu penulis.
    assert.deepEqual(parseAuthors("Sukarno, Hatta"), ["Sukarno, Hatta"]);
    assert.equal(lastName("Sukarno, Hatta"), "Sukarno");
    assert.equal(firstNames("Sukarno, Hatta"), "Hatta");
  });

  it("FIX: normDoiUrl normalisasi doi.org + spasi", () => {
    assert.equal(normDoiUrl("  doi.org/10.1234/abc  "), "https://doi.org/10.1234/abc");
    assert.equal(normDoiUrl("10.1234/abc"), "https://doi.org/10.1234/abc");
    assert.equal(normDoiUrl("https://doi.org/10.1234/abc"), "https://doi.org/10.1234/abc");
    assert.equal(normDoiUrl(""), "");
  });

  it("FIX: Chicago tanpa placeholder vol=X pp=-", () => {
    const d = { ...base, volume: "", issue: "", halaman: "" };
    const out = fmtChicago(d, ["Budi Santoso"]);
    assert.ok(!out.includes(" X"), `masih ada placeholder X: ${out}`);
    assert.ok(!out.includes(": -"), `masih ada placeholder -: ${out}`);
    assert.ok(out.includes("Jurnal Pendidikan Indonesia"));
  });

  it("FIX: Harvard/BibTeX tanggal jadi parameter deterministik", () => {
    const a = fmtHarvard(base, ["Budi Santoso"], "01/01/2024");
    const b = fmtHarvard(base, ["Budi Santoso"], "02/02/2025");
    assert.ok(a.includes("01/01/2024") && !a.includes("02/02/2025"));
    assert.ok(b.includes("02/02/2025"));
    const c = fmtHarvard(base, ["Budi Santoso"]);
    assert.ok(!c.includes("Diakses:"));
    const bib = fmtBibtex({ ...base, jenis: "Web", situs: "Kompas.com" }, ["Budi Santoso"], "01/01/2024");
    assert.ok(bib.includes("Diakses: 01/01/2024"));
    const bib2 = fmtBibtex({ ...base, jenis: "Web", situs: "Kompas.com" }, ["Budi Santoso"]);
    assert.ok(!bib2.includes("Diakses:"));
  });

  it("FIX: mlaAuthors 'Sukarno, Hatta' tepat satu koma", () => {
    const out = mlaAuthors(["Sukarno, Hatta"]);
    assert.equal(out, "Sukarno, Hatta");
    assert.equal(out.split(",").length - 1, 1);
  });

  it("isTahunValid menolak teks bebas", () => {
    assert.equal(isTahunValid("2024"), true);
    assert.equal(isTahunValid("abcd"), false);
    assert.equal(isTahunValid("24"), false);
    assert.equal(isTahunValid(""), true);
  });

  it("Gramedia (teks bebas) tidak ditempel di APA/MLA/Chicago", () => {
    const buku: CiteInput = {
      ...base,
      jenis: "Buku",
      penerbit: "Gramedia",
      identifier: "Gramedia",
    };
    const apa = fmtAPA(buku, ["Budi Santoso"]);
    assert.ok(!/Gramedia.*Gramedia/.test(apa), `Gramedia ganda di APA: ${apa}`);
    const mla = fmtMLA(buku, ["Budi Santoso"]);
    assert.ok(!/Gramedia.*Gramedia/.test(mla), `Gramedia ganda di MLA: ${mla}`);
    const chicago = fmtChicago(buku, ["Budi Santoso"]);
    assert.ok(!/Gramedia.*Gramedia/.test(chicago), `Gramedia ganda di Chicago: ${chicago}`);
  });

  it("formatter utama tetap jalan", () => {
    const au = ["Budi Santoso", "Siti Aminah"];
    assert.ok(fmtAPA(base, au).includes("2024"));
    assert.ok(fmtMLA(base, au).includes("Jurnal Pendidikan Indonesia"));
    assert.ok(fmtIEEE(base, au).startsWith("[1]"));
    assert.ok(fmtHarvard(base, au, "x").includes("Tersedia di:"));
    assert.ok(fmtBibtex(base, au).includes("@article"));
    assert.ok(bibKey(au, "2024").length > 0);
    assert.equal(isDoiLike("10.1234/abc"), true);
    assert.equal(extractDoi("lihat 10.1234/abc."), "10.1234/abc");
    assert.equal(sentenceCase("HELLO WORLD"), "Hello world");
    assert.ok(apaAuthors(au).includes("&"));
    assert.ok(mlaAuthors(au).length > 0);
    assert.ok(ieeeAuthors(au).length > 0);
    assert.ok(chicagoAuthors(au).length > 0);
    assert.equal(initials("Budi Santoso"), "Santoso, B.");
  });
});
