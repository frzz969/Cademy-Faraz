import type { Metadata } from "next";
import MateriView from "./view";

export const metadata: Metadata = {
  title: "Ruang Belajar Materi — Cademy",
  description:
    "Ruang belajar fleksibel per mata kuliah: topik, instruksi dosen, catatan, sumber, dan tugas dengan tenggat. Semua tersimpan lokal di perangkatmu.",
};

export default function MateriPage() {
  return <MateriView />;
}
