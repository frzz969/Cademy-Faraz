import type { Metadata } from "next";
import PlannerView from "./view";

export const metadata: Metadata = {
  title: "Perencana Belajar & Papan Kanban — Cademy",
  description:
    "Kelola tugas kuliah dengan hitung mundur target, agenda linimasa, papan kanban Belum Dikerjakan-Sedang Dikerjakan-Selesai, dan simpanan lokal di browser.",
};

export default function StudyPlannerPage() {
  return <PlannerView />;
}
