# PRD — Cademy

**Product:** Cademy
**Former name:** Academic Hub / Akademika
**Status:** Production Specification
**Version:** 3.0.0
**Primary Language:** Bahasa Indonesia
**Design System:** Neo-Comic Cyan & Navy (jangan diubah — lihat `DESIGN.md`)
**Target:** Mobile-first 390px + Desktop 1280px (container 1240px centered)
**Primary Audience:** Mahasiswa, mahasiswa tingkat akhir, peneliti muda

> Legenda status implementasi: ✅ Done · 🚧 P1 (penting, berikutnya) · 🔮 P2 (future).
> Status per 08 Okt 2026, hasil audit + build lolos (`tsc --noEmit` nol error, `next build` 17 route static).

---

# 1. PRODUCT VISION

**Cademy** adalah personal academic workspace untuk membantu mahasiswa mengelola perjalanan akademiknya dalam satu tempat.

Cademy bukan sekadar kumpulan academic tools. Semua fitur harus terasa sebagai bagian dari satu workflow:

**Plan → Work → Track → Analyze → Finish**

Cademy membantu pengguna:

- mengetahui apa yang harus dikerjakan,
- mengatur deadline dan bimbingan,
- mengikuti progress skripsi,
- mengelola task,
- melakukan simulasi nilai,
- menemukan research tools,
- dan melakukan analisis AI-writing sebagai alat bantu tambahan.

### Core positioning

> **Cademy — Your Academic Workspace.**

### Prinsip utama

1. **Simple first** — jangan membuat fitur lebih rumit daripada kebutuhan pengguna.
2. **Useful over impressive** — setiap komponen harus punya fungsi nyata; hindari dashboard yang hanya terlihat kompleks.
3. **Local-first** — fitur personal yang memungkinkan harus tetap bekerja tanpa backend. ✅ (task, jadwal, grade history, roadmap progress = localStorage)
4. **Honest information** — jangan membuat data simulasi terlihat seperti data resmi; jangan menyebut analisis AI sebagai bukti pasti. ✅ (label SIMULASI + Indicator)
5. **Connected experience** — roadmap, task, jadwal, dan progress harus dapat saling berhubungan. 🚧 (roadmap ↔ task board masih localStorage terpisah)
6. **Preserve the visual identity** — jangan mengganti design system hanya karena implementasi lebih mudah. ✅

---

# 2. NON-GOALS

Cademy pada versi awal **BUKAN**: sistem akademik universitas, pengganti SIAKAD, sistem resmi penilaian kampus, plagiarism checker resmi, AI detector yang mengklaim kepastian, social media mahasiswa, LMS penuh, sistem administrasi kampus, platform kolaborasi enterprise.

---

# 3. DESIGN DIRECTION — DO NOT CHANGE

Visual yang sudah ditentukan adalah identitas Cademy dan **tidak boleh dirombak oleh implementasi teknis**. Lihat `DESIGN.md` (v2.4.0) sebagai sumber kebenaran token.

- Typography: Bricolage Grotesque (display) / Plus Jakarta Sans (body) / Space Grotesk (label). Jangan tambah jenis font.
- Color: Sky Blue `#2B7FFF`, Light Blue `#EAF5FC`, Deep Navy `#0B2E4B`, Academic Blue `#0E4A6E`, Alert Yellow `#FFD02B` + neutral/slate secukupnya.
- Visual language: 3px solid outlines, hard offset shadows, flat surfaces, comic accents, rounded secukupnya. Dilarang: gradient berlebihan, glassmorphism, blur, soft SaaS cards, animasi berlebihan, dark cyberpunk.
- Ikon: Material Symbols (`material-symbols-outlined`). **Dilarang emoji mentah di UI** (hasil audit: seluruh emoji sudah dimigrasi).

---

# 4. RESPONSIVE STRATEGY

- **Mobile 390px:** readability, tap target, task completion, navigasi, info ringkas. Mobile bukan desktop yang diperkecil.
- **Desktop 1280px:** ruang horizontal untuk kanban, roadmap, schedule, calculator, directory, dashboard widgets. Jangan lebarkan konten hanya karena viewport besar.

---

# 5. APPLICATION ARCHITECTURE

```text
Cademy
├── /                          Dashboard / Home ✅
├── /tools                      Academic Tool Directory ✅ (11 tools di registry)
├── /tools/flowchart-skripsi    Thesis Roadmap ✅
├── /tools/jadwal               Schedule + Tasks ✅ (baru diimplementasi)
├── /tools/grade                Grade Calculator ✅ (+ history lokal)
├── /tools/ai-detector          AI Writing Analysis ✅ (external bridge)
├── /kuliah/detail              Course Detail 🔮 (belum ada)
└── /about                      About Cademy ✅
```

