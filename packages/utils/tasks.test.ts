import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cariLintasTugas,
  progresFase,
  progresLangkah,
  progresRoadmap,
  type EntriCari,
} from "./tasks";

const A: EntriCari = {
  id: "a",
  judul: "Revisi Bab 2",
  catatan: "catatan penguji",
  sumber: "Roadmap",
  status: "todo",
  prioritas: "tinggi",
  dueDate: "2026-10-01",
};
const B: EntriCari = {
  id: "b",
  judul: "Bimbingan SPSS",
  catatan: "",
  sumber: "Jadwal",
  status: "done",
  prioritas: "sedang",
  dueDate: "2026-10-11",
};
const C: EntriCari = {
  id: "c",
  judul: "Arsip lama",
  catatan: "sudah lewat",
  sumber: "Planner",
  status: "todo",
  prioritas: "normal",
  arsip: true,
};
const SEMUA = [A, B, C];
const KINI = new Date(2026, 9, 11); // 11 Okt 2026

describe("cariLintasTugas (Tahap 2B)", () => {
  it("tanpa kriteria: semua non-arsip, urutan masuk dipertahankan", () => {
    assert.deepEqual(
      cariLintasTugas(SEMUA, {}, KINI).map((t) => t.id),
      ["a", "b"]
    );
  });

  it("teks cocok judul, catatan, sumber, status, prioritas, tenggat", () => {
    assert.deepEqual(cariLintasTugas(SEMUA, { q: "revisi" }, KINI).map((t) => t.id), ["a"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { q: "PENGUJI" }, KINI).map((t) => t.id), ["a"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { q: "jadwal" }, KINI).map((t) => t.id), ["b"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { q: "done" }, KINI).map((t) => t.id), ["b"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { q: "tinggi" }, KINI).map((t) => t.id), ["a"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { q: "2026-10-11" }, KINI).map((t) => t.id), ["b"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { q: "tak-ada" }, KINI), []);
  });

  it("kondisi aktif/selesai/terlambat mengecualikan arsip", () => {
    assert.deepEqual(cariLintasTugas(SEMUA, { kondisi: "aktif" }, KINI).map((t) => t.id), ["a"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { kondisi: "selesai" }, KINI).map((t) => t.id), ["b"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { kondisi: "terlambat" }, KINI).map((t) => t.id), ["a"]);
  });

  it("kondisi arsip hanya arsip; teks tetap menyaring di dalamnya", () => {
    assert.deepEqual(cariLintasTugas(SEMUA, { kondisi: "arsip" }, KINI).map((t) => t.id), ["c"]);
    assert.deepEqual(cariLintasTugas(SEMUA, { kondisi: "arsip", q: "revisi" }, KINI), []);
    assert.deepEqual(
      cariLintasTugas(SEMUA, { kondisi: "arsip", q: "lama" }, KINI).map((t) => t.id),
      ["c"]
    );
  });

  it("mengembalikan referensi yang sama (tanpa salinan)", () => {
    const hasil = cariLintasTugas(SEMUA, { q: "revisi" }, KINI);
    assert.equal(hasil[0] === A, true);
  });

  it("done tidak pernah terlambat walau tenggat lewat", () => {
    const items: EntriCari[] = [
      { ...B, dueDate: "2026-01-01" },
    ];
    assert.deepEqual(cariLintasTugas(items, { kondisi: "terlambat" }, KINI), []);
  });
});

describe("rumus progres tunggal (Tahap 3B)", () => {
  it("subtugas menang atas status; tanpa subtugas ikut status", () => {
    assert.equal(progresLangkah({ selesai: false }), 0);
    assert.equal(progresLangkah({ selesai: true }), 100);
    assert.equal(progresLangkah({ selesai: false, status: "doing" }), 50);
    assert.equal(
      progresLangkah({
        selesai: true,
        status: "todo",
        subtasks: [{ done: true }, { done: false }],
      }),
      50
    );
    assert.equal(progresLangkah({ selesai: false, subtasks: [] }), 0);
  });
  it("fase kosong = 0; rata-rata langkah dibulatkan", () => {
    assert.equal(progresFase([]), 0);
    assert.equal(
      progresFase([{ selesai: true }, { selesai: false }]),
      50
    );
    assert.equal(
      progresFase([
        { selesai: true },
        { selesai: true },
        { selesai: false },
      ]),
      67
    );
  });
  it("roadmap = rata-rata semua langkah (tanpa hitung ganda fase)", () => {
    assert.equal(progresRoadmap([]), 0);
    assert.equal(progresRoadmap([[]]), 0);
    // 1 fase isi 1 langkah tuntas + 1 fase isi 3 langkah (1 tuntas):
    // rata-rata fase = (100+33)/2 = 67, rata-rata langkah = 200/4 = 50.
    assert.equal(
      progresRoadmap([
        [{ selesai: true }],
        [{ selesai: true }, { selesai: false }, { selesai: false }],
      ]),
      50
    );
  });
});
