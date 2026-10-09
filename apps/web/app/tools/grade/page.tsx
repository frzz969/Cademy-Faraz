import type { Metadata } from "next";
import GradeView from "./view";

export const metadata: Metadata = {
  title: "Kalkulator Nilai Sidang Skripsi — Cademy",
  description:
    "Hitung nilai sidang skripsi dari 3 penilai (pembimbing 40% + 2 penguji), lihat porsi kontribusi, keputusan sidang, dan simpan riwayat simulasi.",
};

export default function GradePage() {
  return <GradeView />;
}
