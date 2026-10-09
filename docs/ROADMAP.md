# Roadmap — Cademy

Selaras dengan `PRD.md` v3.0.0. Legenda: ✅ done · 🚧 P1 berikutnya · 🔮 P2 future.
Update terakhir: 08 Okt 2026 (build lolos: `tsc --noEmit` nol error, `next build` 17 route static).

## P0 — Core (stabil sebelum P2)

- ✅ Dashboard/home (hero ID, popular tools, stats)
- ✅ Thesis roadmap 4 fase (`/tools/flowchart-skripsi`)
- ✅ Task board + schedule (`/tools/jadwal`, localStorage)
- ✅ Grade calculator + history lokal (`/tools/grade`, label SIMULASI)
- ✅ Tool directory search + filter (`/tools`, 11 tools di registry)
- ✅ Responsive 390px / 1280px + local persistence
- ✅ Material Symbols (nol emoji mentah), footer/brand konsisten
- 🚧 Panel Today + Academic Progress di homepage (data local state)
- 🚧 Koneksi Roadmap → Task Board (task roadmap otomatis masuk kanban)

## P1 — Important (berikutnya)

- [ ] Export/Import/Reset data lokal (JSON + konfirmasi reset)
- [ ] Copy AI Writing Analysis per threshold (LOW/REVIEW/HIGH Indicator)
- [ ] Global search (`Ctrl/Cmd+K`) + mobile bottom nav
- [ ] Print/export PDF rekap nilai & matriks revisi dari data aktual
- [ ] Empty/error/loading states lengkap per fitur
- [ ] Perluas registry menuju 48 curated tools (tanpa CTA palsu)
- [ ] Ganti sisa label tanggal statis → date dinamis (Asia/Jakarta)

## P2 — Future (setelah P0 stabil)

- [ ] Account, cloud sync, multi-device, backup
- [ ] Calendar integration
- [ ] Kolaborasi, supervisor access, comments, shared revision matrix
- [ ] `/kuliah/detail` course detail
- [ ] Institution templates, academic integrations

## Riwayat

- v3.0 — PRD workspace (Plan→Work→Track→Analyze→Finish), jadwal diimplementasi, 15 bug audit di-fix, docs diselaraskan
- v2.4 — Academic Hub: scaffold monorepo, homepage, registry 10 tools, stubs