Stack: pnpm workspaces + Turborepo, `apps/web` Next.js 14 App Router + Tailwind. Registry (`packages/tool-registry`) adalah source of truth status tool — UI dilarang hardcode daftar tools. Lihat `ARCHITECTURE.md`.

Jangan membuat routing yang tidak diperlukan.

---

# 6. HOME / DASHBOARD (`/`) — ✅ inti done, 🚧 panel Today/Progress

Homepage adalah **pusat aktivitas**, bukan landing page. Header: logo Cademy + badge Beta + navigasi + search + area user lokal. Hero: headline + supporting copy + ilustrasi + CTA ("Mulai Sekarang" / "Jelajahi Tools"), Bahasa Indonesia, jangan terlalu tinggi.

🚧 Belum ada (P1): panel **TODAY** (task aktif, bimbingan hari ini, deadline minggu ini → data local state, jangan klaim real-time server) dan **Academic Progress** (progress dari data roadmap/task, bukan hard-code).

---

# 7. THESIS ROADMAP (`/tools/flowchart-skripsi`) — ✅ visual done, 🚧 koneksi task

Signature feature. 4 fase (Proposal → Pelaksanaan → Revisi & Validasi → Kelulusan & Wisuda), status fase Belum Dimulai/Berjalan/Selesai, progress dihitung dari task (`7 / 10 task selesai`).

🚧 P1: task roadmap muncul otomatis di Task Board (`Roadmap → Task Board → due date → progress fase`). Model `Task { id, title, description, status, priority, dueDate, phaseId, createdAt, completedAt }`.

---

# 8. TASK BOARD + SCHEDULE (`/tools/jadwal`) — ✅ done

Kanban TO DO / SEDANG DIKERJAKAN / SELESAI: buat, edit, pindah, selesai, hapus + priority + deadline + source/phase. Weekly schedule SEN–MIN, agenda (title, date, time, type, priority, notes). Deadline berstatus Upcoming / Due Today / Overdue / Completed — warna konsisten + tidak mengandalkan warna saja (aksesibel color-blind). MVP: localStorage/IndexedDB, tanpa backend.

---

# 9. GRADE CALCULATOR (`/tools/grade`) — ✅ done

Preset 40/30/30, 50/25/25, Custom. Input Ketua Pembimbing / Penguji I / Penguji II. Formula skor × bobot; validasi bobot = 100% ("Bobot harus berjumlah 100%."). Output selalu berlabel **SIMULASI** (bukan keputusan resmi kampus); predikat configurable. History simulasi lokal (Proposal / Semhas / Sidang). 🚧 P1: export PDF rekap dari data aktual.

---

# 10. TOOL DIRECTORY (`/tools`) — ✅ done (11 tools, target 48 = P1)

Kategori: Semua, Penulisan & Skripsi, Riset & Jurnal, Matematika & IPK, Produktivitas, Arsip Dokumen. Search + filter harus benar-benar bekerja (bukan dekoratif). Kartu: nama, deskripsi, kategori, status, action. Status: TERSEDIA (bisa dipakai) / EKSTERNAL (link ↗ jelas, tanpa iframe) / FASE BETA / SEGERA HADIR (**tanpa CTA palsu**).

> Catatan jujur: target 48 curated tools vs 11 di registry saat ini. Tambahan berikutnya masuk P1; dilarang tombol `onclick = () => {}` (§45).

---

# 11. AI WRITING ANALYSIS (`/tools/ai-detector`) — ✅ bridge done, 🚧 copy threshold

Diposisikan sebagai **AI Writing Analysis**, bukan vonis. Istilah: Indicator / Signal / Pattern / Analysis. Dilarang: "100% AI", "Pasti AI", "Terbukti AI". Threshold UI: 0–44 LOW / 45–69 REVIEW / 70–100 HIGH INDICATOR (indikator UI, bukan standar institusi). Privasi eksplisit: teks tidak disimpan permanen; API key tidak di client (Client → Cademy API → Provider); timeout + handle failure. Error state: "Analisis sementara tidak tersedia." — jangan tampilkan "AI Score: 0%".

---

# 12. DATA & LOCAL-FIRST — ✅ pola done, 🚧 export/import

MVP: Static Data + Local State + LocalStorage/IndexedDB (task, roadmap progress, schedule, grade history, preferences). Model: `Task`, `ScheduleEvent { id, title, date, time, type, notes }`, `RoadmapPhase { id, title, description, status, tasks[] }`, `GradeSimulation { id, name, scores[], weights[], finalScore, createdAt }`.

Wajib handle: corrupted JSON, storage unavailable, quota exceeded, old schema/migrasi — tampilkan "Data lokal tidak dapat dibaca." tanpa crash. 🚧 P1: Export/Import/Reset JSON (reset selalu konfirmasi).

