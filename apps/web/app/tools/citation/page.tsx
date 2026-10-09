import type { Metadata } from "next";
import CitationView from "./view";

export const metadata: Metadata = {
  title: "Generator Sitasi APA 7, MLA & IEEE — Cademy",
  description:
    "Susun sitasi APA 7, MLA 9, Chicago, IEEE, Harvard, dan BibTeX dari judul, penulis, tahun, dan DOI/ISBN. Gratis, 100% di browser.",
};

export default function CitationPage() {
  return <CitationView />;
}
