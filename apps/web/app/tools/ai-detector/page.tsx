import type { Metadata } from "next";
import AiDetectorView from "./view";

export const metadata: Metadata = {
  title: "AI Detector Eksternal — Cademy",
  description:
    "Buka AI Detector mahasiswa di aplikasi eksternal terpisah, lengkap dengan rencana migrasi ke dalam Cademy.",
};

export default function AiDetectorPage() {
  return <AiDetectorView />;
}
