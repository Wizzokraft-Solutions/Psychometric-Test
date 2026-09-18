-- Allow retakes (2026-09-18)
-- Paste this into the Supabase SQL Editor once. It removes the
-- "one submission per person per day" rule; every attempt is now kept as its
-- own row in survey_submissions. supabase/survey.sql already reflects this, so
-- a fresh apply of that file does not need this migration.

-- 1. Drop the unique index that blocked a second submission.
drop index if exists survey_submissions_person_day;

-- 2. The app no longer asks whether someone has already submitted.
drop function if exists has_submitted_survey(text, date);

-- 3. Recreate submit_survey without the already_submitted check.
create or replace function submit_survey(p_person jsonb, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day     int;
  v_name    text := nullif(regexp_replace(trim(p_person->>'name'), '\s+', ' ', 'g'), '');
  -- digits only, then drop a leading 91 / 0 country or trunk prefix
  v_mobile  text := regexp_replace(regexp_replace(coalesce(p_person->>'mobile', ''), '\D', '', 'g'), '^(91|0)(?=\d{10}$)', '');
  v_dob     date := nullif(p_person->>'dob', '')::date;
  v_total   int;
  v_answers jsonb;
  v_id      uuid;
begin
  select active_day into v_day from survey_settings where id = 1;
  if v_day is null then
    raise exception 'survey_closed';
  end if;
  if v_name is null or v_dob is null then
    raise exception 'name and dob are required';
  end if;
  if v_mobile !~ '^[6-9]\d{9}$' then
    raise exception 'invalid_mobile';
  end if;

  select count(*) into v_total from survey_questions where day = v_day;

  -- Join answers to the day's questions; only valid, distinct answers survive.
  select coalesce(jsonb_agg(jsonb_build_object(
           'question_no', q.question_no,
           'position', q.position,
           'text', q.text,
           'value', a.value,
           'label', survey_label(a.value)
         ) order by q.question_no), '[]'::jsonb)
    into v_answers
    from (
      select distinct on ((e->>'question_no')::int)
             (e->>'question_no')::int as question_no, (e->>'value')::int as value
      from jsonb_array_elements(p_answers) e
    ) a
    join survey_questions q on q.day = v_day and q.question_no = a.question_no
    where a.value between 1 and 5;

  if jsonb_array_length(v_answers) <> v_total then
    raise exception 'incomplete_answers: got %, expected %', jsonb_array_length(v_answers), v_total;
  end if;

  insert into survey_submissions (day, name, mobile, dob, designation, department, answers)
  values (
    v_day, v_name, v_mobile, v_dob,
    nullif(trim(p_person->>'designation'), ''),
    nullif(trim(p_person->>'department'), ''),
    v_answers
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'day', v_day);
end;
$$;
grant execute on function submit_survey(jsonb, jsonb) to anon, authenticated;
