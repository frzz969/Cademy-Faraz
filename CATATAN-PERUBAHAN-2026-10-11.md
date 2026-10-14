# Catatan Perubahan — 11 Oktober 2026

Lanjutan dari `CATATAN-PERUBAHAN-2026-10-10.md` (file itu tidak ditimpa).
Bahasa Indonesia, lugas. Hanya yang terverifikasi yang diklaim.

## 1. Ringkasan sesi 11 Oktober 2026

1. **Git: folder `stitch_academic/` dikeluarkan dari repo.** Commit
   `2f1d5da` ("keluarkan folder stitch academic dari repo") ada di HEAD.
   Status push tidak diverifikasi sesi ini.
2. **Tahap 3 — Verifikasi Integrasi dan Keamanan Data.** 12 skenario
   (S1–S12) direkonstruksi dari kontrak kode karena file 10-10 tidak memuat
   daftar "Tahap 3 (skenario 1-12)" eksplisit. Hasil: semua skenario otomatis
   LULUS; uji manual browser BELUM DIUJI (tidak ada browser di lingkungan ini).
3. **Dua bug terbukti dan diperbaiki** di `packages/utils/dates.ts`
   (B1 tanggal palsu, B2 pencarian + filter tanggal selalu kosong).
   Lihat bagian 5.
4. **Kritik teman (Fadil): nama pasti "Cademy", full bahasa Indonesia,
   dan penyederhanaan tampilan.** Dikerjakan sebagai penggantian teks +
   pelipatan/pemindahan seksi (tanpa ubah logika data). Lima titik
   penyederhanaan di bawah diringkas dari diff aktual (bukan daftar
   dari Fadil kata-per-kata):
   - Roadmap: saat dibuka hanya fase yang sedang berjalan yang terbuka;
     tombol Ubah/Naik/Turun/Hapus fase disembunyikan di balik tombol "Atur";
     nav "alat terkait" duplikat dimatikan (`relatedSlot` kosong).
   - Jadwal: tombol Urungkan/Ekspor/Impor dilipat ke `<details>` "Lainnya";
     4 kartu statistik menjadi satu baris ringkas.
   - Planner: seksi Tugas Lintas-Sumber hanya tampil di tab kanban;
     tombol "Tambah Tugas Baru" dipindah ke atas seksi tim.
   - Semua label Inggris → Indonesia (To Do → Belum Dikerjakan,
     Undo → Urungkan, Timeline → Linimasa, Reset → Atur Ulang, dsb).
   - Nama/eyebrow diseragamkan ke "Cademy" (lihat bagian 6).

## 2. Alur data & navigasi

### Navigasi

```text
Homepage (/) → Katalog (/tools, cari ?q= + filter ?cat= + paginasi 8)
  → tiap tool (/tools/[slug]) dibungkus ToolShell
    → ToolShell: tombol Kembali, info alat, nav sebelum/berikut + alat terkait
```

- Homepage: hero + form cari (GET `/tools?q=`) + Tools Populer
  (dari `getPopularTools`) + statistik yang dihitung dari registry
  (bukan angka karangan).
- Katalog: `tools-view.tsx` membaca `tools` + `categories` dari
  `packages/tool-registry` (source of truth, 15 tool). Dilarang hardcode
  daftar tool di UI.
- Tambah tool baru = 1 entri registry + `page.tsx` (server, metadata) +
  `view.tsx` (`"use client"`, logika + UI).

### Shared task store (satu sumber data)

- Key **`cademy:tasks-v1`** (`apps/web/components/task-store.ts`:
  `loadTasks`/`saveTasks`/`bySource` + CRUD, subtugas, arsip, undo sesi,
  backup JSON, migrasi aman).
- Dipakai bersama oleh **Roadmap** (`source:roadmap`) ↔ **Jadwal**
  (`jadwal` + `pribadi`) ↔ **Planner** (`planner`) ↔ **Materi**
  (mengirim tugas lewat tautan, `source:materi`).
