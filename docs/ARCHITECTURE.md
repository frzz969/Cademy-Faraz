# Architecture — Cademy

## Monorepo
- pnpm workspaces + Turborepo
- `apps/web`: Next.js 14 App Router, Tailwind
- `packages/ui`: komponen presentasional
- `packages/design-tokens`: colors, typography, spacing
- `packages/tool-registry`: daftar tools + status (available/external/coming-soon/beta)
- `packages/validators`: skema zod
- `packages/utils`: helper (cn, slugify)

## Routing
- `/` homepage
- `/tools` daftar tools dari registry
- `/tools/[slug]` 10 stub; `ai-detector` link keluar ke Vercel
- `/about` statis

## Konvensi
- Registry adalah source of truth untuk status tool
- UI tidak boleh hardcode daftar tools, impor dari `@cademy/tool-registry`
