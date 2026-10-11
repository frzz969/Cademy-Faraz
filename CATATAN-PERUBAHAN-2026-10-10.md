# Catatan Perubahan — Roadmap Skripsi & Jadwal Kuliah

Tanggal: 10 Oktober 2026
Cakupan: perbaikan fleksibilitas tugas, layout vertikal, dan sinkronisasi data lintas-tool.
Prinsip: tetap Neo-Comic, tanpa redesign global, tanpa dependensi baru, tanpa backend.

## Ringkasan arsitektur sebelum sesi

- Roadmap Skripsi = `flowchart-skripsi/view.tsx` (pemilik `source:roadmap`), Jadwal =
  `jadwal/view.tsx`, Study Planner = `study-planner/view.tsx`.
- Store bersama: `cademy:tasks-v1` (`SharedTask`), dipakai ketiganya.
- Masalah utama: roadmap tampil READ-ONLY di Jadwal, layout Jadwal 2 kolom
  (`lg:grid-cols-12`), Study Planner 12 tugas read-only, 4 fase terkunci.

## File yang diubah

### 1. `apps/web/components/task-store.ts` (ditulis ulang)

Sebelum: 142 baris, hanya `loadTasks/saveTasks/bySource`.

Sesudah: fondasi data lengkap.

- Tipe baru: `TaskSource` bertambah `pribadi`; `SharedTask` bertambah
  `notes`, `subtasks`, `arsip`, `phaseTitle`.
- ID stabil: `uid(prefix)` menghasilkan `{sumber}-{waktu}-{acak}`, bukan judul.
- `normalizeTask()` + `normalizeList()`: validasi tiap record, dedupe by ID,
  buang data rusak tanpa menghapus seluruh daftar.
- CRUD bersama: `createTask`, `updateTask`, `setTaskStatus`, `removeTask`.
- Subtugas: `tambahSubtask`, `hapusSubtask`, `toggleSubtask`, `taskProgress`.
- Progres: `hitungProgres` dan `taskProgress` — aturan konsisten:
  ada subtugas → persen dari subtugas; kalau tidak → status/progres.
  Aman saat 0 tugas (tidak ada pembagian nol).
- Arsip: `arsipkanTugas` (sembunyikan tanpa hapus).
- Undo: `pushRiwayat`, `undoTask`, `bisaUndo`, `labelUndo` (maks 20 langkah,
  hanya seumur tab — hilang saat refresh; UI tidak mengklaim permanen).
- Backup: `buatCadangan`, `bacaCadangan` (validasi magic + versi, pesan error
  yang jelas), `gabungCadangan(mode "gabung" | "ganti")` — dedupe by ID,
  kalah/tanggal-menang-tanggal, data lama tidak dirusak.
- Migrasi lama (`cademy:flowchart`, `cademy:planner`, `cademy:jadwal-tugas`)
  tetap jalan, key lama tidak dihapus.
- Perilaku baru: data rusak total tidak lagi memicu error, hanya daftar kosong.

### 2. `apps/web/app/tools/jadwal/view.tsx`

- Layout: grid 2 kolom `lg:grid-cols-12` + switcher mobile Agenda/Kanban
  dihapus. Sekarang satu kolom vertikal: header → statistik → kalender pekan →
  agenda → Kanban → tim → form tambah tugas.
- Kartu roadmap/materi/pribadi tidak lagi read-only: bisa geser status,
  edit judul/catatan/deadline/prioritas, subtugas, dan hapus (dengan konfirmasi).
- Sumber data lama "EDIT DI ROADMAP" jadi badge kecil (`Roadmap` / `Materi` /
  `Pribadi` / `Jadwal`).
- `susunSimpanJadwal` baru menulis slice `jadwal`+`pribadi` dan MENYINKRONKAN
  perubahan roadmap/materi; source & ID asli dipertahankan, planner dibiarkan.
- Filter pintar: semua / hari ini / minggu ini / terlambat / belum / selesai /
  prioritas, plus tombol reset filter. Statistik (todo/doing/done/terlambat)
  dihitung dari data aktual.
- Aksi data: Undo, Ekspor JSON, Impor JSON (validasi + data lama aman).
- Form tambah tugas: judul, catatan, label, deadline (date), prioritas, status.
- Efek `[tugas, siap]` tidak lagi me-refresh saat mount dan menyimpan hanya slice
  yang berubah.

### 3. `apps/web/app/tools/jadwal/roadmap-ownership.test.ts` (ditulis ulang)

Kontrak lama "roadmap read-only" diganti kontrak baru:

