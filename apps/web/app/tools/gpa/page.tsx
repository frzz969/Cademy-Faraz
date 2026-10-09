import type { Metadata } from "next";
import GpaView from "./view";

export const metadata: Metadata = {
  title: "Kalkulator IPK & Target Cumlaude — Cademy",
  description:
    "Hitung IP semester dan IPK kumulatif dari SKS dan nilai A–E, plus simulasi IP yang dibutuhkan untuk mencapai target cumlaude.",
};

export default function GpaPage() {
  return <GpaView />;
}
