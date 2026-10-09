import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  butuhIpTarget,
  clampBobot,
  clampNilai,
  hitungProgressThesis,
  hurufDanPredikat,
  ipkKumulatif,
  ipSemester,
  keputusanSidang,
  parseDesimal,
  predikatIpk,
} from "./academic";

describe("parseDesimal", () => {
  it("menerima koma desimal Indonesia", () => {
    assert.equal(parseDesimal("3,50"), 3.5);
    assert.equal(parseDesimal(" 2,75 "), 2.75);
  });
  it("menolak NaN eksplisit (null, bukan 0 diam-diam)", () => {
    assert.equal(parseDesimal("abc"), null);
    assert.equal(parseDesimal(""), null);
    assert.equal(parseDesimal("   "), null);
    assert.equal(parseDesimal(NaN), null);
    assert.equal(parseDesimal(undefined), null);
  });
  it("meneruskan angka valid", () => {
    assert.equal(parseDesimal(3), 3);
    assert.equal(parseDesimal("20"), 20);
  });
});

describe("ipSemester", () => {
  it("menghitung rata-rata berbobot", () => {
    // A(4.0)×3 + B+(3.3)×2 = 18.6 / 5 = 3.72
    assert.equal(ipSemester([{ sks: 3, poin: 4.0 }, { sks: 2, poin: 3.3 }]), 3.72);
  });
  it("0 bila tak ada sks", () => {
    assert.equal(ipSemester([]), 0);
  });
});

describe("ipkKumulatif", () => {
  it("menggabung riwayat + semester berjalan", () => {
    // (20×3.0 + 18.6) / 25 = 78.6/25 = 3.144
    assert.ok(Math.abs(ipkKumulatif(20, 3.0, 5, 18.6) - 3.144) < 1e-9);
  });
  it("memakai fallback bila belum ada sks", () => {
    assert.equal(ipkKumulatif(0, 0, 0, 0, 3.5), 3.5);
  });
});

describe("predikatIpk", () => {
  it("batas-batas predikat", () => {
    assert.equal(predikatIpk(3.51), "Cumlaude");
    assert.equal(predikatIpk(3.5), "Sangat Memuaskan");
    assert.equal(predikatIpk(2.76), "Sangat Memuaskan");
    assert.equal(predikatIpk(2.75), "Memuaskan");
    assert.equal(predikatIpk(2.0), "Memuaskan");
    assert.equal(predikatIpk(1.99), "Perlu ditingkatkan");
  });
});

describe("butuhIpTarget", () => {
  it("rata-rata yang dibutuhkan di sisa sks", () => {
    // target 3.5, tempuh 25 sks bobot 78.6, sisa 20 → (3.5×45−78.6)/20 = 3.945
    assert.ok(Math.abs(butuhIpTarget(3.5, 25, 78.6, 20) - 3.945) < 1e-9);
  });
  it("0 bila sisa sks <= 0", () => {
    assert.equal(butuhIpTarget(3.5, 25, 78.6, 0), 0);
  });
});

describe("hurufDanPredikat / keputusanSidang", () => {
  it("batas huruf 9-skala", () => {
    assert.equal(hurufDanPredikat(85).huruf, "A");
    assert.equal(hurufDanPredikat(84.9).huruf, "A-");
    assert.equal(hurufDanPredikat(55).huruf, "C");
    assert.equal(hurufDanPredikat(41).huruf, "D");
    assert.equal(hurufDanPredikat(40.9).huruf, "E");
  });
  it("keputusan sidang", () => {
    assert.equal(keputusanSidang(85), "Lulus Sidang Utama");
    assert.equal(keputusanSidang(70), "Lulus Revisi Minor");
    assert.equal(keputusanSidang(55), "Lulus Bersyarat");
    assert.equal(keputusanSidang(54.9), "Tidak Lulus / Mengulang");
  });
});

describe("clampBobot / clampNilai", () => {
  it("menjaga rentang", () => {
    assert.equal(clampBobot(5), 10);
    assert.equal(clampBobot(90), 80);
    assert.equal(clampBobot(40), 40);
    assert.equal(clampNilai(-3), 0);
    assert.equal(clampNilai(120), 100);
    assert.equal(clampNilai(88), 88);
  });
});

describe("hitungProgressThesis", () => {
  const known = ["a", "b", "c", "d"];
  it("menghitung hit HANYA dari id dikenal", () => {
    const r = hitungProgressThesis({ a: true, b: true, basi1: true, basi2: true }, known);
    assert.equal(r.hit, 2);
    assert.equal(r.total, 4);
    assert.equal(r.pct, 50);
  });
  it("pct tak pernah > 100% walau ada key basi", () => {
    const done: Record<string, boolean> = {};
    for (const k of known) done[k] = true;
    for (let i = 0; i < 10; i++) done[`basi${i}`] = true;
    const r = hitungProgressThesis(done, known);
    assert.equal(r.hit, 4);
    assert.equal(r.pct, 100);
  });
  it("aman untuk daftar kosong", () => {
    assert.deepEqual(hitungProgressThesis({}, []), { hit: 0, total: 0, pct: 0 });
  });
});
