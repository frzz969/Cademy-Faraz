import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultProjRefs,
  emptyProjRefsStore,
  parseProjRefsStore,
  orphanProjectIds,
  linkRef,
  setDikutip,
  unlinkRef,
  refsForProject,
  refLinksFlat,
  applyMetaEdit,
  restoreMeta,
  statusMetadata,
  buildDaftarPustaka,
  type ProjRefsStore,
  type MetaFields,
} from "./proyek";
import { fmtAPA } from "./citation";

const artikel: MetaFields = {
  title: "Pengaruh AI pada Belajar",
  authors: ["Budi Santoso"],
  year: 2024,
  source: "Jurnal Uji",
  doi: "https://doi.org/10.1234/abc",
};

describe("proyek — relasi referensi", () => {
  it("linkRef idempoten: dua kali panggil = satu entri", () => {
    const s = emptyProjRefsStore();
    linkRef(s, "p1", "A1", ["bab1"]);
    linkRef(s, "p1", "A1", ["bab1"]);
    assert.equal(Object.keys(s.byProject["p1"].refs).length, 1);
  });

  it("satu artikel dipakai banyak proyek/bab tanpa duplikasi entitas", () => {
    const s = emptyProjRefsStore();
    linkRef(s, "p1", "A1", ["bab1", "bab2"]);
    linkRef(s, "p2", "A1", ["bab2"]);
    assert.deepEqual(
      Object.keys(s.byProject).map((k) => s.byProject[k].refs["A1"].sections),
      [["bab1", "bab2"], ["bab2"]],
    );
  });

  it("linkRef menolak id kosong (store tak berubah)", () => {
    const s = emptyProjRefsStore();
    const before = JSON.stringify(s);
    linkRef(s, "", "A1", ["bab1"]);
    linkRef(s, "p1", "", ["bab1"]);
    assert.equal(JSON.stringify(s), before);
  });

  it("setDikutip + unlinkRef", () => {
    const s = emptyProjRefsStore();
    linkRef(s, "p1", "A1", ["bab1"]);
    setDikutip(s, "p1", "A1", true);
    assert.equal(s.byProject["p1"].refs["A1"].dikutip, true);
    unlinkRef(s, "p1", "A1");
    assert.equal(Object.keys(s.byProject["p1"].refs).length, 0);
  });

  it("orphan DITANDAI, tidak diprune walau projectId tak dikenal", () => {
    const s = emptyProjRefsStore();
    linkRef(s, "p-hilang", "A1", ["bab1"]);
    const parsed = parseProjRefsStore(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(orphanProjectIds(parsed, ["p1", "p2"]), ["p-hilang"]);
    // data tetap ADA setelah parse (tanpa prune)
    assert.equal(parsed.byProject["p-hilang"].refs["A1"].sections[0], "bab1");
  });

  it("parseProjRefsStore toleran: rusak/parsial → default aman, tak crash", () => {
    assert.deepEqual(parseProjRefsStore(null).byProject, {});
    assert.deepEqual(parseProjRefsStore("bukan-objek").byProject, {});
    assert.deepEqual(parseProjRefsStore({ version: 2 }).byProject, {});
    const parsed = parseProjRefsStore({
      version: 1,
      byProject: { p1: { refs: { A1: { sections: ["bab1"], dikutip: true } } } },
    });
    assert.equal(parsed.byProject["p1"].refs["A1"].dikutip, true);
    assert.equal(parsed.byProject["p1"].sections.length, 6); // default sections
  });
});

describe("proyek — metadata snapshot immutable", () => {
  it("snapshot diambil sekali; koreksi kedua tak menimpa original", () => {
    const a1 = applyMetaEdit(artikel, { title: "Judul Koreksi 1" });
    assert.equal(a1.title, "Judul Koreksi 1");
    assert.equal(a1.original?.title, artikel.title);
    const a2 = applyMetaEdit(a1, { title: "Judul Koreksi 2", year: 2025 });
    assert.equal(a2.title, "Judul Koreksi 2");
    assert.equal(a2.original?.title, artikel.title); // masih snapshot pertama
    assert.equal(a2.original?.year, 2024);
    assert.equal(a2.diperbaiki, true);
  });

  it("restoreMeta kembali ke API asli; snapshot tetap disimpan", () => {
    const a1 = applyMetaEdit(artikel, { title: "Koreksi" });
    const r = restoreMeta(a1);
    assert.equal(r.title, artikel.title);
    assert.equal(r.diperbaiki, false);
    assert.equal(r.original?.title, artikel.title);
  });

  it("field di luar metadata (notes/tags) TIDAK tersentuh", () => {
    const denganNotes = { ...artikel, notes: "catatan pribadi", tags: ["x"] };
    const out = applyMetaEdit(denganNotes, { title: "Koreksi" });
    assert.equal(out.notes, "catatan pribadi");
    assert.deepEqual(out.tags, ["x"]);
  });

  it("statusMetadata: lengkap vs perlu diperiksa (field hilang terdaftar)", () => {
    assert.deepEqual(statusMetadata(artikel), { status: "lengkap", hilang: [] });
    const s = statusMetadata({ title: "", authors: [], year: null, source: "" });
    assert.equal(s.status, "perlu diperiksa");
    assert.deepEqual(s.hilang, ["judul", "penulis", "tahun", "sumber"]);
  });
});

describe("proyek — daftar pustaka", () => {
  const articles: Record<string, MetaFields> = {
    A1: artikel,
    A2: { title: "Tanpa Penulis", authors: [], year: 2020, source: "" },
  };

  it("onlyCited: hanya yang ditandai pengguna", () => {
    const s = emptyProjRefsStore();
    linkRef(s, "p1", "A1", ["bab1"], true);
    linkRef(s, "p1", "A2", ["bab1"]);
    const d = buildDaftarPustaka(
      refLinksFlat(s, "p1"),
      articles,
      "APA 7",
      true,
      fmtAPA,
    );
    assert.equal(d.items.length, 1);
    assert.equal(d.items[0].articleId, "A1");
  });

  it("semua referensi: A2 tetap tampil dengan peringatan metadata", () => {
    const s = emptyProjRefsStore();
    linkRef(s, "p1", "A1", ["bab1"], true);
    linkRef(s, "p1", "A2", ["bab1"]);
    const d = buildDaftarPustaka(
      refLinksFlat(s, "p1"),
      articles,
      "APA 7",
      false,
      fmtAPA,
    );
    assert.equal(d.items.length, 2);
    assert.equal(d.perluDiperiksa, 1);
    assert.deepEqual(d.items[1].metaHilang, ["penulis", "sumber"]);
  });

  it("artikel hilang dari favorit DILEWATI + dicatat (tidak dikarang)", () => {
    const s = emptyProjRefsStore();
    linkRef(s, "p1", "A1", ["bab1"], true);
    linkRef(s, "p1", "A-HILANG", ["bab1"], true);
    const d = buildDaftarPustaka(
      refLinksFlat(s, "p1"),
      articles,
      "APA 7",
      false,
      fmtAPA,
    );
    assert.deepEqual(d.hilang, ["A-HILANG"]);
    assert.equal(d.items.length, 1);
  });

  it("formatter dipakai dengan gaya yang dipilih (metadata diteruskan)", () => {
    const s = emptyProjRefsStore();
    linkRef(s, "p1", "A1", ["bab1"], true);
    const d = buildDaftarPustaka(
      refLinksFlat(s, "p1"),
      articles,
      "APA 7",
      true,
      fmtAPA,
    );
    // APA 7 memakai sentence case — "Pengaruh ai pada belajar" (bukan Title Case).
    assert.match(d.items[0].sitasi, /Santoso, B\. \(2024\)/);
    assert.match(d.items[0].sitasi, /Pengaruh ai pada belajar/);
    assert.match(d.items[0].sitasi, /https:\/\/doi\.org\/10\.1234\/abc/);
  });

  it("store bisa dibawa lewat JSON round-trip tanpa kehilangan relasi", () => {
    const s: ProjRefsStore = emptyProjRefsStore();
    linkRef(s, "p1", "A1", ["bab1", "bab2"], true);
    const parsed = parseProjRefsStore(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(parsed.byProject["p1"].refs["A1"], {
      sections: ["bab1", "bab2"],
      dikutip: true,
    });
    assert.equal(parsed.byProject["p1"].gayaSitasi, "APA 7");
    assert.equal(defaultProjRefs().sections[5].id, "lampiran");
  });
});
