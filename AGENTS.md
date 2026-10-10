# AGENTS.md — Cademy

## Aturan sync (wajib, setiap sesi)

- Kerja SELALU di `C:\Users\Atmint\cademy`. Flashdisk E: hanya backup.
- Setiap selesai mengubah file apapun di C:, WAJIB jalankan
  `scripts/sync-master.ps1` (C: → E:, otomatis exclude
  `node_modules .next .turbo`) supaya kopi flashdisk selalu sama dengan C:.
  Tanpa ini, sesi AI berikutnya yang buka flashdisk akan baca versi basi.
- Setiap mulai sesi / sebelum ngoding, jalankan `scripts/sync-dev.ps1`
  (E: → C:) bila ragu kopi C: tertinggal.
- Jangan pernah `pnpm install`/`build`/`dev` di E: (exFAT, pasti gagal).

## Environment (baca dulu, ini jebakan utama)

- Repo ini hidup di **dua lokasi**: kerja di `C:\Users\Atmint\cademy` (NTFS),
  flashdisk `E:\folder projek vs code\cademy` (exFAT) **hanya backup/sync**.
- **`pnpm install` GAGAL di flashdisk exFAT** — pnpm butuh symlink/junction yang
  exFAT tidak dukung (`ERR_PNPM_ENOENT` di `node_modules/.pnpm/next@...`).
  Jangan pernah install/build di E:. Selalu di C:.
- Sinkronisasi resmi (robocopy, sudah exclude `node_modules .next .turbo`):
  - sebelum ngoding: `scripts/sync-dev.ps1` (E: → C:)
  - sesudah ngoding: `scripts/sync-master.ps1` (C: → E:)
- Toolchain: `pnpm@9`, `node>=18`, Next.js 14 App Router, Tailwind v3, TS strict.
- Git: remote `origin` ada (branch `main`). Test: `node:test` + `tsx` (devDep, nol runner
  berat) dijalankan lewat `pnpm test` dari root.

## Commands

```bash
pnpm install                                   # di C: saja, pertama kali
pnpm dev                                       # next dev via @cademy/web (:3000)
pnpm test                                      # tsx --test packages/utils/**/*.test.ts (+ literatur/store.test.ts)
pnpm --filter @cademy/web typecheck            # tsc --noEmit
pnpm --filter @cademy/web build                # next build (21 static routes)
```

- Urutan verifikasi: `test` → `typecheck` → `build`. Semua harus dari C: (NTFS).
- `next.config.mjs` kosong (default semua); `lint` = `next lint`.
- `.env.example` hanya berisi `NEXT_PUBLIC_APP_URL` + `NEXT_PUBLIC_AI_DETECTOR_URL`
  (copy ke `.env.local`; jangan commit `.env*`).

## Arsitektur (yang tidak obvious dari nama file)

- `packages/tool-registry/tools.ts` = **source of truth** daftar tool
  (sekarang 15). UI **wajib** import `tools`/`categories`/`getPopularTools` —
  dilarang hardcode daftar tool. Contoh benar: `app/page.tsx`, `app/tools/tools-view.tsx`.
- Tambah tool baru = 1 entri registry + `apps/web/app/tools/[slug]/page.tsx`
  (server, cuma metadata + import) + `view.tsx` (`"use client"`, logika + UI).
- Tiap halaman tool dibungkus `components/ToolShell.tsx` (prev/next + related tools).
- Komponen bersama → `packages/ui`; token warna/font → `packages/design-tokens`;
  validasi input (zod) → `packages/validators`; helper → `packages/utils`.
- **Shared task store**: `apps/web/components/task-store.ts`, key
  `cademy:tasks-v1` (`loadTasks`/`saveTasks`/`bySource`). Dipakai BERSAMA oleh
  `flowchart-skripsi` (source `"roadmap"`), `jadwal` (`"jadwal"`), `study-planner`
  (`"planner"`). Key lama (`cademy:flowchart`, `cademy:planner`, `cademy:jadwal-tugas`)
  tidak dihapus. Tool lain (grade, gpa, flashcards, dsb.) sengaja pakai key sendiri.
- Semua data di localStorage, tanpa database/server. Satu-satunya request eksternal
  adalah CTA user ke AI detector Vercel dari halaman bridge `/tools/ai-detector`.

## Aturan PRD (ditegakkan di kode, jangan dilanggar)

- Visual Neo-Brutalist Comic: border `3px solid black`, shadow `4px 4px 0 black`,
  palet `#0E4A6E`/`#0B2E4B`/`#EAF5FC`/`#FFD02B`/`#D93A2B`, font
  `font-display`/`font-body`/`font-label`. Jangan ubah tanpa arahan desain.
- **Kejujuran data**: tidak ada angka karangan di UI (statistik homepage dihitung
  dari registry), tidak ada klaim "100% AI"/"pasti AI". Label AI detector hanya
  LOW/REVIEW/HIGH INDICATOR.
- Copy UI Bahasa Indonesia, lugas. Target viewport: mobile 390px + desktop 1280px.

## Sumber yang bisa dipercaya vs basi

- Percaya: `packages/tool-registry/tools.ts`, `docs/PRD.md`, `docs/DESIGN.md`,
  `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `todoo.txt` (laporan audit 09 Okt 2026).
- **Basi, jangan jadikan acuan**: tabel tool di `README.md` (bilang 10 tool
  `coming-soon`, salah — registry sudah 14 dan live).
- Abaikan: `bag1.zip`, `bag2.zip`, `emoji-*.js`, `fix-material-icons.js`
  (script maintenance sekali pakai).

## Git (tanpa izin eksplisit: edit + verifikasi saja)

- "selesaikan / update / perbaiki / lanjutkan" = ubah kode + jalankan
  `test` → `typecheck` → `build`. BUKAN izin commit, push, atau deploy.
- Commit hanya bila user tulis kata "commit"; push hanya bila tulis "push";
  deploy hanya bila tulis "deploy". Izin satu sesi tidak berlaku untuk sesi berikut.
- Sebelum ubah kode: `git status --short` + `git branch --show-current` +
  `git log -5 --oneline`. Jangan hapus/timpa/reset pekerjaan user yang belum di-commit.
- Scope sekecil mungkin; masalah di luar scope cukup dilaporkan.
- Bila diminta commit: stage selektif per topik (jangan `add .` bila ada file
  asing seperti `stitch_academic/`), cek `.env*`/token tidak ikut, pesan
  **bahasa indonesia, huruf kecil, sederhana** (contoh: "samakan navigasi
  desktop dan mobile"). Tanpa `feat:`/`fix:`, tanpa emoji. Berhenti setelah
  commit — jangan push kecuali diminta.
- Bila diminta push: cek branch, remote, dan commit yang dikirim; tanpa
  `--force` kecuali diminta eksplisit.
- Dilarang tanpa izin eksplisit: `commit --amend`, `push --force`,
  `reset --hard`, `clean`, `rebase`, ubah git config, skip hooks.
- Laporan akhir selalu sebut: file diubah, hasil verifikasi aktual,
  commit ya/tidak, push ya/tidak, deploy ya/tidak.
