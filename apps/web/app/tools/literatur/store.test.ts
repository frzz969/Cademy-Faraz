import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  freshFavs,
  toArticle,
  dedupKeyOf,
  dedupArticles,
  findDupId,
  isFavsStore,
  sanitizeMatrix,
  makeBackup,
  parseBackup,
  searchCsvRow,
  matrixCsvRow,
  MATRIX_CSV_HEADER,
  buildMatrixMarkdown,
  type Article,
} from "./store";

const artikelPenuh: Article = {
  id: "https://openalex.org/W1",
  title: "Judul Uji",
  authors: ["Budi Santoso"],
  year: 2024,
  source: "Jurnal Uji",
  doi: "https://doi.org/10.1234/abc",
  oaUrl: "https://example.com/oa",
  citedBy: 7,
};

describe("literatur store", () => {
  it("(a) toArticle: tanpa id → null", () => {
    assert.equal(toArticle({}), null);
    // @ts-expect-error uji runtime: id bukan string
    assert.equal(toArticle({ id: 123 }), null);
  });

  it("(a) toArticle: field hilang → kosong (tidak dikarang)", () => {
    const a = toArticle({ id: "https://openalex.org/W9" });
    assert.ok(a);
    assert.equal(a!.title, "");
    assert.deepEqual(a!.authors, []);
    assert.equal(a!.year, null);
    assert.equal(a!.source, "");
    assert.equal(a!.doi, undefined);
    assert.equal(a!.oaUrl, undefined);
    assert.equal(a!.citedBy, undefined);
  });

  it("(b) dedupKeyOf case-insensitive + fallback id", () => {
    assert.equal(
      dedupKeyOf({ id: "x", doi: "10.1234/ABC" }),
      dedupKeyOf({ id: "y", doi: "10.1234/abc" }),
    );
    assert.equal(dedupKeyOf({ id: "https://openalex.org/W1" }), "https://openalex.org/W1");
  });

  it("(b/U-3) dedupKeyOf strip prefix DOI dulu", () => {
    assert.equal(
      dedupKeyOf({ id: "x", doi: "https://doi.org/10.1234/abc" }),
      dedupKeyOf({ id: "y", doi: "10.1234/abc" }),
    );
    assert.equal(
      dedupKeyOf({ id: "x", doi: "doi:10.1234/abc" }),
      dedupKeyOf({ id: "y", doi: "10.1234/ABC" }),
    );
  });

  it("(b) dedupArticles pertahankan pertama", () => {
    const kedua: Article = { ...artikelPenuh, title: "Judul Lain", id: "https://openalex.org/W2" };
    const out = dedupArticles([artikelPenuh, kedua]);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, artikelPenuh.id);
  });

  it("(b) findDupId lintas id (DOI sama, id beda)", () => {
    const favs = freshFavs();
    favs.articles[artikelPenuh.id] = artikelPenuh;
    const pendatang: Article = { ...artikelPenuh, id: "https://openalex.org/W99" };
    assert.equal(findDupId(favs, pendatang), artikelPenuh.id);
    assert.equal(
      findDupId(favs, { ...artikelPenuh, id: "baru", doi: "10.9999/lain" }),
      null,
    );
  });

  it("(c) isFavsStore tolak bentuk salah", () => {
    assert.equal(isFavsStore(freshFavs()), true);
    for (const rusak of [
      null,
      {},
      { articles: {}, collections: [] },
      { ...freshFavs(), articles: { a: { id: "", title: 1 } } },
      { ...freshFavs(), readingStatus: { x: "ngawur" } },
      { ...freshFavs(), tags: { x: "bukan-array" } },
      { ...freshFavs(), collections: [{ id: 1 }] },
    ]) {
      assert.equal(isFavsStore(rusak), false);
    }
  });

  it("(d) sanitizeMatrix: baris rusak dibuang, sel rusak → \"\"", () => {
    const out = sanitizeMatrix({
      bagus: { tujuan: "t", metode: 123, sampel: null, temuan: "x", keterbatasan: undefined },
      rusak: "bukan-objek",
    });
    assert.equal("rusak" in out, false);
    assert.equal(out["bagus"].tujuan, "t");
    assert.equal(out["bagus"].metode, "");
    assert.equal(out["bagus"].sampel, "");
    assert.equal(out["bagus"].temuan, "x");
    assert.equal(out["bagus"].keterbatasan, "");
    assert.deepEqual(sanitizeMatrix(null), {});
    assert.deepEqual(sanitizeMatrix([]), {});
  });

  it("(e) parseBackup tolak bundel rusak", () => {
    assert.equal(parseBackup(null).ok, false);
    assert.equal(parseBackup([]).ok, false);
    assert.equal(
      parseBackup({ ...makeBackup(freshFavs(), {}), app: "salah" }).ok,
      false,
    );
    // Versi 3 = tidak dikenal (v1 lama dan v2 saat ini sama-sama diterima).
    assert.equal(
      parseBackup({ ...makeBackup(freshFavs(), {}), version: 3 }).ok,
      false,
    );
    assert.equal(
      parseBackup({ ...makeBackup(freshFavs(), {}), favs: { rusak: true } }).ok,
      false,
    );
    assert.equal(
      parseBackup({ ...makeBackup(freshFavs(), {}), matrix: "rusak" }).ok,
      false,
    );
  });

  it("(e2) backup LAMA v1 (tanpa projRefs) tetap diimpor — projRefs default aman", () => {
    const favs = freshFavs();
    favs.articles[artikelPenuh.id] = artikelPenuh;
    const v1 = {
      app: "cademy-literatur-backup",
      version: 1,
      exportedAt: "2026-10-09T00:00:00.000Z",
      favs,
      matrix: {},
    };
    const hasil = parseBackup(v1);
    assert.equal(hasil.ok, true);
    if (hasil.ok) {
      assert.deepEqual(hasil.favs.articles[artikelPenuh.id], artikelPenuh);
      assert.deepEqual(hasil.projRefs.byProject, {}); // default, bukan gagal
    }
  });

  it("(e3) backup v2: projRefs rusak TOLERAN (tidak menggagalkan impor favs)", () => {
    const favs = freshFavs();
    favs.articles[artikelPenuh.id] = artikelPenuh;
    const v2 = { ...makeBackup(favs, {}), projRefs: "bukan-objek" };
    const hasil = parseBackup(v2);
    assert.equal(hasil.ok, true);
    if (hasil.ok) {
      assert.equal(Object.keys(hasil.favs.articles).length, 1);
      assert.deepEqual(hasil.projRefs.byProject, {});
    }
  });

  it("(e4) artikel bersnapshot metadata (original/diperbaiki) tetap lolos guard", () => {
    const favs = freshFavs();
    favs.articles[artikelPenuh.id] = {
      ...artikelPenuh,
      title: "Judul Koreksi",
      original: {
        title: artikelPenuh.title,
        authors: [...artikelPenuh.authors],
        year: artikelPenuh.year,
        source: artikelPenuh.source,
        doi: artikelPenuh.doi,
      },
      diperbaiki: true,
    };
    const hasil = parseBackup(makeBackup(favs, {}));
    assert.equal(hasil.ok, true);
    if (hasil.ok) {
      assert.equal(hasil.favs.articles[artikelPenuh.id].diperbaiki, true);
      assert.equal(
        hasil.favs.articles[artikelPenuh.id].original?.title,
        artikelPenuh.title,
      );
    }
  });

  it("(e) parseBackup terima bundel valid favs+matrix", () => {
    const favs = freshFavs();
    favs.articles[artikelPenuh.id] = artikelPenuh;
    const matrix = { [artikelPenuh.id]: { tujuan: "t", metode: "m", sampel: "s", variabel: "v", temuan: "x", keterbatasan: "k", relevansi: "r" } };
    const hasil = parseBackup(makeBackup(favs, matrix));
    assert.equal(hasil.ok, true);
    if (hasil.ok) {
      assert.deepEqual(hasil.favs.articles[artikelPenuh.id], artikelPenuh);
      assert.equal(hasil.matrix[artikelPenuh.id].tujuan, "t");
    }
  });

  it("(f) searchCsvRow/matrixCsvRow kosong=kosong", () => {
    const kosong: Article = { id: "W0", title: "", authors: [], year: null, source: "" };
    assert.deepEqual(searchCsvRow(kosong), ["", "", "", "", "", "", ""]);
    assert.deepEqual(
      matrixCsvRow(kosong, undefined, ""),
      ["", "", "", "", "", "", "", "", "", "", "", "", ""],
    );
  });

  it("(f2) matrixCsvRow memuat kolom variabel & relevansi", () => {
    const a: Article = {
      id: "W1", title: "J", authors: ["A"], year: 2024, source: "S",
    };
    const row = {
      tujuan: "t", metode: "m", sampel: "s", variabel: "v",
      temuan: "x", keterbatasan: "k", relevansi: "r",
    };
    const baris = matrixCsvRow(a, row, "n");
    assert.equal(baris.length, MATRIX_CSV_HEADER.length);
    assert.equal(baris[8], "v");
    assert.equal(baris[11], "r");
    assert.equal(baris[12], "n");
  });

  it("(f3) buildMatrixMarkdown: metadata apa adanya + kosong = —", () => {
    const a: Article = {
      id: "W2", title: "Judul", authors: ["A", "B"], year: 2023, source: "Jurnal", doi: "10.1/x",
    };
    const md = buildMatrixMarkdown("Koleksi A", [
      { article: a, row: undefined, catatan: "" },
    ]);
    assert.match(md, /## Judul/);
    assert.match(md, /Penulis: A; B/);
    assert.match(md, /Tahun: 2023/);
    assert.match(md, /Relevansi dengan skripsi: —/);
    assert.match(md, /Variabel: —/);
    assert.doesNotMatch(md, /undefined/);
  });
});
