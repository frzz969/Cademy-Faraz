import type { Metadata } from "next";
import LiteraturView from "./view";

export const metadata: Metadata = {
  title: "Pencari Jurnal — Cademy",
  description:
    "Cari artikel jurnal lewat OpenAlex + direktori Sinta, Garuda, DOAJ.",
};

export default function LiteraturPage() {
  return <LiteraturView />;
}
