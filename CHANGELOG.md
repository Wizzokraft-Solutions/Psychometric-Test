# Changelog

## 2026-07-02

### Answer-option swap (fixes "always B" giveaway)
- Applied `SWAPING.docx` (90 swaps, 30 SAME) to reposition option B ↔ Final in both the question text and the scoring — in Supabase AND the source `.docx`/`.xlsx` files.
- Correct answer now spread across A/B/C/D. Verified: best answers = 300/300, all-B = 135 (mgr) / 154 (others). Sources backed up to `source-backup/`.

### Employee list, TEST accounts, mobile, mandatory fields
- Loaded 112 real employees + 5 TEST accounts (top of list); names hide after completion; removed all mock data.
- Mobile responsive pass + mobile e2e tests; required-field markers.

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

### Phase 0d + Phase 1 — Supabase + content pipeline
- Supabase project created; schema + RLS applied. Parsed all 6 sets → loaded 120 questions, 120 answer keys, 61 interpretations. Security verified (public key blocked from keys/submissions).

### Phase 3 — Quiz wired to Supabase
- Quiz loads the real 60 questions by role in fixed order, with a motivational break after each set of 10.
- Added `submit_quiz` server-side scoring function (scores against hidden keys → per-section + total + interpretations, persists). Verified: all-B → 300/300.

### Phase 5 — Validation, duplicate guard, responsive, UI overhaul, tests
- Branded theme (logo green→gold) + framer-motion transitions; sections hidden from quiz takers.
- Form validation; duplicate-submission guard (`submit_quiz` reject + unique index + `has_submitted`); responsive pass.
- Playwright e2e suite (7 tests) covering landing/search/validation/quiz/admin + duplicate blocking.

### Phase 4 — Admin reports
- Password gate via `get_admin_data` RPC (password in RLS-locked `admin_config`).
- Segment table (boss filter), Master report (6 section scores), per-employee drill-down with interpretations, answer-detail popup (per-question choice/points + running totals), Excel export. Role split throughout.
