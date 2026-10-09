import type { Metadata } from "next";
import FlashcardsView from "./view";

export const metadata: Metadata = {
  title: "Flashcards Hafalan Interaktif — Cademy",
  description:
    "Ubah materi kuliah menjadi kartu hafalan depan-belakang dengan mode flip, acak, ekspor deck, dan simpanan lokal.",
};

export default function FlashcardsPage() {
  return <FlashcardsView />;
}
