import type { Metadata } from "next";
import FlowchartSkripsiView from "./view";

export const metadata: Metadata = {
  title: "Roadmap Skripsi 4 Fase — Cademy",
  description:
    "Panduan langkah demi langkah dari proposal hingga wisuda: checklist 4 fase, matriks revisi 14 hari, ambang orisinalitas di bawah 20%, tersimpan di browser.",
};

export default function FlowchartSkripsiPage() {
  return <FlowchartSkripsiView />;
}