- Aturan main: ID stabil berprefiks sumber, dedupe by ID, `source` asli
  dipertahankan saat sinkron, key lama (`cademy:flowchart`,
  `cademy:planner`, `cademy:jadwal-tugas`) tidak dihapus.
- Undo hanya seumur tab (in-memory, maks 20 langkah) — tidak diklaim permanen.

### Key lokal per tool lain (sengaja terpisah, datanya beda bentuk)

| Key | Isi |
|---|---|
| `cademy:flowchart` | Fase roadmap kustom + matriks revisi + kemiripan naskah |
| `cademy:jadwal-agenda` | Agenda mingguan Jadwal (struktur beda dari task) |
| `cademy:planner-target` | Label + tanggal target kelulusan Planner |
| `cademy:thesis-v2` / `cademy:thesis` (lama) | Proyek Thesis Checker v2 + migrasi v1 |
| `cademy:bimbingan-v1` | Log bimbingan (mandiri dari tugas) |
| `cademy:literatur-favs-v1` / `cademy:literatur-matrix-v1` / `cademy:proj-refs-v1` | Favorit, matriks, relasi referensi↔proyek |
| `cademy:cite-prefill-v1` | Jembatan sekali-baca Literatur → Citation (dihapus setelah dibaca) |
| `cademy:workspaces-v1` / `cademy:transcripts-v1` / arsip `cademy:materi-progress`, `cademy:materi-last` | Workspace + transkrip Materi |
| `cademy:sidang` | Riwayat simulasi nilai (Grade) |
| `cademy:gpa-v1` | Baris mata kuliah + IPK lalu (GPA) |
| `cademy:quiz-v1` | Materi + soal terakhir (Quiz) |
| `cademy:flashcards` | Deck kartu (Flashcards) |
| `cademy:pomodoro` | Durasi, sesi, total menit + log sesi (Pomodoro) |
| `literatur-last-q` | Kata kunci terakhir (preferensi, bukan data) |

Catatan jujur: backup JSON (`Ekspor`/`Impor`) hanya mencakup
`cademy:tasks-v1`, bukan seluruh localStorage (tiap tool punya ekspor
sendiri atau belum punya).

## 3. Isi tiap tool (15, sesuai registry + kode aktual)

1. **AI Detector** (`ai-detector`, external). Simulasi heuristik lokal untuk
   edukasi (label LOW/REVIEW/HIGH INDICATOR, skor di-clamp, teks tidak
   disimpan permanen) + CTA ke aplikasi eksternal. Alur: tempel teks →
   lihat indikator + penjelasan pola → buka tool eksternal bila perlu.
2. **Citation Generator** (`citation`, available). Susun sitasi APA 7, MLA 9,
   Chicago, IEEE, Harvard + BibTeX, 100% client-side, isi otomatis dari DOI
   (Crossref). Alur: pilih jenis sumber → isi field (atau tempel DOI) →
   salin hasil / ekspor BibTeX. Menerima prefill sekali-baca dari Literatur.
3. **Pencari Jurnal** (`literatur`, available). Cari artikel via OpenAlex
   (butuh internet) + direktori Sinta/Garuda/DOAJ/Scholar; favorit, koleksi,
   status baca, matriks literatur, ekspor CSV/Markdown, backup JSON, tautan
   referensi↔proyek skripsi. Alur: cari → saring → favoritkan →
   kirim ke sitasi / tautkan ke bab.
4. **GPA Calculator** (`gpa`, available). Simulasi IP semester, IPK kumulatif,
   dan target Cumlaude; skala UNAS/UNY; data di `cademy:gpa-v1`. Alur: isi
   mata kuliah (SKS + nilai) → lihat IP/IPK + predikat → simulasi target.
5. **Kalkulator Nilai Sidang** (`grade`, available). Preset bobot 40/30/30 &
   50/25/25 + custom (wajib total 100), nilai 3 penilai, huruf mutu,
   riwayat di `cademy:sidang`, selalu berlabel SIMULASI. Alur: isi nilai →
   atur bobot → lihat hasil + salin rekap.
