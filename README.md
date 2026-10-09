# Cademy

Platform tools akademik untuk mahasiswa — sitasi, GPA, grade, PDF, study planner, kuis, flashcards, AI detector (eksternal), pomodoro, dan thesis checker.

## Struktur Monorepo

```
cademy/
├── apps/web/               # Next.js App Router + Tailwind
├── packages/
│   ├── ui/                 # Komponen UI bersama
│   ├── design-tokens/      # Warna, tipografi, spacing
│   ├── tool-registry/      # Registry 15 tools + status
│   ├── validators/         # Validasi input (zod)
│   └── utils/              # Helper bersama
├── docs/                   # PRD, Arsitektur, Roadmap
```

## Quickstart

```bash
pnpm install
pnpm dev
```

Web berjalan di `http://localhost:3000`.

## Tools

| Slug | Status | Keterangan |
|------|--------|------------|
| ai-detector | external | https://ai-detector-mahasiswa.vercel.app |
| citation | available | Generator sitasi |
| literatur | available | Pencari jurnal |
| gpa | available | Kalkulator IPK |
| grade | available | Kalkulator nilai sidang |
| pdf | available | Tools PDF |
| study-planner | available | Perencana belajar |
| quiz | available | Generator kuis |
| flashcards | available | Kartu hafalan |
| pomodoro | available | Timer fokus |
| thesis-checker | available | Pemeriksa skripsi |
| word-counter | available | Penghitung kata |
| materi | available | Materi & modul belajar |
| flowchart-skripsi | available | Roadmap skripsi |
| jadwal | beta | Jadwal & task board |

Lihat `packages/tool-registry/tools.ts` sebagai sumber kebenaran.

## Dokumen

- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/CONTRIBUTING.md`
