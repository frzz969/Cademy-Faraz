import type { Metadata } from "next";
import WordCounterView from "./view";

export const metadata: Metadata = {
  title: "Penghitung Kata & Keterbacaan — Cademy",
  description:
    "Hitung kata, karakter, kalimat, paragraf, estimasi waktu baca, dan skor keterbacaan Flesch secara instan di browser.",
};

export default function WordCounterPage() {
  return <WordCounterView />;
}
