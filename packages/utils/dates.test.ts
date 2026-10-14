import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cocokFilterCepat,
  cocokFilterTugas,
  gridKalender,
  kunciTanggal,
  mondayOfWeek,
  parseTanggalISO,
  toISODate,
  tugasTerlambat,
} from "./dates";

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

describe("parseTanggalISO (Tahap 3 S7)", () => {
  it("null untuk non-tanggal: teks bebas, kosong, null", () => {
    assert.equal(parseTanggalISO("Besok"), null);
    assert.equal(parseTanggalISO("Tuntas 12 Okt"), null);
    assert.equal(parseTanggalISO(""), null);
    assert.equal(parseTanggalISO(null), null);
    assert.equal(parseTanggalISO(undefined), null);
  });
  it("ISO valid lolos (awalan tanggal + teks ekstra ikut dinormalisasi)", () => {
    assert.equal(parseTanggalISO("2026-10-11"), "2026-10-11");
    assert.equal(parseTanggalISO("2026-10-11T00:00:00"), "2026-10-11");
  });
  it("REGRESI: bulan/hari tak valid ditolak, bukan tanggal palsu", () => {
    assert.equal(parseTanggalISO("2026-13-01"), null);
    assert.equal(parseTanggalISO("2026-00-10"), null);
    assert.equal(parseTanggalISO("2026-02-30"), null);
    assert.equal(parseTanggalISO("2026-04-31"), null);
  });
  it("hari kabisat asli tetap lolos", () => {
    assert.equal(parseTanggalISO("2024-02-29"), "2024-02-29");
  });
});

describe("tugasTerlambat (Tahap 3 S8)", () => {
  const kini = new Date(2026, 9, 11); // 11 Okt 2026
  it("done tidak pernah terlambat", () => {
    assert.equal(tugasTerlambat("done", "2026-01-01", kini), false);
  });
  it("tanpa tanggal tidak terlambat", () => {
    assert.equal(tugasTerlambat("todo", "", kini), false);
    assert.equal(tugasTerlambat("todo", "Besok", kini), false);
    assert.equal(tugasTerlambat("doing", null, kini), false);
  });
  it("deadline kemarin + belum selesai = terlambat", () => {
    assert.equal(tugasTerlambat("todo", "2026-10-10", kini), true);
    assert.equal(tugasTerlambat("doing", "2026-10-10", kini), true);
  });
  it("deadline hari ini / besok belum terlambat", () => {
    assert.equal(tugasTerlambat("todo", "2026-10-11", kini), false);
    assert.equal(tugasTerlambat("todo", "2026-10-12", kini), false);
  });
});

describe("cocokFilterCepat (Tahap 3 S6)", () => {  const kini = new Date(2026, 9, 11); // Sabtu, pekan Senin 5 Okt – Minggu 11 Okt
  const item = {
    judul: "Revisi Bab 2",
    tag: "BAB 2",
    prioritas: "tinggi",
    status: "todo",
    dueDate: "2026-10-11",
  };
  it("semua + tanpa cari lolos", () => {
    assert.equal(cocokFilterCepat(item, "semua", "", kini), true);
  });
  it("hari-ini: cocok tanggal lolos, beda tanggal ditolak", () => {
    assert.equal(cocokFilterCepat(item, "hari-ini", "", kini), true);
    assert.equal(
      cocokFilterCepat({ ...item, dueDate: "2026-10-12" }, "hari-ini", "", kini),
      false
    );
    assert.equal(
      cocokFilterCepat({ ...item, dueDate: "" }, "hari-ini", "", kini),
      false
    );
  });
  it("minggu-ini mencakup Sen–Min pekan berjalan", () => {
    assert.equal(cocokFilterCepat(item, "minggu-ini", "", kini), true);
    assert.equal(
      cocokFilterCepat({ ...item, dueDate: "2026-10-05" }, "minggu-ini", "", kini),
      true
    );
    assert.equal(
      cocokFilterCepat({ ...item, dueDate: "2026-10-04" }, "minggu-ini", "", kini),
      false
    );
  });
  it("terlambat / belum / selesai ikut status", () => {
    assert.equal(
      cocokFilterCepat({ ...item, dueDate: "2026-10-01" }, "terlambat", "", kini),
      true
    );
    assert.equal(cocokFilterCepat(item, "belum", "", kini), true);
    assert.equal(cocokFilterCepat(item, "selesai", "", kini), false);
    assert.equal(
      cocokFilterCepat({ ...item, status: "done" }, "selesai", "", kini),
      true
    );
    assert.equal(
      cocokFilterCepat({ ...item, status: "done" }, "belum", "", kini),
      false
    );
  });
  it("filter prioritas tetap jalan", () => {
    assert.equal(cocokFilterCepat(item, "tinggi", "", kini), true);
    assert.equal(cocokFilterCepat(item, "normal", "", kini), false);
  });
  it("REGRESI: cari + filter tanggal digabung (AND), bukan kosong", () => {
    assert.equal(cocokFilterCepat(item, "hari-ini", "revisi", kini), true);
    assert.equal(cocokFilterCepat(item, "hari-ini", "bab 5", kini), false);
    assert.equal(cocokFilterCepat(item, "belum", "REVISI", kini), true);
  });
});

describe("gridKalender (Tahap 3D)", () => {
  it("42 sel, mulai Senin pekan tanggal 1 (Okt 2026: 1 = Kamis)", () => {
    const sel = gridKalender(2026, 9);
    assert.equal(sel.length, 42);
    assert.equal(toISODate(sel[0]), "2026-09-28"); // Senin
    assert.equal(toISODate(sel[3]), "2026-10-01");
    assert.ok(sel.every((d) => d.getHours() === 0 && d.getMinutes() === 0));
    // Senin–Minggu berurutan
    assert.equal(sel[6].getDay(), 0); // Minggu
    assert.equal(sel[7].getDay(), 1); // Senin berikut
  });
  it("Februari kabisat memuat 29 hari; tak ada sel duplikat", () => {
    const sel = gridKalender(2024, 1);
    assert.ok(sel.some((d) => toISODate(d) === "2024-02-29"));
    assert.equal(new Set(sel.map((d) => toISODate(d))).size, 42);
  });
  it("bulan diawali Senin: sel pertama = tanggal 1", () => {
    // Juni 2026: 1 Juni = Senin
    assert.equal(toISODate(gridKalender(2026, 5)[0]), "2026-06-01");
  });
  it("kunciTanggal = ISO lokal untuk cocokkan tenggat", () => {
    assert.equal(kunciTanggal(new Date(2026, 9, 11, 15, 30)), "2026-10-11");
  });
});
