-- Wizzokraft Psychometric Test — database schema
-- Run this in the Supabase SQL Editor (or via the import script) once the project exists.
--
-- Security model:
--   - questions: readable by everyone (they're shown during the quiz).
--   - answer_keys / interpretations: NO public read — used only by server-side
--     scoring (a SECURITY DEFINER function, added in a later step) or the service role.
--   - submissions: NO public read/write — written by the scoring function; admin
--     reads via a gated function (added when we build the Admin page).

-- ---------- Tables ----------

create table if not exists employees (
  emp_no text primary key,
  name   text not null
);

create table if not exists questions (
  id      bigint generated always as identity primary key,
  set     int  not null check (set between 1 and 6),
  section text not null,
  role    text not null check (role in ('manager', 'others')),
  number  int  not null check (number between 1 and 10),
  text    text not null,
  options jsonb not null,                 -- [{ "key":"A", "text":"..." }, ...]
  unique (set, role, number)
);

create table if not exists answer_keys (
  set      int  not null check (set between 1 and 6),
  role     text not null check (role in ('manager', 'others')),
  question int  not null check (question between 1 and 10),
  points   jsonb not null,                -- { "A":2, "B":5, "C":1, "D":0 }
  primary key (set, role, question)
);

create table if not exists interpretations (
  id      bigint generated always as identity primary key,
  set     int  not null check (set between 1 and 6),
  section text not null,
  role    text not null check (role in ('manager', 'others')),
  min     int  not null,
  max     int  not null,
  label   text not null,
  text    text not null
);
create index if not exists interpretations_lookup
  on interpretations (set, role, min, max);

create table if not exists submissions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  emp_no         text,
  name           text,
  dob            date,
  designation    text,
  department     text,
  boss           text,
  tenure         text,
  role           text not null check (role in ('manager', 'others')),
  answers        jsonb not null,          -- [{ "set":1, "question":1, "choice":"B" }, ...]
  section_scores jsonb not null,          -- { "Technical Skills": 42, ... }
  total          int  not null,
  interpretations jsonb                   -- { section -> text, "overall" -> text }
);

-- ---------- Row Level Security ----------

alter table employees       enable row level security;
alter table questions       enable row level security;
alter table answer_keys     enable row level security;
alter table interpretations enable row level security;
alter table submissions     enable row level security;

-- Public (anon) may read the employee picker list and the questions only.
drop policy if exists "read employees" on employees;
create policy "read employees" on employees for select using (true);

drop policy if exists "read questions" on questions;
create policy "read questions" on questions for select using (true);

-- answer_keys, interpretations, submissions: no policies = no anon access.
-- The service role bypasses RLS for the import; scoring/admin use SECURITY DEFINER
-- functions added in later steps.
