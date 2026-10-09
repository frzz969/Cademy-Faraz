# Contributing — Cademy

1. Gunakan pnpm (`pnpm install`, `pnpm dev`).
2. Tambah tool baru: update `packages/tool-registry/tools.ts` + buat `apps/web/app/tools/[slug]/page.tsx`.
3. Komponen bersama masuk `packages/ui`, token ke `packages/design-tokens`.
4. Validasi dengan zod di `packages/validators`.
5. Jangan commit `.env*`, `node_modules`, `.next`.
