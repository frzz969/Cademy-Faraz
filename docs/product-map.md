# Peta Produk (Adendum)

> Adendum pemetaan route → tanggung jawab. Bukti berupa `file:baris`.
> Bahasa Indonesia. Tidak mengubah PRD/ARCHITECTURE/DESIGN/ROADMAP/CONTRIBUTING.

## Layout tunggal

- `apps/web/app/layout.tsx` — header tetap (z-50) + `<main>` + footer + `<BottomNav />`
  (`layout.tsx:32,85-86,121`).
- Navigasi baku dari satu sumber: `apps/web/components/nav-items.ts:14-20` —
  Beranda `/`, Kuliah `/tools/materi`, Tools `/tools`, Jadwal `/tools/jadwal`,
  Tentang `/about`. Aturan aktif konsisten desktop-mobile (`nav-items.ts:29-37`),
  dipakai `HeaderNav.tsx:4` dan `BottomNav.tsx:6`.

## Route

- `/` — `apps/web/app/page.tsx`. Beranda.
- `/about` — `apps/web/app/about/`. Tentang + ketentuan/privasi/kontak
  (ditaut dari footer `layout.tsx:103-111`).
- `/tools` — `apps/web/app/tools/page.tsx` (Suspense) + `tools-view.tsx`:
  katalog dari registry, filter `?q=` + `?cat=` + `?focus=search`
  (`tools-view.tsx:33-36,49-56`), filter nama/deskripsi/meta + kategori
  (`tools-view.tsx:68-74`), paginasi 8 (`tools-view.tsx:43,75-76`),
  bookmark toggle in-memory + toast (`tools-view.tsx:41,230-236` —
  tidak ada `localStorage` di file ini, jadi penanda hilang saat reload).
- `/tools/<slug>` ×15 — tiap direktori punya `page.tsx` tipis (metadata +
  render view), contoh `jadwal/page.tsx:1-12`. Daftar `page.tsx` per tool:
  ai-detector, citation, flashcards, flowchart-skripsi, gpa, grade, jadwal,
  literatur, materi, pdf, pomodoro, quiz, study-planner, thesis-checker,
  word-counter (15 file, tanpa rute dinamis `[slug]`).
- `/tools/ai-detector` — satu-satunya entri `status:"external"` di
  `packages/tool-registry/tools.ts:31-42` (dibuka di tab baru via
  `ToolShell toolHref`).

## ToolShell

`apps/web/components/ToolShell.tsx` — cangkang halaman tool:

- Breadcrumb "Kembali" ke `/tools` + eyebrow/judul (`ToolShell.tsx:71-82`).
- Prev/next **melewati** entri external: daftar internal
  `tools.filter(t => t.status !== "external")` (`ToolShell.tsx:56-59`),
  posisi internal + prev/next internal (`ToolShell.tsx:60-67`).
  Klaim lama sebaliknya (prev/next bisa lontar ke tab luar) sudah basi.
- Kartu related tetap boleh menampilkan entri external, dengan badge
  "External • tab baru" (`ToolShell.tsx:68-74` + badge external).

## Error boundary

- `apps/web/app/error.tsx` — boundary per-segmen (`"use client"`,
  `{error, reset}`): kartu brutal + judul "Ups, halaman bermasalah" +
  `error.message` (fallback umum) + tombol "Coba lagi" (`reset()`) +
  link "Kembali ke Beranda" (`/`).
- `apps/web/app/global-error.tsx` — boundary terakhir dengan
  `<html>/<body>` mandiri + inline style (root layout ikut error,
  tetap terbaca walau CSS gagal), pesan + tombol yang sama.
