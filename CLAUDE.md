# CLAUDE.md — Wizzokraft Psychometric Test

Guidance for Claude Code when working in this repository.

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
