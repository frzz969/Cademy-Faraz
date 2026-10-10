import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanSrtVtt,
  isSupportedCaptionFile,
  detectMediaUrl,
  validateTranscriptInput,
  searchTranscript,
  sanitizeTranscript,
  parseTranscripts,
  buildTxtExport,
  freshTranscripts,
  MAX_TEKS,
} from "./transcript-store";

const SRT = `1
00:00:01,000 --> 00:00:04,000
Halo semuanya, selamat datang

2
00:00:04,500 --> 00:00:07,000
Halo semuanya, selamat datang
Hari ini kita bahas <b>regresi</b>

3
00:00:08,000 --> 00:00:10,000
[00:00:08] DOSEN: buka slide dua
`;

const VTT = `WEBVTT

NOTE ini komentar file

00:00.000 --> 00:02.000
<i>Pengantar</i> kuliah

00:02.500 --> 00:05.000
Pengantar kuliah
`;

describe("materi transcript store", () => {
  it("cleanSrtVtt: buang nomor/timestamp/tag, tanpa bikin timestamp palsu", () => {
    const r = cleanSrtVtt(SRT);
    assert.doesNotMatch(r.teks, /-->/);
    assert.doesNotMatch(r.teks, /<b>/);
    assert.doesNotMatch(r.teks, /\[00:00:08\]/);
    assert.match(r.teks, /Halo semuanya, selamat datang/);
    assert.match(r.teks, /regresi/);
    // Label pembicara asli dibiarkan (bukan dibuat-buat, bukan dihapus)
    assert.match(r.teks, /DOSEN: buka slide dua/);
    // Baris kembar berurutan digabung
    assert.equal(r.kembarDigabung, 1);
    assert.ok(r.barisDibuang >= 6);
    assert.equal(r.tanpaTimestamp, false);
  });

  it("cleanSrtVtt: VTT header + NOTE dibuang, tag miring dibersihkan", () => {
    const r = cleanSrtVtt(VTT);
    assert.doesNotMatch(r.teks, /WEBVTT/);
    assert.doesNotMatch(r.teks, /NOTE/);
    assert.doesNotMatch(r.teks, /<i>/);
    assert.match(r.teks, /Pengantar kuliah/);
    assert.equal(r.kembarDigabung, 1);
  });

  it("cleanSrtVtt: teks biasa (tanpa timestamp) ditandai jujur", () => {
    const r = cleanSrtVtt("Halo ini teks biasa\nbaris kedua");
    assert.equal(r.tanpaTimestamp, true);
    assert.match(r.teks, /teks biasa/);
  });

  it("isSupportedCaptionFile: hanya .srt/.vtt", () => {
    assert.equal(isSupportedCaptionFile("kuliah.srt"), true);
    assert.equal(isSupportedCaptionFile("KULIAH.VTT"), true);
    assert.equal(isSupportedCaptionFile("makalah.pdf"), false);
    assert.equal(isSupportedCaptionFile("rekaman.mp3"), false);
    assert.equal(isSupportedCaptionFile("catatan.txt"), false);
    assert.equal(isSupportedCaptionFile(""), false);
  });

  it("detectMediaUrl: youtube/zoom/lain/invalid + catatan jujur", () => {
    assert.equal(detectMediaUrl("https://www.youtube.com/watch?v=abc").kind, "youtube");
    assert.equal(detectMediaUrl("https://youtu.be/abc").kind, "youtube");
    assert.match(detectMediaUrl("https://www.youtube.com/watch?v=abc").note, /tidak mengunduh otomatis/);
    assert.equal(detectMediaUrl("https://univ.zoom.us/j/123").kind, "zoom");
    assert.match(detectMediaUrl("https://univ.zoom.us/j/123").note, /login/);
    assert.equal(detectMediaUrl("https://kampus.ac.id/materi").kind, "lain");
    assert.equal(detectMediaUrl("javascript:alert(1)").kind, "invalid");
    assert.equal(detectMediaUrl("bukan url").kind, "invalid");
    assert.equal(detectMediaUrl("").kind, "invalid");
  });

  it("validateTranscriptInput: judul/teks wajib, teks raksasa ditolak", () => {
    assert.deepEqual(validateTranscriptInput("", ""), ["Isi dulu judul transkripnya.", "Teks transkrip masih kosong — tempel atau unggah dulu."]);
    assert.deepEqual(validateTranscriptInput("Judul", "isi"), []);
    assert.equal(validateTranscriptInput("J", "x".repeat(MAX_TEKS + 1)).length, 1);
  });

  it("searchTranscript: hitung + potong bagian cocok", () => {
    const teks = "Regresi linear sederhana\n\nKlasifikasi naive bayes\n\nRegresi logistik lanjut";
    const r = searchTranscript(teks, "regresi");
    assert.equal(r.total, 2);
    assert.equal(r.parts.length, 2);
    assert.equal(searchTranscript(teks, "  ").total, 0);
    assert.equal(searchTranscript(teks, "tidak-ada").total, 0);
  });

  it("sanitizeTranscript/parseTranscripts: rusak dibuang, valid lolos", () => {
    assert.equal(sanitizeTranscript(null), null);
    assert.equal(sanitizeTranscript({ judul: "J", teks: "" }), null);
    assert.equal(sanitizeTranscript({ judul: "", teks: "isi" }), null);
    const bagus = sanitizeTranscript({ judul: " Kuliah 1 ", teks: "isi transkrip", asal: "paste", catatan: [{ teks: "n" }, null], bookmark: "rusak" });
    assert.ok(bagus);
    assert.equal(bagus!.judul, "Kuliah 1");
    assert.equal(bagus!.catatan.length, 1);
    assert.deepEqual(bagus!.bookmark, []);
    const p = parseTranscripts({ version: 1, items: [bagus, null, { judul: "", teks: "" }] });
    assert.equal(p.ok, true);
    assert.equal(p.store.items.length, 1);
    assert.equal(p.dropped, 2);
    assert.equal(parseTranscripts(null).ok, false);
    assert.equal(parseTranscripts({ version: 9, items: [] }).ok, false);
    assert.deepEqual(freshTranscripts().items, []);
  });

  it("buildTxtExport: metadata + teks + catatan + penanda, tanpa klaim", () => {
    const t = sanitizeTranscript({
      judul: "Kuliah Regresi",
      sumber: "YouTube — Statistika",
      tanggal: "2026-10-01",
      teks: "isi kuliah",
      asal: "paste",
      catatan: [{ teks: "pahami rumus" }],
      bookmark: [{ label: "Bagian penting", excerpt: "isi kuliah" }],
    })!;
    const out = buildTxtExport(t);
    assert.match(out, /Kuliah Regresi/);
    assert.match(out, /YouTube — Statistika/);
    assert.match(out, /isi kuliah/);
    assert.match(out, /pahami rumus/);
    assert.match(out, /Bagian penting/);
    assert.doesNotMatch(out, /peer-reviewed/i);
  });
});
