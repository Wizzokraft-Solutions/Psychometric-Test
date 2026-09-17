# CLAUDE.md — Wizzokraft Psychometric Test

Guidance for Claude Code when working in this repository.

## Day-wise survey (updated 2026-09-17) — REPLACES the 60-question scored test

- Source: `DAY 1.docx`, `DAY 2.docx`, `DAY 3.docx` (gitignored). Same 30 questions each day, different order. No options/keys in the docs.
- Answers: 5-point scale Highly Agree(5) / Slightly Agree(4) / Neutral(3) / Disagree(2) / Highly Disagree(1). **No scoring yet — scored manually** from the admin Excel export.
- `question_no` = position in DAY 1 (stable across days); `position` = order shown that day.
- No employee list and no Emp No./boss/tenure/role. People enter only **Name, Date of Birth, Designation, Department**. One submission per **Name + DOB per day** (name compared case- and space-insensitively via `survey_person_key`).
- Admin opens/closes days (`set_active_day`); the day is never chosen by the browser.
- DB: `supabase/survey.sql` (tables `survey_questions`, `survey_settings`, `survey_submissions` + RPCs `get_survey`, `has_submitted_survey`, `submit_survey`, `get_survey_admin_data`, `set_active_day`). Questions seed: `node scripts/parse-survey.mjs` → `content/survey-seed.sql`, paste into SQL Editor.
- Old test tables (`questions`, `answer_keys`, `interpretations`, `submissions`, `employees`) and their functions were **dropped on 2026-09-17**. JSON backups: `source-backup/old-test-*-2026-09-17.json` (local only). `admin_config` was kept (survey admin uses it). Sections below describe the OLD test.
- Supabase is reached via the Cloudflare Worker proxy `https://wizzokraft-db.wizzokraft.workers.dev` (`proxy/`, deploy with `npx wrangler deploy`) because some ISPs block `*.supabase.co`. `VITE_SUPABASE_URL` points at the proxy.
- `npm run e2e` mocks all RPCs (`e2e/survey.spec.ts`); only needs `VITE_SUPABASE_*` set (any values).

## Previous state (2026-07-01, old test)

- **Live site:** https://wizzokraft-solutions.github.io/Psychometric-Test/
- **Repo:** `Wizzokraft-Solutions/Psychometric-Test` (public). `main` = source, `gh-pages` = built site.
- **Supabase:** project `tkudyxopvvhwqalwiahk`. Schema (`supabase/schema.sql`) + functions (`supabase/functions.sql`) applied. Content loaded (120 Q / 120 keys / 61 interpretations).
- **Done:** GitHub; full app; Phase 1 (content pipeline); Phase 3 (quiz + `submit_quiz` scoring); Phase 4 (admin reports); **Phase 5 (validation, duplicate guard, responsive, branded UI + framer-motion)**. All verified live + covered by Playwright e2e.
- **Next:** upload the real employee list; optional GitHub Actions deploy; dark-mode toggle.

## Testing
- `npm run e2e` — Playwright browser tests (`e2e/`). Auto-builds + previews. Set `ADMIN_PW` for the admin-login test; Supabase env is read from `.env` by `playwright.config.ts`.
- Sections are **hidden from quiz takers** (shown only in admin). Admin password lives in `admin_config` (not repo).

## Data flow & key files
- Front-end Supabase client: `src/lib/supabase.ts` (anon key from `.env` `VITE_*`). Types in `src/lib/types.ts`.
- Quiz reads `questions` (public) and submits via `submit_quiz` RPC → scores server-side, writes `submissions`.
- Admin reads via `get_admin_data(password)` RPC. **Admin password lives in the RLS-locked `admin_config` table — NOT in this repo.** To change it: update `admin_config` (via service key / SQL).
- SQL is applied by pasting `supabase/*.sql` into the Supabase SQL Editor (raw Postgres port may be firewalled here). Data load: `node --env-file=.env scripts/import-to-supabase.mjs`.

## Dev commands (run from repo root)

- `npm run dev` — local dev server.
- `npm run build` — type-check + production build to `dist/`.
- `npm run deploy` — build + publish `dist/` to the `gh-pages` branch (this is how the live site updates).

## Answer-option swap (IMPORTANT)

Originally the correct answer was always option **B** (a giveaway). `SWAPING.docx` defines, per question, which position B swaps with (or SAME). This swap has **already been applied once** to the source `.docx`/`.xlsx` files (via `scripts/swap-source-docx.mjs` + `scripts/swap-source-xlsx.mjs`) and to Supabase.

- The source files are now the **swapped** truth. `scripts/parse-content.mjs` reads them as-is and **must NOT re-apply the swap** (it would double-apply and undo it). `scripts/swaps.mjs` only exists for the one-time source rewrite.
- After the swap, the correct answer is spread across A/B/C/D (verified: best answers = 300/300, all-B = 135/154). Do not "fix" all-B being < 300 — that's the whole point.
- Backups of the pre-swap files are in `source-backup/` (gitignored).

## Important gotchas

