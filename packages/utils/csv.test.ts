import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CSV_BOM, csvCell, buildCsv, buildCsvWithBom } from "./csv.ts";
import { doiTail, isDoiLike, fmtIEEE, fmtHarvard, fmtBibtex, type CiteInput } from "./citation.ts";

describe("csv utils", () => {
  it("sel kosong: null/undefined/string kosong jadi sel kosong", () => {
    assert.equal(csvCell(null), "");
    assert.equal(csvCell(undefined), "");
    assert.equal(csvCell(""), "");
    assert.equal(buildCsv(["a", "b"], [["x", null]]), "a,b\r\nx,");
  });

  it("escaping kutip: kutip digandakan + dibungkus", () => {
    assert.equal(csvCell('kata "penting"'), '"kata ""penting"""');
  });

  it("escaping koma: sel dibungkus kutip", () => {
    assert.equal(csvCell("Sukarno, Hatta"), '"Sukarno, Hatta"');
  });

  it("escaping newline (\\n dan \\r\\n): sel dibungkus kutip", () => {
    assert.equal(csvCell("baris1\nbaris2"), '"baris1\nbaris2"');
    assert.equal(csvCell("baris1\r\nbaris2"), '"baris1\r\nbaris2"');
  });

  it("header konsisten sebagai baris pertama", () => {
    const out = buildCsv(["judul", "tahun"], [["A", 2024]]);
    const lines = out.split("\r\n");
    assert.equal(lines[0], "judul,tahun");
    assert.equal(lines[1], "A,2024");
  });

  it("BOM UTF-8 di depan untuk unduhan Excel", () => {
    const out = buildCsvWithBom(["judul"], [["bélajar"]]);
    assert.ok(out.startsWith(CSV_BOM), "tanpa BOM di depan");
    assert.ok(out.includes("bélajar"));
  });

  it("baris dipisah CRLF", () => {
    const out = buildCsv(["h"], [["a"], ["b"]]);
    assert.equal(out, "h\r\na\r\nb");
  });
});

describe("residu gate 1: doiTail + isDoiLike", () => {
  const buku: CiteInput = {
    judul: "Judul Buku",
    penulis: "Budi Santoso",
    tahun: "2024",
    penerbit: "Gramedia",
    identifier: "Gramedia",
    jenis: "Buku",
    volume: "",
    issue: "",
    halaman: "",
    edisi: "",
    institusi: "",
    jenisKarya: "Skripsi",
    situs: "",
  };

  it('"Gramedia" tidak ditempel ke ekor sitasi', () => {
    assert.equal(doiTail("Gramedia"), "");
    assert.ok(!fmtIEEE(buku, ["Budi Santoso"]).includes("GramediaGramedia"));
    const ieee = fmtIEEE(buku, ["Budi Santoso"]);
    assert.ok(!/Gramedia.*Gramedia/.test(ieee), `Gramedia ganda di IEEE: ${ieee}`);
    const web = { ...buku, jenis: "Web" as const, situs: "Contoh" };
    const harvard = fmtHarvard(web, ["Budi Santoso"], "01/01/2024");
    assert.ok(!harvard.includes("Gramedia"), `Gramedia lolos di Harvard: ${harvard}`);
    const bib = fmtBibtex(web, ["Budi Santoso"], "01/01/2024");
    assert.ok(!bib.includes("Gramedia"), `Gramedia lolos di BibTeX: ${bib}`);
  });

  it("doiTail tetap meloloskan DOI/URL asli", () => {
    assert.equal(doiTail("10.1234/abc"), "https://doi.org/10.1234/abc");
    assert.equal(doiTail("https://example.com/x"), "https://example.com/x");
    assert.equal(doiTail(""), "");
  });

  it("isDoiLike longgar: pola 10.xxxx/ di mana saja", () => {
    assert.equal(isDoiLike("10.1234/abc"), true);
    assert.equal(isDoiLike("lihat 10.1234/abc di sini"), true);
    assert.equal(isDoiLike("https://doi.org/10.1234/abc"), true);
    assert.equal(isDoiLike("Gramedia"), false);
    assert.equal(isDoiLike(""), false);
  });
});
