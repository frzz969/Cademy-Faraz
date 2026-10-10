# Hubungan Antar Tool (Adendum — Terbukti di Kode)

> Hanya hubungan yang terbukti di kode (ada `file:baris`). Tanpa klaim
> "berfungsi" tanpa bukti. Bahasa Indonesia.

## 1. literatur → citation via PREFILL_KEY sekali-konsumsi (terbukti)

- Tulis: `literatur/view.tsx:993` — `localStorage.setItem(PREFILL_KEY, ...)`.
- Baca + hapus: `citation/view.tsx:72-76` — `getItem(PREFILL_KEY)` lalu
  `removeItem(PREFILL_KEY)` saat mount, prefill form (`citation/view.tsx:69-94`).
- Nilai key: `cademy:cite-prefill-v1` (`packages/utils/citation.ts:24`,
  diekspor ulang `literatur/store.ts:75-78`).
- Sifat: sekali-konsumsi (ephemeral); tanpa key, citation mandiri seperti biasa.

## 2. materi → task-store source:materi, TAMPIL di jadwal (terbukti, bukan orphan)

- Tulis: `materi/view.tsx:463-475` — entri `source: "materi"` +
  `saveTasks([...all, entry])`.
- Render: `jadwal/view.tsx:296-312` — `bySource(all, "materi")` dipetakan
  ke kartu dan digabung `[...own, ...roadmap, ...materi]`.
- Klaim basi sebaliknya ("materi orphan / tak tampil di jadwal") salah.

## 3. thesis-checker → task-store source:materi + revisionLinks dedup (terbukti)

- Tulis revisi: `thesis-checker/view.tsx:332` — `source: "materi" as const`
  (judul via `revisionTaskTitle`, tag via `revisionTag`).
- Tulis bimbingan: `thesis-checker/view.tsx:421` — `source: "materi" as const`
  (input via `bimbinganTaskInput`).
- Dedup: cek tautan valid via `resolveRevisionLink/resolveTaskLink`
  (`thesis-checker/view.tsx:311-327,408-418`); tautan basi dihapus saat
  render (`thesis-checker/view.tsx:229-246`); putus tautan tak menghapus
  tugas di Jadwal (`thesis-checker/view.tsx:352-365,446-457`).
- Klaim basi ("thesis menyimpan source:jadwal") salah — kini `source:materi`.

## 4. flowchart ↔ jadwal sinkron dua arah via source:roadmap (terbukti)

- Flowchart membangun/menulis ulang slice roadmap ber-id stabil
  `roadmap:<phase>:<step>` (`flowchart-skripsi/view.tsx:159-182` mount,
  `flowchart-skripsi/view.tsx:191-215` save: `rest + roadmap`, `rest`
  melestarikan non-roadmap).
- Jadwal membaca roadmap (`jadwal/view.tsx:284-295`) dan menulis balik
  status/prioritas/dueDate (`jadwal/view.tsx:roadmapSlice`).
- Kunci lokal flowchart sendiri: `cademy:flowchart`
  (`flowchart-skripsi/view.tsx:37,100,210`) — step dinormalkan ke `{}` saat
  save, status hidup di task-store.

## 5. Arah baca lain (terbukti)

- Pomodoro read-only semua source: `pomodoro/view.tsx:80` —
  `loadTasks().filter(todo/doing)` untuk dropdown tugas fokus; sesi dicatat
  ke `cademy:pomodoro` (`pomodoro/view.tsx:83,129-143`), tak menulis
  task-store.
- Planner read-only lintas-sumber: `study-planner/view.tsx:102-125` —
  filter `jadwal|roadmap|materi`, dedupe by id, cap 12, berlabel sumber,
  refresh focus/storage; state `tasks` planner-only sehingga save tak rusak.
- Jadwal keep-filter melestarikan materi/planner:
  `jadwal/view.tsx:324-326` — `keep` mengecualikan jadwal+roadmap+materi
  lalu membangun ulang ketiganya; `nonJadwalIds` (`jadwal/view.tsx:329-333`)
  mencegah display item tersalin ganda menjadi `source:"jadwal"`.

## 6. Sisa masalah nyata (belum diperbaiki, jangan diklaim beres)

1. **Triple board overlap** — jadwal × planner × flowchart adalah tiga
   papan dengan sumber irisan (`jadwal/view.tsx`, `study-planner/view.tsx`,
   `flowchart-skripsi/view.tsx`); belum ada deduplikasi lintas-papan selain
   cap/dedupe tampilan planner.
2. **gpa/quiz persist tak terbukti** — `gpa/view.tsx` hanya `useState`
   (baris 54-65, tanpa `localStorage`); `quiz/view.tsx` hanya `useState`
   (baris 11-19, tanpa `localStorage`). Isi hilang saat reload.
3. **Toast thesis tanpa deep-link** — toast sukses
   (`thesis-checker/view.tsx:808-813`) hanya teks + auto-dismiss, tanpa
   tautan ke tugas yang dibuat di Jadwal.
