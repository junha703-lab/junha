begin;

create table if not exists public.growth_journals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.teacher_accounts(id) on delete cascade,
  term text not null check (term in ('first_half', 'second_half')),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, term)
);

create index if not exists growth_journals_account_idx
  on public.growth_journals (account_id, updated_at desc);

alter table public.growth_journals enable row level security;
revoke all on table public.growth_journals from anon, authenticated;

create or replace function public.growth_journal_load(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_records jsonb;
begin
  select session.account_id
    into v_account_id
  from public.teacher_sessions session
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
      term,
      jsonb_build_object(
        'answers', answers,
        'created_at', created_at,
        'updated_at', updated_at
      )
    ),
    '{}'::jsonb
  )
  into v_records
  from public.growth_journals
  where account_id = v_account_id;

  return jsonb_build_object('success', true, 'records', v_records);
end
$$;

create or replace function public.growth_journal_save(
  p_token uuid,
  p_term text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_updated_at timestamptz;
begin
  select session.account_id
    into v_account_id
  from public.teacher_sessions session
  where session.token = p_token
    and session.expires_at > now();

  if v_account_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_EXPIRED');
  end if;

  if p_term not in ('first_half', 'second_half')
    or jsonb_typeof(p_answers) <> 'object' then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  insert into public.growth_journals (account_id, term, answers)
  values (v_account_id, p_term, p_answers)
  on conflict (account_id, term)
  do update set
    answers = excluded.answers,
    updated_at = now()
  returning updated_at into v_updated_at;

  return jsonb_build_object(
    'success', true,
    'term', p_term,
    'updated_at', v_updated_at
  );
end
$$;

revoke all on function public.growth_journal_load(uuid) from public;
revoke all on function public.growth_journal_save(uuid, text, jsonb) from public;
grant execute on function public.growth_journal_load(uuid) to anon, authenticated;
grant execute on function public.growth_journal_save(uuid, text, jsonb) to anon, authenticated;

commit;