---

# 13. STATES, A11Y, FEEDBACK — ✅ sebagian, 🚧 P1

Setiap fitur: empty state ("Belum ada task… [Tambah Task]"), loading (skeleton hanya bila memang async), error, success. Target WCAG AA: keyboard nav, visible focus, semantic HTML, aria-label, tap target nyaman, warna bukan satu-satunya indikator. Toast ringan (task dibuat, data disimpan…). 🚧 P1: global search (`Ctrl/Cmd+K`, cari tools/pages/tasks/phase; Escape menutup), mobile bottom nav (Home/Tools/Tasks/Schedule/More).

---

# 14. CONTENT & CONTRAST RULES

- Bahasa UI: **Bahasa Indonesia**, jelas, santai-profesional, tidak bertele-tele ("Tambahkan task yang perlu kamu kerjakan").
- Istilah konsisten: Task, Jadwal, Deadline, Progress, Roadmap, Simulasi, Analisis, Tools.
- Form: required, validasi, error message ("Judul task wajib diisi."), success, disabled/loading — jangan andalkan error browser.
- Tanggal: jangan hard-code ("Mei 2025", "H-18"); pakai current date, presentasi `Asia/Jakarta`.
- Security: tanpa hard-code key, tanpa secret di localStorage/bundle, tanpa logging raw academic text.
- Performance: render awal cepat, JS minimal, lazy-load fitur berat, tanpa library demi satu komponen.
- Offline-first: roadmap/task/schedule/grade/history/preferensi tetap jalan offline; fitur eksternal jelaskan butuh internet.
- Print: layout print-friendly (tanpa nav/dekorasi berlebih) untuk rekap nilai & matriks revisi.

---

# 15. NO FAKE / DEMO RULES

- Dilarang fake functionality dan dummy data yang terlihat seperti data pengguna. Data preview wajib berlabel **Demo Data** vs **Your Data**; sediakan "Try Demo" yang bisa dihapus.
- About (`/about`): apa itu Cademy, philosophy, fitur, teknologi, privasi, roadmap, credits — jangan terlalu panjang.

---

# 16. FEATURE PRIORITY

- **P0 Core (wajib, ✅ sebagian besar done):** Dashboard, Roadmap, Task Board, Schedule, Grade Calculator, Tool Directory, responsive UI, local persistence. Sisa P0: panel Today/Progress di homepage, koneksi Roadmap→Task.
- **P1 Important (🚧 berikutnya):** grade history polish, export/import data, global search, AI copy threshold, print/export, states lengkap.
- **P2 Future (🔮):** account, cloud sync, multi-device, backup, calendar integration, kolaborasi, supervisor access, institution templates.

Jangan membangun P2 sebelum P0 stabil.

---

# 17. DEFINITION OF DONE

Fitur selesai jika: UI sesuai design system · mobile + desktop responsive · state berfungsi · persistence bekerja bila perlu · empty + error state ada · a11y dasar · tanpa fake interaction · tidak merusak halaman lain.

---

# 18. FINAL FLOW & BRAND

```text
OPEN CADEMY → DASHBOARD ("What should I do today?") → TASK/DEADLINE → ROADMAP
→ WORK → SCHEDULE/SUPERVISION → REVISION → GRADE SIMULATION → AI WRITING REVIEW → FINISH
```

Tools directory = supporting ecosystem, bukan pusat perhatian. Cademy menjawab 3 pertanyaan dalam hitungan detik: (1) Apa yang harus aku kerjakan? → Tasks/Today. (2) Aku di tahap mana? → Roadmap/Progress. (3) Apa yang membantuku? → Tools.

**Cademy — Your Academic Workspace.** Bukan SIAKAD, bukan LMS: ruang kerja personal yang mengubah perjalanan akademik yang berantakan menjadi lebih terarah, terukur, dan mudah dikerjakan.

---

# FINAL IMPLEMENTATION DIRECTIVE

1. Pertahankan visual/design yang sudah ditentukan. 2. Pastikan seluruh fitur benar-benar berfungsi. 3. Hubungkan roadmap → task → progress → deadline. 4. Local-first untuk fitur personal. 5. Tanpa fake functionality. 6. Tanpa dummy data sebagai data pengguna. 7. Tangani loading, empty, error, success, offline. 8. Mobile 390px nyaman. 9. Desktop 1280px manfaatkan ruang. 10. Tanpa fitur demi terlihat kompleks. 11. Tanpa ubah visual identity tanpa instruksi eksplisit. 12. Konflik implementasi vs visual → pertahankan visual. 13. Fitur belum siap → status jujur, bukan simulasi palsu. 14. Bahasa Indonesia natural. 15. Utamakan usability, consistency, accessibility, performance, maintainability.
