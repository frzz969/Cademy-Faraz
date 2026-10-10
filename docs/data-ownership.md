# Kepemilikan Data (Adendum)

> Tiap store: key localStorage, pemilik, siapa boleh tulis/baca, aturan hapus,
> anti-duplikat. Bukti berupa `file:baris`. Bahasa Indonesia.

## cademy:tasks-v1 — store tugas BERSAMA

- Key: `cademy:tasks-v1` (`components/task-store.ts:29`).
  `loadTasks/saveTasks` (`task-store.ts:120-139`), filter `bySource`
  (`task-store.ts:141-142`). Source valid: `roadmap|jadwal|planner|materi`
  (`task-store.ts:5`).
- Tulis: jadwal (`jadwal/view.tsx:332-373`), flowchart slice roadmap
  (`flowchart-skripsi/view.tsx:162-178,195-208`), planner slice planner-only
  (`study-planner/view.tsx:~140-156`), materi (`materi/view.tsx:463-475`),
  thesis sebagai `source:materi` (`thesis-checker/view.tsx:332,421`).
- Baca: jadwal, flowchart, planner (own + lintas), pomodoro (read-only,
  `pomodoro/view.tsx:80`), materi (`materi/view.tsx:175-189` pantau shared).
- Hapus: tiap pemilik menghapus/mengubah slice-nya; thesis memutus tautan
  tanpa menghapus tugas (`thesis-checker/view.tsx:352-365,446-457`);
  tautan basi dibersihkan saat render (`thesis-checker/view.tsx:229-246`).
- Anti-duplikat: id stabil `roadmap:<phase>:<step>`
  (`flowchart-skripsi/view.tsx:166,197`); tag `revisi:<project>:<item>`
  (`packages/utils/thesis.ts:185-187`, cek `thesis-checker/view.tsx:321`);
  tag `bimbingan:<project>:<log>` (`bimbinganTaskInput`,
  `packages/utils/bimbingan.ts:217-232`); `nonJadwalIds`
  (`jadwal/view.tsx:329-333`) + dedupe lintas planner
  (`study-planner/view.tsx:108-115`).
- Migrasi sekali-jalan dari key lama, key lama dipertahankan
  (`task-store.ts:50-118`).

## cademy:workspaces-v1 + cademy:transcripts-v1 — milik materi

- `cademy:workspaces-v1` (`materi/store.ts:6`; tulis `materi/view.tsx:161`,
  baca/tulis `materi/store.ts:305,318`). Pemilik: materi. Berisi workspace,
  topik, tugas lokal + `taskId` tautan ke `cademy:tasks-v1`
  (`materi/store.ts:24,71`). Arsip lama `cademy:materi-progress` hanya
  dibaca saat migrasi (`materi/store.ts:351-396`); `cademy:materi-last`
  legacy (`materi/store.ts:8`).
- `cademy:transcripts-v1` (`materi/transcript-store.ts:8`; baca/tulis
  `transcript-store.ts:314,327`). Pemilik: materi (panel transkrip).
  Batas bookmark 100/transkrip (`transcript-store.ts:22,289-295`).
- Hapus: dari UI materi (ekspor/hapus milik user, `materi/view.tsx:~436+`);
  key versi lain tidak disentuh.

## cademy:flowchart — milik flowchart-skripsi

- Key lokal (`flowchart-skripsi/view.tsx:37,100,210`): `{steps, revisions,
  revisionStart, similarity}`. Status langkah hidup di task-store
  (slice roadmap); key lokal dinormalkan (`steps: {}`) saat save.

## cademy:jadwal-tugas + cademy:jadwal-agenda — milik jadwal

- `cademy:jadwal-tugas` (`jadwal/view.tsx:39,373`): cermin slice jadwal
  (backup tampilan). `cademy:jadwal-agenda` (`jadwal/view.tsx:40,382`):
  agenda bimbingan. Migrasi ke tasks-v1 tidak menghapus key lama
  (`task-store.ts:90-115`).

## cademy:planner + cademy:planner-target — milik planner

- `cademy:planner` (`study-planner/view.tsx:30,156`): cermin slice planner.
  `cademy:planner-target` (`study-planner/view.tsx:31,126,166`): label +
  tanggal target kelulusan. Save planner-only + `keep` non-planner
  (`study-planner/view.tsx:~140-156`).

## cademy:sidang — milik grade

- `cademy:sidang` (`grade/view.tsx:30,36,91`): riwayat simulasi nilai sidang.
  Pemilik tunggal: grade.

## cademy:flashcards — milik flashcards

- `cademy:flashcards` (`flashcards/view.tsx:8,78,94`): deck kartu.
  Tulis/baca lokal; impor deck dari materi via util murni
  (`fromMateri/formatDeck`, `flashcards/view.tsx:6`) — tanpa tulis silang
  ke store materi.

## cademy:pomodoro — milik pomodoro

- `cademy:pomodoro` (`pomodoro/view.tsx:14,61,83`): sesi, totalMenit,
  durasi custom, sessions (cap 100 via `pushPomodoroSession`,
  `pomodoro/view.tsx:137-143`). Tugas hanya dibaca (opsional `taskId/
  taskTitle` snapshot di sesi).

## cademy:thesis-v2 (+ v1) + cademy:bimbingan-v1 — milik thesis-checker

- `cademy:thesis-v2` (`packages/utils/thesis.ts:28`; baca/tulis
  `thesis-checker/view.tsx:123,189`). Migrasi v1→v2, key lama
  `cademy:thesis` (`thesis.ts:29`) dipertahankan, tidak dihapus
  (`thesis-checker/view.tsx:148-160`).
- `cademy:bimbingan-v1` (`packages/utils/bimbingan.ts:44`; muat
  `thesis-checker/view.tsx:197`, simpan `:206`). Log bimbingan mandiri
  dari tugas; orphan ditandai, tidak di-prune.
- Unduhan laporan `.md` bukan cadangan dan tak bisa memulihkan data
  (`thesis-checker/view.tsx:543`).

## cademy:cite-prefill-v1 — ephemeral literatur→citation

- Key (`packages/utils/citation.ts:24`). Ditulis literatur
  (`literatur/view.tsx:993`), dibaca + DIHAPUS sekali oleh citation
  (`citation/view.tsx:72-76`). Bukan store; jangan diandalkan persist.

## Key riset literatur (milik literatur)

- `cademy:literatur-favs-v1` + `cademy:literatur-matrix-v1`
  (`literatur/store.ts:72-73,318-357`), `cademy:proj-refs-v1` aditif
  (`literatur/store.ts:419-433`), `literatur-last-q` non-kontrak
  (`literatur/view.tsx:597,666`).

## cademy:bottomnav-open — milik BottomNav

- Key UI (`BottomNav.tsx:8`): status buka/tutup nav mobile. Ephemeral.
