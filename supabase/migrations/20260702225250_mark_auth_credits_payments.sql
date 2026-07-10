create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_minutes integer not null check (amount_minutes <> 0),
  kind text not null check (kind in ('credit_pack', 'analysis_reservation')),
  status text not null check (status in ('posted', 'reserved', 'void')),
  description text not null default '',
  reference_type text not null default '',
  reference_id text not null default '',
  created_at timestamptz not null default now()
);

create unique index credit_transactions_credit_pack_checkout_idx
  on public.credit_transactions (reference_id)
  where kind = 'credit_pack' and reference_type = 'stripe_checkout';

create index credit_transactions_user_created_idx
  on public.credit_transactions (user_id, created_at desc);

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('reserved', 'completed', 'failed')),
  output_mode text not null check (output_mode in ('markers', 'subclips')),
  prompt text not null default '',
  request jsonb not null default '{}'::jsonb,
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  actual_minutes integer not null default 0 check (actual_minutes >= 0),
  error_code text not null default '',
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz
);

create index analysis_jobs_user_created_idx
  on public.analysis_jobs (user_id, created_at desc);

create table public.analysis_segments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.analysis_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  segment_index integer not null default 0,
  start_seconds numeric not null default 0,
  duration_seconds numeric not null default 0,
  billable_minutes integer not null default 0 check (billable_minutes >= 0),
  result_count integer not null default 0 check (result_count >= 0),
  twelvelabs_asset_id text not null default '',
  twelvelabs_task_id text not null default '',
  created_at timestamptz not null default now()
);

create index analysis_segments_job_index_idx
  on public.analysis_segments (job_id, segment_index);

create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  device_code_hash text not null unique,
  user_code text not null,
  status text not null check (status in ('pending', 'authorized', 'expired')),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null default '',
  mark_session_token text not null default '',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  authorized_at timestamptz
);

create index device_sessions_expires_idx
  on public.device_sessions (expires_at);