6. **PDF Tools** (`pdf`, available). Validasi magic bytes `%PDF-`, estimasi
   halaman, ekstrak teks client-side, batas 20MB, tanpa upload/tanpa simpan.
   Alur: pilih file → lihat validitas + halaman + teks.
7. **Study Planner** (`study-planner`, available). Kini berjudul "Perencana
   Belajar": agenda + linimasa mingguan + papan kanban + hitung mundur
   target (`cademy:planner-target`) + seksi Tugas Lintas-Sumber yang bisa
   diedit (tersinkron ke Jadwal/Roadmap). Alur: atur target → tambah tugas
   → kelola di agenda/kanban → pantau lintas-sumber di tab kanban.
8. **Quiz Generator** (`quiz`, available). Tempel materi → soal pilihan ganda,
   benar/salah, esai + kunci otomatis (template-based, tanpa AI server);
   state terakhir di `cademy:quiz-v1`. Alur: tempel materi → atur jumlah →
   kerjakan → lihat skor + ekspor hasil.
9. **Flashcards** (`flashcards`, available). Kartu depan-belakang dengan flip,
   tambah/hapus, ekspor deck teks; data di `cademy:flashcards`. Alur: buat
   kartu → klik untuk membalik → ekspor bila perlu.
10. **Pomodoro Timer** (`pomodoro`, available). Timer fokus custom + jeda,
    penghitung sesi + log sesi anti-drift di `cademy:pomodoro`. Alur: atur
    durasi → mulai fokus → istirahat → lihat riwayat sesi.
11. **Thesis Checker** (`thesis-checker`, available). Checklist 17 item per
    proyek (bab, struktur, sitasi, bahasa) + progres + status 3-tombol +
    bridge tugas anti-duplikat + Log Bimbingan (`cademy:bimbingan-v1`,
    mandiri dari tugas) + laporan .md (ditulis jujur: bukan cadangan data).
    Alur: pilih/buat proyek → centang item → catat bimbingan → unduh laporan.
12. **Word Counter** (`word-counter`, available). Hitung kata, karakter,
    kalimat, suku kata, skor Flesch + FKGL, waktu baca; tanpa simpan.
    Alur: tempel teks → baca statistik.
13. **Materi & Modul Belajar** (`materi`, available). Ruang per mata kuliah:
    topik + catatan + sumber + tugas berdeadline yang bisa dikirim ke
    Jadwal (tautan ke `cademy:tasks-v1`); Smart Handoff (cari per topik via
    Scholar/YouTube, jujur: hasil eksternal, bukan ambilan Cademy);
    Transkrip Belajar (tempel teks / impor .srt/.vtt → edit, cari, unduh
    TXT) di `cademy:transcripts-v1`. Alur: buat workspace → isi topik →
    handoff/transkrip → kirim tugas ke Jadwal.
14. **Roadmap Skripsi** (`flowchart-skripsi`, available). Papan 4 fase
    (Proposal, Pelaksanaan Sidang, Revisi & Validasi, Kelulusan & Wisuda)
    yang bisa tambah/ubah/hapus/susun ulang; checklist per langkah +
    deadline + catatan; matriks revisi tanpa batas (hitung mundur jujur,
    "14 hari" hanya acuan); kemiripan naskah berlabel acuan umum. Menulis
    `source:roadmap` ke store bersama. Alur: buka fase berjalan → centang
    langkah → catat revisi → progres otomatis.
15. **Jadwal & Task Board** (`jadwal`, beta). Satu kolom vertikal: target
    kelulusan → cari + filter pintar → aksi data (terlipat) → strip pekan →
    agenda → kanban (Belum/Sedang/Selesai) → tim → form. Semua kartu
    (jadwal/pribadi/roadmap/materi) bisa digeser, diedit, disubtugas, dan
    dihapus; perubahan roadmap/materi tersinkron tanpa duplikat. Alur:
    tambah tugas → geser status di kanban → saring per hari/minggu → ekspor
    cadangan.

## 4. Detail perubahan file per file (sesi 10–11 Okt)

