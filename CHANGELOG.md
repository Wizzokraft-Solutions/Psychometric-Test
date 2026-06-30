# Changelog

## 2026-07-01

### Phase 0 — Connect to GitHub
- Installed Git + GitHub CLI; created public repo `Wizzokraft-Solutions/Psychometric-Test`.
- Added `.gitignore` so source data (`*.xlsx`, `*.docx`) is never uploaded; pushed docs + assets.

### Phase 0b — App scaffold + live on GitHub Pages
- Installed Node.js 24; scaffolded Vite + React + TypeScript.
- Added Tailwind v4 + shadcn/ui (set up manually), HashRouter, `vite base:'/Psychometric-Test/'`.
- Deployed to the `gh-pages` branch. **Live:** https://wizzokraft-solutions.github.io/Psychometric-Test/

### Phase 0c — UI shells with mock data
- Built Landing (employee search + GEN DATA form + role selector), Quiz (progress + A–D), and Admin (gate + tabs + Segment/Master tables) pages using mock data in `src/lib/mockData.ts`.

### Blocked
- Phase 0d (Supabase): content import, server-side scoring, persistence, real Admin reports — awaiting user's Supabase account.
