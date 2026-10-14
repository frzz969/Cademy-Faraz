import type { Metadata } from "next";
import JadwalView from "./view";

export const metadata: Metadata = {
  title: "Jadwal Kuliah & Task Board Skripsi — Cademy",
  description:
    "Kelola agenda bimbingan, tenggat revisi, dan papan tugas skripsi (Belum Dikerjakan, Sedang Dikerjakan, Selesai) dengan filter prioritas dan penyimpanan lokal.",
};

export default function JadwalPage() {
  return <JadwalView />;
}