Sesi 10 Okt (dari file 10-10, diringkas): `task-store.ts` ditulis ulang
(CRUD, ID stabil, normalisasi, subtugas, arsip, undo sesi, backup);
`jadwal/view.tsx` jadi satu kolom vertikal + kartu lintas-sumber editable;
`flowchart-skripsi/view.tsx` fase fleksibel + revisi tak terbatas;
`study-planner/view.tsx` lintas-sumber editable; `dates.ts` helper murni.

Sesi 11 Okt (diff aktual vs HEAD, `git diff --stat`: 21 file):

- `packages/utils/dates.ts` — **B1**: `parseTanggalISO` menolak bulan/hari
  tak valid via cek round-trip (sebelumnya `2026-13-01` → `2027-01-01`,
  `2026-02-30` → `2026-03-02`). **B2**: `cocokFilterCepat` menggabung
  pencarian dengan filter tanggal/status (AND); sebelumnya cari + filter
  tanggal selalu kosong. Perilaku filter `semua`/prioritas tak berubah.
- `packages/utils/dates.test.ts` — +14 tes (S6/S7/S8 + 2 tes REGRESI B1/B2).
- `apps/web/app/tools/jadwal/tahap3-integrasi.test.ts` — file baru, +21 tes
  (S5/S9/S10/S11/S12).
- `package.json` — skrip `test` ditambah file tes baru. Tanpa dependensi baru.
- `apps/web/app/tools/jadwal/view.tsx` — label ID (Belum Dikerjakan,
  Urungkan, Ekspor/Impor, Atur Ulang, tugas bukan task); aksi data dilipat
  ke `<details>`; 4 kartu statistik → satu baris ringkas.
- `apps/web/app/tools/study-planner/view.tsx` — eyebrow `Akademika` →
  `Alat Studi`, judul `Jadwal Kuliah` → `Perencana Belajar` (tidak lagi
  menabrak tool Jadwal); Timeline → Linimasa, Kanban Board → Papan Kanban;
  lintas-sumber hanya di tab kanban; tombol Tambah di atas seksi tim.
- `apps/web/app/tools/flowchart-skripsi/view.tsx` — eyebrow → `Cademy / Alat`;
  hanya fase berjalan yang terbuka saat muat; tombol fase (Ubah/↑/↓/Hapus)
  di balik mode "Atur"; `relatedSlot` dikosongkan; "Salin rekap" → "Salin
  ringkasan", "Reset" → "Atur Ulang", "tools terkait" → "alat terkait".
- 10 view lain (`ai-detector`, `citation`, `flashcards`, `gpa`, `literatur`,
  `pdf`, `pomodoro`, `quiz`, `thesis-checker`, `word-counter`) — satu baris:
  eyebrow `Hub / Alat` → `Cademy / Alat`.
- `apps/web/components/ToolShell.tsx` — default eyebrow → `Cademy / Alat`;
  `tools` → `alat` pada aria-label dan judul seksi (navigasi, terkait).
- `apps/web/app/page.tsx` — hero, badge, dan CTA populer → Indonesia
  (cth. "THE ALL-IN-ONE ACADEMIC SUITE" → "RANGKAIAN AKADEMIK SERBA BISA",
  "ZERO BS" → "TANPA RIBET", Open/Launch Tool/Calculate/Check Grades →
  Buka/Gunakan Alat/Hitung/Cek Nilai).
- `apps/web/app/about/page.tsx` — "About Academic Hub" → "Tentang Cademy";
  sisa Inggris → Indonesia ("Respons 0ms di Browser", "Tanpa Simpan Data",
  "Tumpukan Teknologi Modern", "Performa Tinggi • Monorepo").
- `apps/web/app/tools/jadwal/page.tsx`, `study-planner/page.tsx` —
  metadata deskripsi → Indonesia (To Do → Belum Dikerjakan, countdown →
  hitung mundur, timeline → linimasa).

## 5. Hasil verifikasi aktual

