// Util teks/kuis/flashcard murni — tanpa React/browser/network.
// Diekstrak dari word-counter/view.tsx, quiz/view.tsx, flashcards/view.tsx.
//
// PERUBAHAN DISENGAJA dari perilaku lama:
// 1. fisherYates/generate/fromMateri menerima injeksi RNG/id agar deterministik
//    saat tes (default tetap acak seperti dulu).
// 2. generate: menjamin kunci ∈ opsi setelah shuffle+dedupe (bila kunci hilang,
//    kunci disertakan ulang mengganti entri terakhir). Lama: tidak ada jaminan.
// 3. generate: membatasi jumlah soal ≤ kalimat unik yang tersedia
//    (min(jumlah, sents.length)) agar tidak ada duplikat nyaris-identik
//    akibat modulo. Lama: modulo sents.length sehingga soal berulang.

export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  let n = (clean.match(/[aiueoy]+/g) ?? []).length;
  if (clean.endsWith("e")) n -= 1;
  else if (clean.endsWith("es") || clean.endsWith("ed")) n -= 1;
  return Math.max(1, n);
}

export interface WordStats {
  chars: number;
  charsNoSpace: number;
  words: number;
  sentences: number;
  paras: number;
  minutes: number;
  flesch: number;
  grade: number;
  level: string;
}

export function stats(text: string): WordStats {
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  const wordList = text.trim().match(/\S+/g) ?? [];
  const words = wordList.length;
  const sentences = (text.match(/[^.!?\n]+[.!?]+/g) ?? []).length || (text.trim() ? 1 : 0);
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length || (text.trim() ? 1 : 0);
  const minutes = words / 200;
  const syll = wordList.reduce((a, w) => a + countSyllables(w), 0) || 1;
  const flesch = words && sentences ? 206.835 - 1.015 * (words / sentences) - 84.6 * (syll / words) : 0;
  const grade = words && sentences ? 0.39 * (words / sentences) + 11.8 * (syll / words) - 15.59 : 0;
  const level =
    flesch >= 90
      ? "Sangat mudah"
      : flesch >= 80
        ? "Mudah"
        : flesch >= 70
          ? "Cukup mudah"
          : flesch >= 60
            ? "Standar"
            : flesch >= 50
              ? "Agak sulit"
              : flesch >= 30
                ? "Sulit"
                : "Sangat sulit / akademik";
  return {
    chars,
    charsNoSpace,
    words,
    sentences: text.trim() ? sentences : 0,
    paras: text.trim() ? paras : 0,
    minutes,
    flesch,
    grade,
    level,
  };
}

// ---- Quiz ----

export type QType = "campuran" | "mcq" | "benar-salah" | "esai";

export interface Q {
  id: string;
  tipe: string;
  soal: string;
  opsi?: string[];
  kunci: string;
  pembahasan: string;
}

export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

export function keywords(text: string): string[] {
  const stop = new Set([
    "yang",
    "dan",
    "atau",
    "dengan",
    "untuk",
    "pada",
    "dalam",
    "adalah",
    "sebagai",
    "dari",
    "ini",
    "itu",
    "tersebut",
    "akan",
    "telah",
    "sudah",
    "oleh",
    "karena",
    "sehingga",
    "jika",
    "saat",
    "dapat",
  ]);
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-zà-ž0-9\s-]/gi, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !stop.has(w)),
    ),
  ).slice(0, 30);
}

export function fisherYates<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generate(
  materi: string,
  jumlah: number,
  tipe: QType,
  rand: () => number = Math.random,
  makeId: (i: number) => string = (i) => `q${i}`,
): Q[] {
  const sents = sentences(materi);
  const keys = keywords(materi);
  if (sents.length === 0) return [];
  // Batasi ke kombinasi unik agar tidak ada duplikat nyaris-identik.
  const n = Math.min(Math.max(Math.floor(jumlah) || 0, 0), sents.length);
  const out: Q[] = [];
  for (let i = 0; i < n; i++) {
    const s = sents[i % sents.length];
    const kind: QType =
      tipe === "campuran" ? (["mcq", "benar-salah", "esai"] as const)[i % 3] as QType : tipe;
    if (kind === "mcq") {
      const target = keys[i % Math.max(keys.length, 1)] ?? "konsep";
      const distract = [
        keys[(i + 3) % Math.max(keys.length, 1)] ?? "teori",
        keys[(i + 5) % Math.max(keys.length, 1)] ?? "metode",
        "semua salah",
      ];
      const opsi = [...new Set([target, ...distract])].slice(0, 4);
      while (opsi.length < 4) opsi.push(`opsi ${opsi.length + 1}`);
      const shuffled = fisherYates(opsi, rand);
      // JAMIN kunci ∈ opsi setelah shuffle+dedupe.
      if (!shuffled.includes(target)) shuffled[shuffled.length - 1] = target;
      out.push({
        id: makeId(i),
        tipe: "Pilihan ganda",
        soal: `Pernyataan berikut paling tepat melengkapi: "${s.slice(0, 120)}..." — kata kunci yang hilang adalah…`,
        opsi: shuffled,
        kunci: target,
        pembahasan: `Kata kunci "${target}" muncul pada materi. Sumber: "${s}"`,
      });
    } else if (kind === "benar-salah") {
      const benar = i % 2 === 0;
      const mod = benar ? s : s.replace(/tidak\s+/i, "").slice(0, 100) + " (selalu mutlak)";
      out.push({
        id: makeId(i),
        tipe: "Benar / Salah",
        soal: `Benar atau salah: "${mod}"`,
        kunci: benar ? "Benar" : "Salah",
        pembahasan: benar
          ? `Pernyataan sesuai materi: "${s}"`
          : `Pernyataan dimodifikasi (kata "selalu mutlak" ditambahkan). Asli: "${s}"`,
      });
    } else {
      out.push({
        id: makeId(i),
        tipe: "Esai",
        soal: `Jelaskan dengan bahasamu: apa maksud dari "${s.slice(0, 140)}..."?`,
        kunci: s,
        pembahasan: `Jawaban ideal memuat poin pada kalimat sumber di atas.`,
      });
    }
  }
  return out;
}

// ---- Flashcards ----

export interface Card {
  id: string;
  depan: string;
  belakang: string;
}

function defaultUid(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return Math.random().toString(36).slice(2, 9);
}

export function fromMateri(materi: string, makeId: () => string = defaultUid): Card[] {
  const lines = materi
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  return lines.slice(0, 30).map((l) => {
    const sep =
      l.includes("|")
        ? "|"
        : l.includes("—")
          ? "—"
          : l.includes(":") && l.split(":")[0].length < 40
            ? ":"
            : null;
    if (sep) {
      const [d, ...rest] = l.split(sep);
      return { id: makeId(), depan: d.trim(), belakang: rest.join(sep).trim() };
    }
    return { id: makeId(), depan: `Jelaskan: ${l.slice(0, 80)}…`, belakang: l };
  });
}

export function formatDeck(cards: Card[]): string {
  return cards.map((c, i) => `${i + 1}. ${c.depan}\n   → ${c.belakang}`).join("\n");
}
