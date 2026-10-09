import type { Metadata } from "next";
import QuizView from "./view";

export const metadata: Metadata = {
  title: "Generator Kuis dari Materi — Cademy",
  description:
    "Tempel materi kuliah dan dapatkan 1–30 soal pilihan ganda, benar/salah, atau esai lengkap dengan kunci, pembahasan, dan ekspor hasil.",
};

export default function QuizPage() {
  return <QuizView />;
}
