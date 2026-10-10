export type ToolStatus = "available" | "external" | "coming-soon" | "beta";
export type ToolCategory =
  | "writing"
  | "research"
  | "study"
  | "documents"
  | "productivity";

export interface Tool {
  slug: string;
  name: string;
  description: string;
  status: ToolStatus;
  url?: string;
  category: ToolCategory[];
  icon: string;
  badge?: string;
  meta?: string[];
}

export const categories: Array<{ id: ToolCategory | "all"; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "writing", label: "Penulisan & Skripsi" },
  { id: "research", label: "Riset & Jurnal" },
  { id: "study", label: "Kalkulator Studi" },
  { id: "documents", label: "Dokumen & PDF" },
  { id: "productivity", label: "Presentasi & Sidang" },
];

export const tools: Tool[] = [
  {
    slug: "ai-detector",
    name: "AI Detector",
    description:
      "Simulasi heuristik lokal (demo edukasi) + tautan tool eksternal.",
    status: "external",
    url: "https://ai-detector-mahasiswa.vercel.app",
    category: ["writing", "research"],
    icon: "smart_toy",
    badge: "External",
    meta: ["Aplikasi luar", "Dibuka di tab baru", "Riwayat di sana"],
  },
  {
    slug: "citation",
    name: "Citation Generator",
    description:
      "Bibliografi APA 7, MLA 9, Chicago, IEEE + BibTeX. Isi otomatis dari DOI.",
    status: "available",
    category: ["research", "documents"],
    icon: "format_quote",
    badge: "APA • MLA • IEEE",
    meta: ["6 gaya sitasi", "Ekspor BibTeX", "DOI lookup"],
  },
  {
    slug: "literatur",
    name: "Pencari Jurnal",
    description:
      "Cari artikel jurnal lewat OpenAlex + direktori Sinta, Garuda, DOAJ.",
    status: "available",
    category: ["research"],
    icon: "search",
    badge: "OpenAlex",
    meta: ["Cari + filter tahun", "Link DOI & akses terbuka", "Butuh internet"],
  },
  {
    slug: "gpa",
    name: "GPA Calculator",
    description: "Simulasi IPK kumulatif, bobot SKS, dan target cumlaude.",
    status: "available",
    category: ["study", "productivity"],
    icon: "calculate",
    badge: "Semester & Target",
    meta: ["Skala UNAS • UNY", "Simulasi target", "100% lokal"],
  },
  {
    slug: "grade",
    name: "Kalkulator Nilai Sidang",
    description:
      "Hitung nilai sidang skripsi: pembimbing 40% + 2 penguji, porsi kontribusi, dan riwayat simulasi.",
    status: "available",
    category: ["study", "productivity"],
    icon: "school",
    badge: "Bobot Otomatis",
    meta: ["40/30/30", "Donat kontribusi", "Riwayat lokal"],
  },
  {
    slug: "pdf",
    name: "PDF Tools",
    description: "Validasi PDF, estimasi halaman & ekstrak teks client-side.",
    status: "available",
    category: ["documents", "research"],
    icon: "picture_as_pdf",
    badge: "Client-only",
    meta: ["Maks 20MB", "Estimasi halaman", "Ekstrak teks beta"],
  },
  {
    slug: "study-planner",
    name: "Study Planner",
    description: "Rencana belajar mingguan dan papan tugas.",
    status: "available",
    category: ["productivity", "study"],
    icon: "calendar_month",
    meta: ["Kanban", "Countdown target", "Tersimpan lokal"],
  },
  {
    slug: "quiz",
    name: "Quiz Generator",
    description: "Soal MCQ, Benar/Salah & Esai template-based + kunci.",
    status: "available",
    category: ["study"],
    icon: "quiz",
    badge: "Template-based",
    meta: ["1–30 soal", "Kunci otomatis", "Ekspor hasil"],
  },
  {
    slug: "flashcards",
    name: "Flashcards",
    description: "Kartu hafalan flip + localStorage.",
    status: "available",
    category: ["study"],
    icon: "style",
    badge: "Flip + Simpan",
    meta: ["Flip interaktif", "Ekspor deck", "Tersimpan lokal"],
  },
  {
    slug: "pomodoro",
    name: "Pomodoro Timer",
    description: "Timer fokus custom + counter sesi tersimpan.",
    status: "available",
    category: ["productivity"],
    icon: "timer",
    badge: "Custom Timer",
    meta: ["Timer custom", "Counter sesi", "Tersimpan lokal"],
  },
  {
    slug: "thesis-checker",
    name: "Thesis Checker",
    description: "Checklist bab, struktur, sitasi & bahasa + progress.",
    status: "available",
    category: ["writing"],
    icon: "checklist",
    badge: "Checklist",
    meta: ["17 item", "Progress %", "Salin laporan"],
  },
  {
    slug: "word-counter",
    name: "Word Counter",
    description: "Hitung kata, karakter, readability & waktu baca.",
    status: "available",
    category: ["writing", "productivity"],
    icon: "function",
    badge: "Bonus",
    meta: ["Flesch + FKGL", "Waktu baca", "100% lokal"],
  },
  {
    slug: "materi",
    name: "Materi & Modul Belajar",
    description:
      "Ruang belajar fleksibel per mata kuliah: atur topik, catatan, sumber, dan tugas berdeadline yang bisa dikirim ke Jadwal. Cari bahan per topik lewat Smart Handoff Scholar/YouTube, plus Transkrip Belajar untuk tempel teks atau impor .srt/.vtt lalu edit, cari, dan unduh TXT.",
    status: "available",
    category: ["study", "productivity"],
    icon: "play_circle",
    badge: "Ruang Belajar + Transkrip",
    meta: ["Topik • catatan • sumber • tugas", "Handoff Scholar • YouTube", "Transkrip .srt/.vtt → TXT"],
  },
  {
    slug: "flowchart-skripsi",
    name: "Roadmap Skripsi",
    description: "Papan 4 fase proposal–wisuda: matriks revisi 14 hari & orisinalitas <20%.",
    status: "available",
    category: ["study", "productivity"],
    icon: "account_tree",
    badge: "4 Fase",
    meta: ["4 fase", "Batas 14 hari", "Orisinalitas <20%"],
  },
  {
    slug: "jadwal",
    name: "Jadwal & Task Board",
    description:
      "Agenda bimbingan, deadline sidang, dan papan tugas skripsi (To Do, Sedang Dikerjakan, Selesai) dengan filter prioritas.",
    status: "beta",
    category: ["study", "productivity"],
    icon: "view_kanban",
    badge: "Kanban Board",
    meta: ["To Do • Doing • Done", "Filter prioritas", "Tersimpan lokal"],
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export const popularSlugs = ["ai-detector", "citation", "gpa", "grade"];

export function getPopularTools(): Tool[] {
  return popularSlugs
    .map((s) => getTool(s))
    .filter((t): t is Tool => Boolean(t));
}
