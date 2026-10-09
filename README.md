# Cademy

**Academic Tools for Students**

Cademy adalah platform tools akademik yang membantu mahasiswa mengerjakan kebutuhan kuliah dalam satu tempat — mulai dari pengelolaan referensi dan perhitungan nilai hingga perencanaan belajar dan penyusunan skripsi.

Dirancang dengan pendekatan yang praktis dan mudah digunakan, Cademy menggabungkan berbagai alat akademik dalam satu platform yang terstruktur.

## Features

Cademy menyediakan 15 tools akademik dengan fungsi yang berbeda.

| Kategori | Tools | Fungsi |
|---|---|---|
| **Referensi & Riset** | Citation, Literatur | Membuat sitasi dan mencari referensi akademik |
| **Nilai Akademik** | GPA, Grade | Menghitung IPK dan nilai sidang |
| **Dokumen** | PDF, Word Counter | Membantu pengolahan PDF dan penghitungan kata |
| **Belajar** | Study Planner, Quiz, Flashcards, Pomodoro | Mengatur jadwal belajar, latihan soal, menghafal, dan fokus |
| **Skripsi** | Thesis Checker, Flowchart Skripsi | Membantu pemeriksaan dan perencanaan pengerjaan skripsi |
| **Materi & Produktivitas** | Materi, Jadwal | Mengakses materi belajar, mengatur jadwal, dan mengelola tugas |
| **AI Tools** | AI Detector | Akses ke layanan deteksi teks AI eksternal |

## Tech Stack

- **Framework:** Next.js App Router
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Package Manager:** pnpm
- **Validation:** Zod
- **Architecture:** Monorepo

## Project Structure

```text
cademy/
├── apps/
│   └── web/                 # Next.js application
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── design-tokens/       # Colors, typography, and spacing
│   ├── tool-registry/       # Registry and status of 15 tools
│   ├── validators/          # Input validation with Zod
│   └── utils/               # Shared utilities and core logic
├── docs/
│   ├── PRD.md               # Product requirements
│   ├── ARCHITECTURE.md      # Architecture and design decisions
│   ├── ROADMAP.md           # Development roadmap
│   └── CONTRIBUTING.md      # Contribution guidelines
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Getting Started

### Prerequisites

Pastikan perangkatmu sudah memiliki:

- Node.js versi yang sesuai dengan konfigurasi proyek
- pnpm

### Installation

Clone repository, lalu masuk ke direktori proyek:

```bash
git clone <repository-url>
cd cademy
```

Install dependencies:

```bash
pnpm install
```

Jalankan development server:

```bash
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser untuk mengakses Cademy.

## Tool Registry

Daftar tools dan status ketersediaannya dikelola melalui satu sumber utama:

`packages/tool-registry/tools.ts`

| Tool | Status | Description |
|---|---|---|
| `ai-detector` | External | [AI Detector Mahasiswa](https://ai-detector-mahasiswa.vercel.app) |
| `citation` | Available | Generator sitasi akademik |
| `literatur` | Available | Pencarian literatur dan pengelolaan referensi |
| `gpa` | Available | Kalkulator IPK |
| `grade` | Available | Kalkulator nilai sidang |
| `pdf` | Available | Utilitas pengolahan PDF |
| `study-planner` | Available | Perencana belajar |
| `quiz` | Available | Generator kuis |
| `flashcards` | Available | Kartu hafalan |
| `pomodoro` | Available | Timer fokus belajar |
| `thesis-checker` | Available | Pemeriksaan dan pengelolaan skripsi |
| `word-counter` | Available | Penghitung kata |
| `materi` | Available | Materi dan modul belajar |
| `flowchart-skripsi` | Available | Roadmap pengerjaan skripsi |
| `jadwal` | Beta | Jadwal dan task board |

**Status tools** mengikuti registry proyek. `External` menunjukkan layanan terpisah, sedangkan `Beta` menunjukkan fitur yang masih dalam tahap pengembangan.

## Documentation

Dokumentasi pengembangan tersedia di direktori `docs/`:

- [Product Requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)

## Development Principles

Cademy dikembangkan dengan prinsip berikut:

- **Practicality:** fitur dibuat untuk menyelesaikan kebutuhan akademik yang nyata.
- **Consistency:** komponen dan design tokens digunakan secara konsisten.
- **Maintainability:** logika bersama dipisahkan ke dalam packages agar lebih mudah diuji dan dirawat.
- **Data integrity:** perubahan data dan kompatibilitas penyimpanan perlu dijaga.
- **Transparency:** keterbatasan fitur dan layanan eksternal dijelaskan secara jujur.

## Project Status

Cademy terus dikembangkan. Ketersediaan dan kematangan setiap tool mengikuti status yang tercatat pada registry proyek.

---

*Built to make academic work more organized, practical, and manageable.*
