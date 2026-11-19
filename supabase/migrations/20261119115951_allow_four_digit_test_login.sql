-- The public demonstration account uses a four-digit PIN; teacher accounts
-- continue to require their existing three-digit PINs.
do $migration$
declare
  v_definition text;
  v_old text := $$if coalesce(p_pin, '') !~ '^[0-9]{3}$' then$$;
  v_new text := $$if not (
    (lower(v_name) = '테스트' and coalesce(p_pin, '') ~ '^[0-9]{4}$')
    or (lower(v_name) <> '테스트' and coalesce(p_pin, '') ~ '^[0-9]{3}$')
  ) then$$;
begin
  if not exists (
    select 1 from public.teacher_accounts
    where name_key = '테스트' and is_admin = false
  ) then
    raise exception 'Non-admin test account is required';
  end if;
  v_definition := pg_get_functiondef('public.teacher_login(text,text)'::regprocedure);
  if strpos(v_definition, v_old) = 0 then
    raise exception 'Unexpected teacher_login PIN validation; migration not applied';
  end if;
  execute replace(v_definition, v_old, v_new);
end
$migration$;

update public.teacher_accounts
set pin_hash = extensions.crypt('1111', extensions.gen_salt('bf', 10)),
    failed_attempts = 0,
    locked_until = null,
    updated_at = now()
where name_key = '테스트' and is_admin = false;

-- Retire sessions authenticated with the previous demonstration PIN.
update public.teacher_sessions
set expires_at = now()
where account_id = (
  select id from public.teacher_accounts
  where name_key = '테스트' and is_admin = false
);