- **Deploy is via the `gh-pages` branch, NOT GitHub Actions.** The `gh auth login` web token lacks the `workflow` scope, so the Actions YAML can't be pushed. `.github/` is gitignored; the workflow file is parked locally. To enable Actions auto-deploy: `gh auth refresh -s workflow`, remove `.github/` from `.gitignore`, commit `.github/workflows/deploy.yml`.
- **shadcn/ui was set up manually** (`components.json`, `src/lib/utils.ts`, theme tokens in `src/index.css`). The `npx shadcn@latest init` CLI hangs in a headless shell — add components by writing the files directly (copy from ui.shadcn.com) rather than relying on the CLI.
- **Vite `base` is `/Psychometric-Test/`** (must match the repo name for Pages). Use `HashRouter` so deep links like `#/admin` work.
- On Windows, `git`/`gh`/`node` need a PATH refresh in new shells: `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`.
- Mock data lives in `src/lib/mockData.ts`; `TODO:` comments in the pages mark where real data/Supabase wiring goes.

## What this project is

A web app for the **Wizzokraft Psychometric Test** with two flows:

- **User flow:** landing page (pick employee from a searchable list → fill the GEN DATA form → choose role) → 60-question multiple-choice quiz → auto-scored on submit.
- **Admin flow:** password-gated reports page (employees-per-boss segment table, master results table, per-employee drill-down with interpretations, and an answer-detail popup).

Reports are always shown **separately for "Manager & Above" vs "Others."**

## Tech stack (decided)

- **React + Vite + TypeScript**
- **Tailwind CSS + shadcn/ui** (copy-paste components: Dialog, Table, Command/Combobox, Form, Tabs, RadioGroup)
- **React Router (HashRouter)** — hash routing avoids GitHub Pages 404s on deep links like `/admin`
- **Supabase** (free Postgres + auto REST API) — shared DB so Admin sees all submissions cross-device
- **SheetJS (xlsx)** — Excel export; **mammoth** — build-time docx parsing
- **Hosting:** GitHub Pages, deployed via **GitHub Actions**

### Why a separate database
GitHub Pages serves static files only — it cannot store shared data. The app is hosted on Pages (free); submissions live in Supabase (free) so the Admin page can aggregate everyone's results. Total cost: $0.

## Source data layout (DO NOT change the question/answer ordering)

Six skill sets, each in its own folder, each with Manager and Others variants:

| Set | Folder |
|---|---|
| 1 | `Technical Skills (Set 1)` |
| 2 | `Problem Solving Skills (Set 2)` |
| 3 | `Communication Skills (Set 3)` |
| 4 | `Team Work & Collaboration Skills (Set - 4)` |
| 5 | `Customer Focus (Set 5)` |
| 6 | `Learning Agility (Set 6)` |

Each folder contains 4 files:
- `Que-Set-N-Managers & Above.docx` / `Que-Set-N-Others.docx` — 10 questions, options A–D, **fixed order**.
- `Ans-Set-N-Managers & Above.xlsx` / `Ans-Set-N-Others.xlsx` — two sheets:
  - `SCORE`: `Question | A | B | C | D` = points awarded per option (max 5).
  - `INTERPRETATION`: `Score | Interpretation` = score-band → text (e.g. `45–50`, `Below 28`).

**Critical:** question order in the docx maps 1:1 to the answer-key rows. Never reorder.

## Scoring rules

- Each question: 0–5 points (from the matching `Ans-*.xlsx` `SCORE` sheet for the chosen role).
- Per section: 10 questions → max **50**. Six sections → max **300** total.
- Map each section's score to its `INTERPRETATION` band; also produce an overall interpretation.

## Report Format.xlsx (the report templates)

- `GEN DATA` sheet → landing-page form fields: Emp No., Name, Date of Birth, Designation, Department, Reporting Boss Name, Months/Years in Current Job + "Manager & Above / Others" selector.
- `SEGMENT` sheet → Admin boss table: `Department | Reporting Boss | Employees` (add a serial number column), filterable by boss.
- `MASTER REPORT` sheet → Admin results table: employee details + 6 section scores (Technical, Problem Solving, Communication, Team Work & Collaboration, Customer Focus, Learning Agility).

## Assets

- `Assets/Logo.png` — Wizzokraft logo for the landing header. Title text: "Wizzokraft Psychometric Test."

## Conventions & gotchas

- Use a **build-time Node script** to parse docx/xlsx into JSON (`questions.json`, `answerKeys.json`, `interpretations.json`); the browser must never parse Office files at runtime.
- `.xlsx`/`.docx` are zip/OOXML; if a read fails with a file-lock error, the file is open in Excel/Word — copy to a temp dir before reading.
- Quiz UX: show a motivating message + emoji after every 10 questions (between sets).
- Employee master list (IDs + Names) is provided separately as Excel/CSV — bundle it as the searchable landing list.

## Status / pending inputs

- Employee master list: pending from user (~2026-07-02 evening); use a placeholder until then.
- Supabase account: to be created at the DB stage.
- Admin password: to be decided at the Admin phase.
