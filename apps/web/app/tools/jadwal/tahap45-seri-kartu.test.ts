import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bagiTampilJadwal,
  semuaTampil,
  susunSimpanJadwal,
} from "./view";
import {
  buatSeriBerulang,
  loadTasks,
  saveTasks,
} from "../../../components/task-store";

const bak = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (bak.has(k) ? (bak.get(k) as string) : null),
  setItem: (k: string, v: string) => {
    bak.set(k, String(v));
  },
  removeItem: (k: string) => {
    bak.delete(k);
  },
};

describe("Tahap 4A-fix kartu baru: pola seri tak lepas saat simpan pertama", () => {
  it("REGRESI e2e: kartu state-first (store belum kenal) tetap berlink", () => {
    const hasil = buatSeriBerulang({
      source: "jadwal",
      title: "Pagi",
      frekuensi: "harian",
      mulai: "2026-10-12",
      jumlah: 2,
    });
    assert.equal(hasil.ok, true);
    if (!hasil.ok) return;
    // Alur UI nyata: kartu dari state (keTugas), store masih kosong.
    const tampil = semuaTampil(bagiTampilJadwal(hasil.tugas));
    bak.clear();
    const { keep, jadwalSlice, sinkronSlice } = susunSimpanJadwal([], tampil);
    saveTasks([...keep, ...jadwalSlice, ...sinkronSlice]);
    const sesudah = loadTasks();
    assert.equal(sesudah.length, 2);
    const induk = hasil.tugas[0].id;
    assert.ok(sesudah.every((t) => t.berulang?.indukId === induk));
    // …dan kartu hasil baca ulang tetap berlabel (badge e2e).
    const baca = semuaTampil(bagiTampilJadwal(sesudah));
    assert.ok(baca.every((t) => t.indukId === induk && t.berulangLabel === "Harian"));
  });
});