- `bagiTampilJadwal` memetakan roadmap jadi kartu editable.
- `susunSimpanJadwal` menyinkronkan status/deadline roadmap tanpa duplikat.
- Guard baru: ID milik sumber lain tidak boleh jadi kartu `source:jadwal`
  (celah ini sempat lolos di versi pertama saya, test menangkapnya, lalu
  diperbaiki).
- `susunRoadmap` diuji mempertahankan status `doing`, `dueDate`, `prioritas`,
  `createdAt`, `notes`, dan `subtasks`.

### 4. `packages/utils/dates.ts`

- `FilterCepat`, `parseTanggalISO`, `tugasTerlambat`, `cocokFilterCepat`.
- Semua murni & teruji otomatis; `parseTanggalISO` mengembalikan null kalau
  dueDate bukan tanggal, jadi "Tanpa tanggal" tidak jadi tanggal palsu.

### 5. `apps/web/app/tools/flowchart-skripsi/view.tsx` (Roadmap)

- Fase: bisa ditambah, diubah nama/deskripsi, dihapus (dengan konfirmasi),
  dan diurut naik/turun. Status `TERKUNCI` dihapus total — fase mana pun bisa
  dikerjakan.
- Tugas: bisa ditambah, dihapus, diberi catatan dan deadline per langkah.
  Empty state kalau fase belum punya tugas.
- Progres dihitung dari tugas aktif (data aktual), aman saat 0 tugas.
- Subtugas pada langkah (definisi disimpan di `Step`).
- Matriks revisi: judul, detail, penguji, tanggal mulai, deadline, status
  (`belum`/`proses`/`selesai`), tanpa batas jumlah. Hitung mundur & penanda
  terlambat dari tanggal nyata. Batas 14 hari hanya keterangan acuan.
- Kemiripan naskah diberi label "acuan umum, ikuti pedoman kampusmu" —
  tidak diklaim sebagai aturan.
- Catatan per fase (textarea opsional).
- Migrasi data lama (`steps`, `revisions` bentuk lama) otomatis.

### 6. `apps/web/app/tools/study-planner/view.tsx`

- Tugas Lintas-Sumber: label READ-ONLY dan konsep "edit di halaman asal"
  dihapus. Sekarang kartu bisa digeser status, edit judul/deadline/prioritas/
  catatan, dan dihapus dengan konfirmasi.
- Perubahan tertulis balik ke store bersama (`source` asli dipertahankan),
  jadi tercermin di Jadwal & Roadmap.
- Aksi data: Undo, Ekspor JSON, Impor JSON.
- Label statis "Akses Baca & Komentar" dan avatar tetap diberi catatan jujur
  bahwa itu contoh statis (belum ada backend).

## Hasil verifikasi (aktual)

| Langkah | Hasil |
| --- | --- |
| `pnpm test` | 138 test lolos, 0 gagal |
| `pnpm --filter @cademy/web typecheck` | bersih, 0 error |
| `pnpm --filter @cademy/web build` | sukses, 18+ route |
| sync C: → E: | sukses (flashdisk menerima versi terbaru) |

Belum dijalankan: uji manual klik-per-klik di browser (perubahan status lalu
refresh, cek silang Jadwal↔Roadmap↔Study Planner), `pnpm dev`, lint, dan
commit/push (tidak diminta).

## Keterbatasan yang masih ada (belum dikerjakan)

1. **Tahap 4 belum**: tugas berulang (recurring) yang menghasilkan kejadian
   terpisah, arsip yang punya UI (helper `arsipkanTugas` sudah ada di store
   tapi tidak ada tombol), progres berbobot, pencarian terpusat lintas tool.
2. **Undo hanya seumur tab** — sengaja tidak diklaim sebagai riwayat permanen.
3. **Kalender** masih strip pekan (Sen–Sab), belum kalender bulanan penuh
   dengan navigasi bulan.
4. **Backup** hanya mencakup data tugas (`cademy:tasks-v1`), bukan seluruh
   localStorage (GPA, flashcards, literatur, dsb. punya ekspor sendiri).
5. **Sumber `pribadi`** baru tampil di Jadwal; Study Planner masih hanya
   menampilkan jadwal/roadmap/materi.
6. **Avatar tim & akses baca/komentar** masih statis — diberi label jujur
   bahwa belum ada backend, sengaja tidak dibuat terlihat fungsional.
7. Matriks revisi & catatan fase roadmap tersimpan di key sendiri
   (`cademy:flowchart`), belum ikut skema store bersama.

## Git

Tidak ada commit, tidak ada push, tidak ada deploy — tidak diminta.
