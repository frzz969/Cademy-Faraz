import type { Metadata } from "next";
import PlannerView from "./view";

export const metadata: Metadata = {
  title: "Perencana Belajar & Papan Kanban — Cademy",
  description:
    "Kelola tugas kuliah dengan countdown target, agenda timeline, papan kanban ToDo-Doing-Done, dan simpanan lokal di browser.",
};

export default function StudyPlannerPage() {
  return <PlannerView />;
}
