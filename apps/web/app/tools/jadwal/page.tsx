import type { Metadata } from "next";
import JadwalView from "./view";

export const metadata: Metadata = {
  title: "Jadwal Kuliah & Task Board Skripsi — Cademy",
  description:
    "Kelola agenda bimbingan, deadline revisi, dan papan tugas skripsi (To Do, Sedang Dikerjakan, Selesai) dengan filter prioritas dan penyimpanan lokal.",
};

export default function JadwalPage() {
  return <JadwalView />;
}
