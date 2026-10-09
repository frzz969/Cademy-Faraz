import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolsView } from "./tools-view";

export const metadata: Metadata = {
  title: "Direktori Tools Akademik — Cademy",
  description:
    "Jelajahi semua tools akademik Cademy: sitasi, IPK, nilai sidang, PDF, perencana belajar, kuis, flashcards, pomodoro, dan checklist skripsi.",
};

export default function ToolsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-16">
      <Suspense fallback={<p className="py-10 font-body text-sm text-[#4E7390]">Memuat direktori...</p>}>
        <ToolsView />
      </Suspense>
    </div>
  );
}
