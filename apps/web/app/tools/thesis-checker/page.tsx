import type { Metadata } from "next";
import ThesisView from "./view";

export const metadata: Metadata = {
  title: "Checklist Skripsi Thesis Checker — Cademy",
  description:
    "Periksa kelengkapan skripsi: bab, struktur, sitasi, dan bahasa lewat 17 item checklist dengan progress bar dan laporan salin.",
};

export default function ThesisCheckerPage() {
  return <ThesisView />;
}
