import type { Metadata } from "next";
import MateriView from "./view";

export const metadata: Metadata = {
  title: "Materi & Video Pembelajaran — Cademy",
  description:
    "Pelajari materi kuliah lewat playlist video, ringkasan poin kunci, diskusi kelas, dan unduhan ringkasan. Progres tersimpan di browser.",
};

export default function MateriPage() {
  return <MateriView />;
}
