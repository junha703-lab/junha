begin;

alter table public.teacher_accounts
  add column if not exists is_admin boolean not null default false;

-- The administrator credential is bootstrapped separately so no PIN is
-- committed to source control. Promote the existing account when present.
update public.teacher_accounts
set
  is_admin = true,
  failed_attempts = 0,
  locked_until = null,
  updated_at = now()
where name_key = '양지초';

create or replace function public.teacher_load(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_teacher_name text;
  v_is_admin boolean;
  v_records jsonb;
begin
  select account.id, account.display_name, account.is_admin
    into v_account_id, v_teacher_name, v_is_admin
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
    'is_admin', v_is_admin,
    'records', v_records
  );
end
$$;

create or replace function public.admin_list_accounts(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id uuid;
  v_accounts jsonb;
begin
  select account.id
    into v_admin_id
  from public.teacher_sessions session
  join public.teacher_accounts account on account.id = session.account_id
  where session.token = p_token
    and session.expires_at > now()
    and account.is_admin = true;

  if v_admin_id is null then
    return jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  end if;

  update public.teacher_sessions
  set expires_at = now() + interval '90 days'
  where token = p_token;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'account_id', account.id,
        'teacher_name', account.display_name,
        'created_at', account.created_at,
        'records', coalesce(
          (
            select jsonb_object_agg(
              assessment.period,
              jsonb_build_object(
                'answers', assessment.answers,
                'submitted_at', assessment.submitted_at
              )
            )
            from public.assessments assessment
            where assessment.account_id = account.id
          ),
          '{}'::jsonb
        )
      )
      order by account.display_name
    ),
    '[]'::jsonb
  )
  into v_accounts
  from public.teacher_accounts account
  where account.is_admin = false;

  return jsonb_build_object(
    'success', true,
    'accounts', v_accounts
  );
end
$$;

create or replace function public.admin_delete_account(
  p_token uuid,
  p_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id uuid;
  v_deleted_name text;
begin
  select account.id
    into v_admin_id
  from public.teacher_sessions session
  join public.teacher_accounts account on account.id = session.account_id
  where session.token = p_token
    and session.expires_at > now()
    and account.is_admin = true;

  if v_admin_id is null then
    return jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  end if;

  delete from public.teacher_accounts account
  where account.id = p_account_id
    and account.id <> v_admin_id
    and account.is_admin = false
  returning account.display_name into v_deleted_name;

  if v_deleted_name is null then
    return jsonb_build_object('success', false, 'error', 'ACCOUNT_NOT_FOUND');
  end if;

  return jsonb_build_object(
    'success', true,
    'deleted_name', v_deleted_name
  );
end
$$;

revoke all on function public.admin_list_accounts(uuid) from public;
revoke all on function public.admin_delete_account(uuid, uuid) from public;

grant execute on function public.admin_list_accounts(uuid) to anon, authenticated;
grant execute on function public.admin_delete_account(uuid, uuid) to anon, authenticated;

commit;

