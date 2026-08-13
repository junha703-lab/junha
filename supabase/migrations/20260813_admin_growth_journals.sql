begin;

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
        ),
        'journals', coalesce(
          (
            select jsonb_object_agg(
              journal.term,
              jsonb_build_object('answers', journal.answers)
            )
            from public.growth_journals journal
            where journal.account_id = account.id
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

revoke all on function public.admin_list_accounts(uuid) from public;
grant execute on function public.admin_list_accounts(uuid) to anon, authenticated;

commit;

