-- Wizzokraft Psychometric Test — server-side functions
-- Run AFTER schema.sql. These are SECURITY DEFINER so they can read the hidden
-- answer_keys / interpretations and write submissions, while the browser (anon
-- key) still cannot touch those tables directly.

-- ============================================================
-- submit_quiz: score answers against the hidden keys, persist, return result.
--   p_employee : { emp_no, name, dob, designation, department, boss, tenure }
--   p_role     : 'manager' | 'others'
--   p_answers  : [ { "set":1, "question":1, "choice":"B" }, ... ]
-- ============================================================
create or replace function submit_quiz(p_employee jsonb, p_role text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a            jsonb;
  v_set        int;
  v_q          int;
  v_choice     text;
  v_points     int;
  v_section    text;
  v_total      int   := 0;
  v_scores     jsonb := '{}'::jsonb;   -- section -> score
  v_scored     jsonb := '[]'::jsonb;   -- answers enriched with awarded points
  v_interps    jsonb := '{}'::jsonb;   -- section -> interpretation text
  v_sec_score  int;
  v_interp     text;
  rec          record;
  v_id         uuid;
begin
  if p_role not in ('manager', 'others') then
    raise exception 'invalid role: %', p_role;
  end if;

  for a in select value from jsonb_array_elements(p_answers) as t(value)
  loop
    v_set    := (a->>'set')::int;
    v_q      := (a->>'question')::int;
    v_choice := upper(a->>'choice');

    select section into v_section
      from questions where set = v_set and role = p_role limit 1;

    select (points->>v_choice)::int into v_points
      from answer_keys where set = v_set and role = p_role and question = v_q;
    v_points := coalesce(v_points, 0);

    v_total  := v_total + v_points;
    v_scores := jsonb_set(v_scores, array[v_section],
                  to_jsonb(coalesce((v_scores->>v_section)::int, 0) + v_points));
    v_scored := v_scored || jsonb_build_object(
                  'set', v_set, 'question', v_q, 'choice', v_choice,
                  'points', v_points, 'section', v_section);
  end loop;

  -- per-section interpretation (bands are per section, 0..50)
  for rec in
    select distinct set, section from questions where role = p_role
  loop
    v_sec_score := coalesce((v_scores->>rec.section)::int, 0);
    select text into v_interp
      from interpretations
      where set = rec.set and role = p_role
        and v_sec_score between min and max
      limit 1;
    if v_interp is not null then
      v_interps := jsonb_set(v_interps, array[rec.section], to_jsonb(v_interp));
    end if;
  end loop;

  insert into submissions(emp_no, name, dob, designation, department, boss, tenure,
                          role, answers, section_scores, interpretations, total)
  values (
    nullif(p_employee->>'emp_no', ''),
    nullif(p_employee->>'name', ''),
    nullif(p_employee->>'dob', '')::date,
    nullif(p_employee->>'designation', ''),
    nullif(p_employee->>'department', ''),
    nullif(p_employee->>'boss', ''),
    nullif(p_employee->>'tenure', ''),
    p_role, v_scored, v_scores, v_interps, v_total
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'total', v_total,
           'section_scores', v_scores, 'interpretations', v_interps);
end;
$$;

grant execute on function submit_quiz(jsonb, text, jsonb) to anon, authenticated;

-- ============================================================
-- Admin: a single-row config table holds the reports password (RLS-locked,
-- only reachable via the SECURITY DEFINER function below). Seed it separately.
-- ============================================================
create table if not exists admin_config (
  id       int primary key default 1,
  password text not null,
  constraint admin_config_single_row check (id = 1)
);
alter table admin_config enable row level security;  -- no policies → fully locked

-- get_admin_data: returns all submissions IF the password matches.
create or replace function get_admin_data(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok   boolean;
  v_subs jsonb;
begin
  select (password = p_password) into v_ok from admin_config where id = 1;
  if not coalesce(v_ok, false) then
    raise exception 'unauthorized';
  end if;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc), '[]'::jsonb)
    into v_subs from submissions s;

  return jsonb_build_object('submissions', v_subs);
end;
$$;

grant execute on function get_admin_data(text) to anon, authenticated;
