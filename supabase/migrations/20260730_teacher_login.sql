begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.teacher_accounts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 100),
  name_key text not null unique,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_sessions (
  token uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.teacher_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

alter table public.assessments
  add column if not exists account_id uuid;

alter table public.assessments
  drop constraint if exists assessments_period_check;

alter table public.assessments
  add constraint assessments_period_check
  check (period in ('april', 'october', 'january'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessments_account_id_fkey'
      and conrelid = 'public.assessments'::regclass
  ) then
    alter table public.assessments
      add constraint assessments_account_id_fkey
      foreign key (account_id)
      references public.teacher_accounts(id)
      on delete cascade;
  end if;
end
$$;

create unique index if not exists assessments_account_period_unique
  on public.assessments (account_id, period)
  where account_id is not null;

create index if not exists teacher_sessions_account_id_idx
  on public.teacher_sessions (account_id);

create index if not exists teacher_sessions_expires_at_idx
  on public.teacher_sessions (expires_at);

alter table public.teacher_accounts enable row level security;
alter table public.teacher_sessions enable row level security;
alter table public.assessments enable row level security;

revoke all on table public.teacher_accounts from anon, authenticated;
revoke all on table public.teacher_sessions from anon, authenticated;
revoke all on table public.assessments from anon, authenticated;

drop policy if exists "allow assessment inserts" on public.assessments;

create or replace function public.teacher_login(p_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_name_key text;
  v_account_id uuid;
  v_display_name text;
  v_pin_hash text;
  v_failed_attempts integer;
  v_locked_until timestamptz;
  v_session_token uuid;
  v_created boolean := false;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 100 then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{3}$' then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  v_name_key := lower(v_name);

  select id, display_name, pin_hash, failed_attempts, locked_until
    into v_account_id, v_display_name, v_pin_hash, v_failed_attempts, v_locked_until
  from public.teacher_accounts
  where name_key = v_name_key
  for update;

  if v_account_id is null then
    insert into public.teacher_accounts (display_name, name_key, pin_hash)
    values (v_name, v_name_key, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
    on conflict (name_key) do nothing
    returning id, display_name, pin_hash, failed_attempts, locked_until
      into v_account_id, v_display_name, v_pin_hash, v_failed_attempts, v_locked_until;

    if v_account_id is not null then
      v_created := true;

      with latest_existing as (
        select distinct on (period) id
        from public.assessments
        where account_id is null
          and lower(regexp_replace(trim(teacher_name), '\s+', ' ', 'g')) = v_name_key
        order by period, submitted_at desc
      )
      update public.assessments assessment
      set account_id = v_account_id
      from latest_existing
      where assessment.id = latest_existing.id;
    else
      select id, display_name, pin_hash, failed_attempts, locked_until
        into v_account_id, v_display_name, v_pin_hash, v_failed_attempts, v_locked_until
      from public.teacher_accounts
      where name_key = v_name_key
      for update;
    end if;
  end if;

  if not v_created then
    if v_locked_until is not null and v_locked_until > now() then
      return jsonb_build_object(
        'success', false,
        'error', 'LOGIN_LOCKED',
        'retry_after', v_locked_until
      );
    end if;

    if v_pin_hash <> extensions.crypt(p_pin, v_pin_hash) then
      v_failed_attempts := coalesce(v_failed_attempts, 0) + 1;

      update public.teacher_accounts
      set failed_attempts = v_failed_attempts,
          locked_until = case
            when v_failed_attempts >= 5 then now() + interval '15 minutes'
            else null
          end,
          updated_at = now()
      where id = v_account_id;

      return jsonb_build_object(
        'success', false,
        'error', case
          when v_failed_attempts >= 5 then 'LOGIN_LOCKED'
          else 'INVALID_CREDENTIALS'
        end
      );
    end if;
  end if;

  update public.teacher_accounts
  set failed_attempts = 0,
      locked_until = null,
      display_name = v_name,
      updated_at = now()
  where id = v_account_id;

  delete from public.teacher_sessions
  where account_id = v_account_id
    and expires_at <= now();

  insert into public.teacher_sessions (account_id)
  values (v_account_id)
  returning token into v_session_token;

  return jsonb_build_object(
    'success', true,
    'created', v_created,
    'teacher_name', v_name,
    'session_token', v_session_token
  );
end
$$;

create or replace function public.teacher_load(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_teacher_name text;
  v_records jsonb;
begin
  select account.id, account.display_name
    into v_account_id, v_teacher_name
  from public.teacher_sessions session
  join public.teacher_accounts account on account.id = session.account_id
  where session.token = p_token
    and session.expires_at > now();

  if v_account_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_EXPIRED');
  end if;

  update public.teacher_sessions
  set expires_at = now() + interval '90 days'
  where token = p_token;

  select coalesce(
    jsonb_object_agg(
      period,
      jsonb_build_object(
        'answers', answers,
        'submitted_at', submitted_at
      )
    ),
    '{}'::jsonb
  )
  into v_records
  from public.assessments
  where account_id = v_account_id;

  return jsonb_build_object(
    'success', true,
    'teacher_name', v_teacher_name,
    'records', v_records
  );
end
$$;

create or replace function public.teacher_save(
  p_token uuid,
  p_period text,
  p_answers jsonb,
  p_learning numeric,
  p_guidance numeric,
  p_professional numeric,
  p_smart numeric,
  p_culture numeric,
  p_empathy numeric,
  p_whole numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_teacher_name text;
  v_submitted_at timestamptz;
begin
  select account.id, account.display_name
    into v_account_id, v_teacher_name
  from public.teacher_sessions session
  join public.teacher_accounts account on account.id = session.account_id
  where session.token = p_token
    and session.expires_at > now();

  if v_account_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_EXPIRED');
  end if;

  if p_period not in ('april', 'october', 'january')
    or jsonb_typeof(p_answers) <> 'object'
    or p_learning is null or p_learning not between 0 and 5
    or p_guidance is null or p_guidance not between 0 and 5
    or p_professional is null or p_professional not between 0 and 5
    or p_smart is null or p_smart not between 0 and 5
    or p_culture is null or p_culture not between 0 and 5
    or p_empathy is null or p_empathy not between 0 and 5
    or p_whole is null or p_whole not between 0 and 5 then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  insert into public.assessments (
    account_id,
    teacher_name,
    period,
    learning,
    guidance,
    professional,
    smart,
    culture,
    empathy,
    whole,
    answers,
    submitted_at
  )
  values (
    v_account_id,
    v_teacher_name,
    p_period,
    p_learning,
    p_guidance,
    p_professional,
    p_smart,
    p_culture,
    p_empathy,
    p_whole,
    p_answers,
    now()
  )
  on conflict (account_id, period)
    where account_id is not null
  do update set
    teacher_name = excluded.teacher_name,
    learning = excluded.learning,
    guidance = excluded.guidance,
    professional = excluded.professional,
    smart = excluded.smart,
    culture = excluded.culture,
    empathy = excluded.empathy,
    whole = excluded.whole,
    answers = excluded.answers,
    submitted_at = now()
  returning submitted_at into v_submitted_at;

  return jsonb_build_object(
    'success', true,
    'period', p_period,
    'submitted_at', v_submitted_at
  );
end
$$;

create or replace function public.teacher_logout(p_token uuid)
returns void
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  delete from public.teacher_sessions where token = p_token;
$$;

revoke all on function public.teacher_login(text, text) from public;
revoke all on function public.teacher_load(uuid) from public;
revoke all on function public.teacher_save(
  uuid, text, jsonb, numeric, numeric, numeric, numeric, numeric, numeric, numeric
) from public;
revoke all on function public.teacher_logout(uuid) from public;

grant execute on function public.teacher_login(text, text) to anon, authenticated;
grant execute on function public.teacher_load(uuid) to anon, authenticated;
grant execute on function public.teacher_save(
  uuid, text, jsonb, numeric, numeric, numeric, numeric, numeric, numeric, numeric
) to anon, authenticated;
grant execute on function public.teacher_logout(uuid) to anon, authenticated;

commit;

