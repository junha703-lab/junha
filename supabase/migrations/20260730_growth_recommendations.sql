begin;

create table if not exists public.growth_recommendations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.teacher_accounts(id) on delete cascade,
  period text not null
    check (period in ('april', 'october', 'january')),
  assessment_submitted_at timestamptz not null,
  weakest_dimension text not null
    check (
      weakest_dimension in (
        'learning',
        'guidance',
        'professional',
        'smart',
        'culture',
        'empathy',
        'whole'
      )
    ),
  weakest_score numeric not null check (weakest_score between 0 and 5),
  training_recommendations jsonb,
  book_recommendations jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, period, assessment_submitted_at)
);

create table if not exists public.growth_book_cache (
  cache_key text primary key,
  dimension text not null,
  query_text text not null,
  books jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(books) = 'array')
);

create index if not exists growth_recommendations_account_idx
  on public.growth_recommendations (account_id, created_at desc);

create index if not exists growth_book_cache_expires_idx
  on public.growth_book_cache (expires_at);

alter table public.growth_recommendations enable row level security;
alter table public.growth_book_cache enable row level security;

revoke all on table public.growth_recommendations from anon, authenticated;
revoke all on table public.growth_book_cache from anon, authenticated;

create or replace function public.recommendation_context(
  p_token uuid,
  p_period text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_submitted_at timestamptz;
  v_dimension text;
  v_score numeric;
  v_training jsonb;
  v_books jsonb;
begin
  if p_period not in ('april', 'october', 'january') then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

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

  select
    assessment.submitted_at,
    score_row.dimension,
    score_row.score
  into
    v_submitted_at,
    v_dimension,
    v_score
  from public.assessments assessment
  cross join lateral (
    values
      ('learning', assessment.learning, 1),
      ('guidance', assessment.guidance, 2),
      ('professional', assessment.professional, 3),
      ('smart', assessment.smart, 4),
      ('culture', assessment.culture, 5),
      ('empathy', assessment.empathy, 6),
      ('whole', assessment.whole, 7)
  ) as score_row(dimension, score, sort_order)
  where assessment.account_id = v_account_id
    and assessment.period = p_period
    and score_row.score is not null
  order by score_row.score asc, score_row.sort_order asc
  limit 1;

  if v_submitted_at is null then
    return jsonb_build_object(
      'success', false,
      'error', 'ASSESSMENT_NOT_FOUND'
    );
  end if;

  select
    recommendation.training_recommendations,
    recommendation.book_recommendations
  into
    v_training,
    v_books
  from public.growth_recommendations recommendation
  where recommendation.account_id = v_account_id
    and recommendation.period = p_period
    and recommendation.assessment_submitted_at = v_submitted_at;

  return jsonb_build_object(
    'success', true,
    'period', p_period,
    'assessment_submitted_at', v_submitted_at,
    'weakest_dimension', v_dimension,
    'weakest_score', v_score,
    'cached_training', v_training,
    'cached_books', v_books
  );
end
$$;

create or replace function public.recommendation_save(
  p_token uuid,
  p_period text,
  p_assessment_submitted_at timestamptz,
  p_weakest_dimension text,
  p_weakest_score numeric,
  p_kind text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_current_submitted_at timestamptz;
  v_current_dimension text;
  v_current_score numeric;
begin
  if p_period not in ('april', 'october', 'january')
    or p_kind not in ('training', 'books')
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) > 10 then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  select session.account_id
    into v_account_id
  from public.teacher_sessions session
  where session.token = p_token
    and session.expires_at > now();

  if v_account_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_EXPIRED');
  end if;

  select
    assessment.submitted_at,
    score_row.dimension,
    score_row.score
  into
    v_current_submitted_at,
    v_current_dimension,
    v_current_score
  from public.assessments assessment
  cross join lateral (
    values
      ('learning', assessment.learning, 1),
      ('guidance', assessment.guidance, 2),
      ('professional', assessment.professional, 3),
      ('smart', assessment.smart, 4),
      ('culture', assessment.culture, 5),
      ('empathy', assessment.empathy, 6),
      ('whole', assessment.whole, 7)
  ) as score_row(dimension, score, sort_order)
  where assessment.account_id = v_account_id
    and assessment.period = p_period
    and score_row.score is not null
  order by score_row.score asc, score_row.sort_order asc
  limit 1;

  if v_current_submitted_at is null then
    return jsonb_build_object(
      'success', false,
      'error', 'ASSESSMENT_NOT_FOUND'
    );
  end if;

  if v_current_submitted_at <> p_assessment_submitted_at
    or v_current_dimension <> p_weakest_dimension
    or v_current_score <> p_weakest_score then
    return jsonb_build_object('success', false, 'error', 'STALE_RESULT');
  end if;

  insert into public.growth_recommendations (
    account_id,
    period,
    assessment_submitted_at,
    weakest_dimension,
    weakest_score,
    training_recommendations,
    book_recommendations
  )
  values (
    v_account_id,
    p_period,
    p_assessment_submitted_at,
    p_weakest_dimension,
    p_weakest_score,
    case when p_kind = 'training' then p_items else null end,
    case when p_kind = 'books' then p_items else null end
  )
  on conflict (account_id, period, assessment_submitted_at)
  do update set
    weakest_dimension = excluded.weakest_dimension,
    weakest_score = excluded.weakest_score,
    training_recommendations = case
      when p_kind = 'training' then p_items
      else public.growth_recommendations.training_recommendations
    end,
    book_recommendations = case
      when p_kind = 'books' then p_items
      else public.growth_recommendations.book_recommendations
    end,
    updated_at = now();

  return jsonb_build_object('success', true);
end
$$;

create or replace function public.recommendation_book_cache_get(
  p_token uuid,
  p_cache_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_books jsonb;
begin
  select session.account_id
    into v_account_id
  from public.teacher_sessions session
  where session.token = p_token
    and session.expires_at > now();

  if v_account_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_EXPIRED');
  end if;

  select cache.books
    into v_books
  from public.growth_book_cache cache
  where cache.cache_key = p_cache_key
    and cache.expires_at > now();

  return jsonb_build_object(
    'success', true,
    'hit', v_books is not null,
    'books', v_books
  );
end
$$;

create or replace function public.recommendation_book_cache_put(
  p_token uuid,
  p_cache_key text,
  p_dimension text,
  p_query_text text,
  p_books jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
begin
  select session.account_id
    into v_account_id
  from public.teacher_sessions session
  where session.token = p_token
    and session.expires_at > now();

  if v_account_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_EXPIRED');
  end if;

  if char_length(coalesce(p_cache_key, '')) <> 64
    or p_dimension not in (
      'learning',
      'guidance',
      'professional',
      'smart',
      'culture',
      'empathy',
      'whole'
    )
    or char_length(coalesce(p_query_text, '')) > 500
    or jsonb_typeof(p_books) <> 'array'
    or jsonb_array_length(p_books) > 10 then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  insert into public.growth_book_cache (
    cache_key,
    dimension,
    query_text,
    books,
    expires_at
  )
  values (
    p_cache_key,
    p_dimension,
    p_query_text,
    p_books,
    now() + interval '30 days'
  )
  on conflict (cache_key)
  do update set
    dimension = excluded.dimension,
    query_text = excluded.query_text,
    books = excluded.books,
    expires_at = excluded.expires_at,
    updated_at = now();

  return jsonb_build_object('success', true);
end
$$;

create or replace function public.recommendation_history_load(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account_id uuid;
  v_history jsonb;
begin
  select session.account_id
    into v_account_id
  from public.teacher_sessions session
  where session.token = p_token
    and session.expires_at > now();

  if v_account_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_EXPIRED');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'period', recommendation.period,
        'assessment_submitted_at', recommendation.assessment_submitted_at,
        'weakest_dimension', recommendation.weakest_dimension,
        'weakest_score', recommendation.weakest_score,
        'training_recommendations', recommendation.training_recommendations,
        'book_recommendations', recommendation.book_recommendations,
        'created_at', recommendation.created_at,
        'updated_at', recommendation.updated_at
      )
      order by recommendation.created_at desc
    ),
    '[]'::jsonb
  )
  into v_history
  from public.growth_recommendations recommendation
  where recommendation.account_id = v_account_id;

  return jsonb_build_object('success', true, 'history', v_history);
end
$$;

revoke all on function public.recommendation_context(uuid, text) from public;
revoke all on function public.recommendation_save(
  uuid, text, timestamptz, text, numeric, text, jsonb
) from public;
revoke all on function public.recommendation_book_cache_get(uuid, text)
  from public;
revoke all on function public.recommendation_book_cache_put(
  uuid, text, text, text, jsonb
) from public;
revoke all on function public.recommendation_history_load(uuid) from public;

grant execute on function public.recommendation_context(uuid, text)
  to anon, authenticated;
grant execute on function public.recommendation_save(
  uuid, text, timestamptz, text, numeric, text, jsonb
) to anon, authenticated;
grant execute on function public.recommendation_book_cache_get(uuid, text)
  to anon, authenticated;
grant execute on function public.recommendation_book_cache_put(
  uuid, text, text, text, jsonb
) to anon, authenticated;
grant execute on function public.recommendation_history_load(uuid)
  to anon, authenticated;

commit;