| Langkah | Hasil |
|---|---|
| `pnpm test` (dari C:) | **173 test lolos, 0 gagal** (45 suites; baseline 138 + 35 baru) |
| `pnpm --filter @cademy/web typecheck` | bersih, 0 error |
| `pnpm --filter @cademy/web build` | sukses, 21 route statik |
| Uji manual browser (klik-per-klik, refresh, cek silang UI) | **BELUM DIUJI** — tidak ada browser di lingkungan ini; tidak diklaim lolos |

S1–S12 otomatis LULUS (S1–S4 file kontrak lama, S5/S9–S12 file baru,
S6–S8 `dates.test.ts`). Fungsionalitas dalam view yang tak terekspor
(muatLintas/geserLintas Roadmap `open` default) diverifikasi lewat
kontrak store-nya, bukan klik UI — dicatat jujur sebagai celah uji.

## 6. Keputusan: nama "Cademy" + bahasa Indonesia

Aturan: satu nama (**Cademy**), satu bahasa UI (**Indonesia**). Nama lama
"Academic Hub"/"Akademika"/"Hub" hanya tersisa di riwayat git dan dokumen
lama (tidak di UI). Istilah teknis yang umum (Kanban, To-Do sebagai nilai
internal, BibTeX, OpenAlex) dibiarkan.

| Sebelum | Sesudah |
|---|---|
| About Academic Hub | Tentang Cademy |
| Hub / Alat, Akademika (eyebrow) | Cademy / Alat, Alat Studi |
| Jadwal Kuliah (judul planner, duplikat) | Perencana Belajar |
| To Do / Undo / Reset filter / Reset | Belum Dikerjakan / Urungkan / Atur Ulang |
| Timeline / Kanban Board / Tools terkait | Linimasa / Papan Kanban / Alat terkait |
| Ekspor/Impor JSON, Impor cadangan JSON | Ekspor/Impor, Impor cadangan |
| THE ALL-IN-ONE ACADEMIC SUITE / ZERO BS | RANGKAIAN AKADEMIK SERBA BISA / TANPA RIBET |
| Open / Launch Tool / Calculate / Check Grades | Buka / Gunakan Alat / Hitung / Cek Nilai |
| Teknologi di Balik Academic Hub | Teknologi di Balik Cademy |
| Salin rekap | Salin ringkasan |

## 7. Keterbatasan & langkah berikut (belum dikerjakan)

1. **Arsip belum punya UI** — helper `arsipkanTugas` ada, tombol arsip/buka
   arsip belum ada (Tahap 4, butuh ACC desain).
2. **Pencarian terpusat lintas tool** belum ada (tiap tool cari sendiri).
3. **Kalender masih strip pekan** (Jadwal Sen–Sab, Planner 7 hari) — belum
   kalender bulanan + navigasi bulan. Catatan: filter `minggu-ini` mencakup
   Minggu, strip Jadwal tidak.
4. **Backup hanya `cademy:tasks-v1`** — bimbingan (`cademy:bimbingan-v1`)
   dan proyek thesis belum punya backup (JANGAN anggap laporan .md sebagai
   backup; sudah ditulis jujur di UI).
5. **Sumber `pribadi`** baru tampil di Jadwal; Planner masih jadwal/roadmap/
   materi. Planner memetakan `rendah`→`normal` diam-diam saat edit lintas.
6. **Konflik dueDate roadmap**: definisi langkah vs edit Jadwal yang
   sama-sama terisi → definisi langkah menang (butuh resolusi timestamp).
7. **Jadwal tak refresh lintas-tab** (Planner punya listener focus/storage).
8. **Avatar tim & "Akses Baca & Komentar" statis** — sudah berlabel contoh,
   belum backend (by design, local-first).
9. **Manual browser acceptance BELUM DIJALANKAN** — prioritas berikut:
   ubah status → refresh, cek silang Jadwal↔Roadmap↔Planner, `pnpm dev`.

## Git

- Commit `2f1d5da` mengeluarkan `stitch_academic/` dari repo (HEAD).
- Sesi ini: tidak ada commit, tidak ada push, tidak ada deploy, tidak ada
  sync C:→E: — hanya menulis file catatan ini di C:.
