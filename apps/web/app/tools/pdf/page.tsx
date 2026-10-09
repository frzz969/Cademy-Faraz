import type { Metadata } from "next";
import PdfView from "./view";

export const metadata: Metadata = {
  title: "Tools PDF: Validasi & Ekstrak Teks — Cademy",
  description:
    "Validasi file PDF (maks 20MB), estimasi jumlah halaman, dan ekstrak teks sederhana — semuanya client-side tanpa upload.",
};

export default function PdfPage() {
  return <PdfView />;
}
