import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cocokFilterTugas, mondayOfWeek, toISODate } from "./dates";

describe("toISODate", () => {
  it("format YYYY-MM-DD waktu lokal", () => {
    assert.equal(toISODate(new Date(2026, 9, 9)), "2026-10-09");
    assert.equal(toISODate(new Date(2026, 0, 5)), "2026-01-05");
  });
});

describe("mondayOfWeek", () => {
  it("Senin dari pekan berjalan (Jumat → Senin mundur)", () => {
    // 9 Okt 2026 = Jumat
    assert.equal(toISODate(mondayOfWeek(new Date(2026, 9, 9))), "2026-10-05");
  });
  it("Senin tetap Senin, Minggu mundur 6 hari", () => {
    assert.equal(toISODate(mondayOfWeek(new Date(2026, 9, 5))), "2026-10-05");
    assert.equal(toISODate(mondayOfWeek(new Date(2026, 9, 11))), "2026-10-05");
  });
  it("tak mengubah argumen dan mulai 00:00", () => {
    const base = new Date(2026, 9, 9, 15, 30);
    const mon = mondayOfWeek(base);
    assert.equal(base.getDate(), 9);
    assert.equal(`${mon.getHours()}:${mon.getMinutes()}`, "0:0");
  });
});

describe("cocokFilterTugas", () => {
  const item = { judul: "Revisi Bab 2", tag: "BAB 2", prioritas: "tinggi" };
  it("lolos bila filter semua + tanpa kata kunci", () => {
    assert.equal(cocokFilterTugas(item, "semua", ""), true);
  });
  it("menolak prioritas berbeda", () => {
    assert.equal(cocokFilterTugas(item, "normal", ""), false);
    assert.equal(cocokFilterTugas(item, "tinggi", ""), true);
  });
  it("pencarian case-insensitive judul/tag", () => {
    assert.equal(cocokFilterTugas(item, "semua", "bab 2"), true);
    assert.equal(cocokFilterTugas(item, "semua", "REVISI"), true);
    assert.equal(cocokFilterTugas(item, "semua", "bab 5"), false);
  });
});
