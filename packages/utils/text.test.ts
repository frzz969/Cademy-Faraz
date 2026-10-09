import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countSyllables,
  stats,
  sentences,
  keywords,
  fisherYates,
  generate,
  fromMateri,
  formatDeck,
} from "./text.ts";

describe("text utils", () => {
  it("countSyllables/stats dasar", () => {
    assert.equal(countSyllables(""), 0);
    assert.equal(countSyllables("cat"), 1);
    const s = stats("Halo dunia. Ini kalimat kedua!");
    assert.equal(s.words, 5);
    assert.equal(s.sentences, 2);
    assert.ok(s.flesch !== 0);
  });

  it("sentences/keywords", () => {
    const ss = sentences("Kalimat pertama yang cukup panjang sekali. Pendek. Kalimat ketiga yang juga sangat panjang untuk diuji.");
    assert.ok(ss.length >= 2);
    const kw = keywords("pembelajaran berbasis proyek pembelajaran proyek metode ilmiah");
    assert.ok(kw.includes("pembelajaran"));
  });

  it("fisherYates deterministik dengan RNG inject", () => {
    const zero = () => 0;
    assert.deepEqual(fisherYates([1, 2, 3], zero), [2, 3, 1]);
    const same = fisherYates([1, 2, 3], zero);
    assert.deepEqual(same, [2, 3, 1]);
  });

  it("generate: kunci selalu ∈ opsi + batas unik", () => {
    const materi =
      "Fotosintesis adalah proses penting bagi tumbuhan hijau yang membutuhkan cahaya. " +
      "Metode ilmiah membutuhkan observasi sistematis dan eksperimen terkontrol yang valid. " +
      "Pembelajaran berbasis proyek meningkatkan motivasi belajar mahasiswa secara signifikan.";
    const qs = generate(materi, 10, "mcq", () => 0.1, (i) => `id-${i}`);
    // FIX lama: jumlah 10 dengan 3 kalimat -> 10 soal duplikat modulo.
    // Baru: dibatasi 3 (jumlah kalimat unik).
    assert.equal(qs.length, 3);
    for (const q of qs) {
      assert.ok(q.opsi && q.opsi.includes(q.kunci), `kunci hilang: ${JSON.stringify(q)}`);
    }
    assert.deepEqual(qs.map((q) => q.id), ["id-0", "id-1", "id-2"]);
  });

  it("fromMateri deterministik + formatDeck", () => {
    let n = 0;
    const cards = fromMateri("Fotosintesis | Proses tumbuhan\nBaris tanpa separator yang cukup panjang untuk kartu otomatis", () => `c${n++}`);
    assert.equal(cards.length, 2);
    assert.deepEqual(cards[0], { id: "c0", depan: "Fotosintesis", belakang: "Proses tumbuhan" });
    assert.ok(cards[1].depan.startsWith("Jelaskan:"));
    assert.ok(formatDeck(cards).includes("Fotosintesis"));
    assert.deepEqual(fromMateri("   \n  "), []);
  });
});