create table public.stripe_webhook_events (
  id text primary key,
  type text not null,
  checkout_session_id text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.analysis_segments enable row level security;
alter table public.device_sessions enable row level security;
alter table public.stripe_webhook_events enable row level security;

grant select on public.profiles to authenticated;
grant select on public.stripe_customers to authenticated;
grant select on public.credit_transactions to authenticated;
grant select on public.analysis_jobs to authenticated;
grant select on public.analysis_segments to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.stripe_customers to service_role;
grant select, insert, update, delete on public.credit_transactions to service_role;
grant select, insert, update, delete on public.analysis_jobs to service_role;
grant select, insert, update, delete on public.analysis_segments to service_role;
grant select, insert, update, delete on public.device_sessions to service_role;
grant select, insert, update, delete on public.stripe_webhook_events to service_role;

create policy "users can read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users can read own stripe customer"
  on public.stripe_customers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can read own credit transactions"
  on public.credit_transactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can read own analysis jobs"
  on public.analysis_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can read own analysis segments"
  on public.analysis_segments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.mark_credit_balance(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(amount_minutes), 0)::integer
  from public.credit_transactions
  where user_id = p_user_id
    and status in ('posted', 'reserved');
$$;

grant execute on function public.mark_credit_balance(uuid) to authenticated, service_role;

create or replace function public.mark_reserve_minutes(
  p_user_id uuid,
  p_job_id uuid,
  p_minutes integer,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_minutes integer := greatest(coalesce(p_minutes, 0), 0);
  v_balance integer;
begin
  if v_minutes = 0 then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select public.mark_credit_balance(p_user_id) into v_balance;
  if v_balance < v_minutes then
    raise exception 'Buy more Mark credits to analyze this media'
      using errcode = 'P0001',
        hint = json_build_object(
          'code', 'INSUFFICIENT_CREDITS',
          'balanceMinutes', v_balance,
          'requiredMinutes', v_minutes
        )::text;
  end if;

  insert into public.credit_transactions (
    user_id,
    amount_minutes,
    kind,
    status,
    description,
    reference_type,
    reference_id
  ) values (
    p_user_id,
    -v_minutes,
    'analysis_reservation',
    'reserved',
    coalesce(p_description, 'Analysis reservation'),
    'analysis_job',
    p_job_id::text
  );
end;
$$;

revoke all on function public.mark_reserve_minutes(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.mark_reserve_minutes(uuid, uuid, integer, text) to service_role;

create or replace function public.mark_create_analysis_job(
  p_user_id uuid,
  p_email text,
  p_prompt text,
  p_output_mode text,
  p_estimated_minutes integer,
  p_request jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.analysis_jobs;
  v_output_mode text := case when p_output_mode = 'subclips' then 'subclips' else 'markers' end;
  v_estimated integer := greatest(coalesce(p_estimated_minutes, 0), 0);
begin
  insert into public.profiles (id, email, updated_at)
  values (p_user_id, coalesce(p_email, ''), now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = excluded.updated_at;

  insert into public.analysis_jobs (
    user_id,
    status,
    output_mode,
    prompt,
    request,
    estimated_minutes
  ) values (
    p_user_id,
    'reserved',
    v_output_mode,
    coalesce(p_prompt, ''),
    coalesce(p_request, '{}'::jsonb),
    v_estimated
  )
  returning * into v_job;

  perform public.mark_reserve_minutes(p_user_id, v_job.id, v_estimated, 'Analysis reservation');

  return to_jsonb(v_job);
end;
$$;

revoke all on function public.mark_create_analysis_job(uuid, text, text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.mark_create_analysis_job(uuid, text, text, text, integer, jsonb) to service_role;

create or replace function public.mark_reserve_additional_credits(
  p_job_id uuid,
  p_user_id uuid,
  p_additional_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.analysis_jobs;
  v_minutes integer := greatest(coalesce(p_additional_minutes, 0), 0);
begin
  select * into v_job
  from public.analysis_jobs
  where id = p_job_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Analysis job was not found' using errcode = 'P0001';
  end if;

  perform public.mark_reserve_minutes(p_user_id, p_job_id, v_minutes, 'Additional analysis reservation');

  update public.analysis_jobs
  set estimated_minutes = estimated_minutes + v_minutes,
      updated_at = now()
  where id = p_job_id
  returning * into v_job;

  return to_jsonb(v_job);
end;
$$;

revoke all on function public.mark_reserve_additional_credits(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.mark_reserve_additional_credits(uuid, uuid, integer) to service_role;

create or replace function public.mark_complete_analysis_job(
  p_job_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.analysis_jobs;
  v_actual integer;
begin
  select coalesce(sum(billable_minutes), 0)::integer
  into v_actual
  from public.analysis_segments
  where job_id = p_job_id
    and user_id = p_user_id;

  update public.credit_transactions
  set status = 'posted'
  where reference_type = 'analysis_job'
    and reference_id = p_job_id::text
    and user_id = p_user_id
    and status = 'reserved';

  update public.analysis_jobs
  set status = 'completed',
      actual_minutes = v_actual,
      completed_at = now(),
      updated_at = now()
  where id = p_job_id
    and user_id = p_user_id
  returning * into v_job;

  if not found then
    raise exception 'Analysis job was not found' using errcode = 'P0001';
  end if;

  return to_jsonb(v_job);
end;
$$;

revoke all on function public.mark_complete_analysis_job(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_complete_analysis_job(uuid, uuid) to service_role;

create or replace function public.mark_fail_analysis_job(
  p_job_id uuid,
  p_user_id uuid,
  p_error_code text,
  p_error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.analysis_jobs;
begin
  update public.credit_transactions
  set status = 'void'
  where reference_type = 'analysis_job'
    and reference_id = p_job_id::text
    and user_id = p_user_id
    and status = 'reserved';

  update public.analysis_jobs
  set status = 'failed',
      error_code = coalesce(p_error_code, 'ANALYSIS_FAILED'),
      error_message = coalesce(p_error_message, 'Analysis failed'),
      failed_at = now(),
      updated_at = now()
  where id = p_job_id
    and user_id = p_user_id
  returning * into v_job;

  if not found then
    raise exception 'Analysis job was not found' using errcode = 'P0001';
  end if;

  return to_jsonb(v_job);
end;
$$;

revoke all on function public.mark_fail_analysis_job(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_fail_analysis_job(uuid, uuid, text, text) to service_role;

create or replace function public.mark_grant_credit_pack(
  p_user_id uuid,
  p_email text,
  p_minutes integer,
  p_pack_id text,
  p_stripe_event_id text,
  p_stripe_event_type text,
  p_checkout_session_id text,
  p_customer_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted_count integer := 0;
begin
  insert into public.stripe_webhook_events (id, type, checkout_session_id)
  values (p_stripe_event_id, coalesce(p_stripe_event_type, ''), coalesce(p_checkout_session_id, ''))
  on conflict (id) do nothing;

  get diagnostics v_inserted_count = row_count;
  if v_inserted_count = 0 then
    return jsonb_build_object('duplicate', true, 'balanceMinutes', public.mark_credit_balance(p_user_id));
  end if;

  insert into public.profiles (id, email, updated_at)
  values (p_user_id, coalesce(p_email, ''), now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = excluded.updated_at;

  if coalesce(p_customer_id, '') <> '' then
    insert into public.stripe_customers (user_id, stripe_customer_id, updated_at)
    values (p_user_id, p_customer_id, now())
    on conflict (user_id) do update
      set stripe_customer_id = excluded.stripe_customer_id,
          updated_at = excluded.updated_at;
  end if;

  insert into public.credit_transactions (
    user_id,
    amount_minutes,
    kind,
    status,
    description,
    reference_type,
    reference_id
  ) values (
    p_user_id,
    greatest(coalesce(p_minutes, 0), 0),
    'credit_pack',
    'posted',
    coalesce(p_pack_id, ''),
    'stripe_checkout',
    coalesce(p_checkout_session_id, '')
  )
  on conflict do nothing;

  return jsonb_build_object('duplicate', false, 'balanceMinutes', public.mark_credit_balance(p_user_id));
end;
$$;

revoke all on function public.mark_grant_credit_pack(uuid, text, integer, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.mark_grant_credit_pack(uuid, text, integer, text, text, text, text, text) to service_role;
