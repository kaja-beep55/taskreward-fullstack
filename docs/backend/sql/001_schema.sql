-- ============================================================
-- TaskReward V1 Database Schema
-- Supabase (PostgreSQL 15+)
-- Phase 2: Database + Authentication
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES — User accounts (anonymous auth, no email/phone)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) >= 2 and char_length(name) <= 60),
  district      text not null,
  status        text not null default 'active' check (status in ('active', 'blocked')),
  referral_code text unique,
  referred_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_active_at timestamptz
);

-- ============================================================
-- 2. ACCOUNT_RECOVERY — Recovery codes (hashed, never plain)
-- ============================================================
create table public.account_recovery (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles(id) on delete cascade,
  recovery_code_hash  text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_used_at        timestamptz,
  failed_attempts     integer not null default 0,
  locked_until        timestamptz
);

-- ============================================================
-- 3. TASKS — Admin-created tasks
-- ============================================================
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) >= 3 and char_length(title) <= 120),
  short_desc       text not null check (char_length(short_desc) >= 5 and char_length(short_desc) <= 160),
  full_desc        text not null,
  what_to_do       jsonb not null check (jsonb_array_length(what_to_do) >= 1),
  what_not_to_do   jsonb not null check (jsonb_array_length(what_not_to_do) >= 1),
  requirements     text,
  target_url       text not null check (target_url ~ '^https?://'),
  image_url        text,
  reward_coins     integer not null check (reward_coins > 0 and reward_coins <= 100000),
  est_time         text,
  proof_required   boolean not null default true,
  proof_type       text not null default 'video_whatsapp' check (proof_type in ('video_whatsapp')),
  status           text not null default 'draft' check (status in ('draft', 'published', 'paused', 'archived')),
  max_completions  integer check (max_completions is null or max_completions > 0),
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- 4. TASK_SUBMISSIONS — User task completion reports
-- ============================================================
create table public.task_submissions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  task_id          uuid not null references public.tasks(id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at     timestamptz not null default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.profiles(id),
  unique(user_id, task_id)
);

-- ============================================================
-- 5. COIN_LEDGER — Append-only financial records
-- ============================================================
create table public.coin_ledger (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  delta            integer not null check (delta != 0),
  type             text not null check (type in ('task_reward', 'bonus', 'admin_adjustment', 'payout_settlement', 'reversal')),
  reason           text not null check (char_length(reason) >= 3 and char_length(reason) <= 200),
  reference_id     uuid,
  admin_id         uuid references public.profiles(id),
  idempotency_key  text not null unique,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- 6. ADMIN_ROLES — Admin access control
-- ============================================================
create table public.admin_roles (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  role       text not null default 'admin' check (role in ('super_admin', 'admin', 'reviewer')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. APP_SETTINGS — Runtime configuration
-- ============================================================
create table public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('whatsapp_number', '10000000000'),
  ('app_name', 'TaskReward'),
  ('coin_to_bdt_rate', '0.10')
on conflict (key) do nothing;

-- ============================================================
-- 8. AUDIT_LOGS — Admin action tracking
-- ============================================================
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id),
  action     text not null check (char_length(action) >= 3 and char_length(action) <= 100),
  target_id  text,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_profiles_status on public.profiles(status);
create index idx_profiles_referral on public.profiles(referral_code);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_created_by on public.tasks(created_by);
create index idx_submissions_user on public.task_submissions(user_id);
create index idx_submissions_task on public.task_submissions(task_id);
create index idx_submissions_status on public.task_submissions(status);
create index idx_ledger_user on public.coin_ledger(user_id);
create index idx_ledger_idempotency on public.coin_ledger(idempotency_key);
create index idx_audit_actor on public.audit_logs(actor_id);
create index idx_audit_action on public.audit_logs(action);

-- ============================================================
-- VIEWS — Computed balances (never stored)
-- ============================================================
create or replace view public.user_balances as
select
  user_id,
  coalesce(sum(delta), 0) as balance,
  count(*) as transaction_count,
  max(created_at) as last_transaction_at
from public.coin_ledger
group by user_id;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid()
    and role in ('super_admin', 'admin')
  );
$$ language sql stable security definer;

create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid()
    and role = 'super_admin'
  );
$$ language sql stable security definer;

create or replace function public.get_balance(target_user_id uuid)
returns integer as $$
  select coalesce(sum(delta), 0)::integer
  from public.coin_ledger
  where user_id = target_user_id;
$$ language sql stable security definer;

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Enabled on all tables
-- ============================================================
alter table public.profiles enable row level security;
alter table public.account_recovery enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.admin_roles enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and status = 'active');

create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- ============================================================
-- RLS POLICIES: account_recovery
-- ============================================================
create policy "recovery_select_own" on public.account_recovery
  for select using (auth.uid() = user_id);

create policy "recovery_insert_own" on public.account_recovery
  for insert with check (auth.uid() = user_id);

create policy "recovery_update_own" on public.account_recovery
  for update using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: tasks
-- ============================================================
create policy "tasks_select_published" on public.tasks
  for select using (status = 'published');

create policy "tasks_select_admin" on public.tasks
  for select using (public.is_admin());

create policy "tasks_insert_admin" on public.tasks
  for insert with check (public.is_admin());

create policy "tasks_update_admin" on public.tasks
  for update using (public.is_admin());

-- ============================================================
-- RLS POLICIES: task_submissions
-- ============================================================
create policy "submissions_select_own" on public.task_submissions
  for select using (auth.uid() = user_id);

create policy "submissions_insert_own" on public.task_submissions
  for insert with check (auth.uid() = user_id);

create policy "submissions_select_admin" on public.task_submissions
  for select using (public.is_admin());

create policy "submissions_update_admin" on public.task_submissions
  for update using (public.is_admin());

-- ============================================================
-- RLS POLICIES: coin_ledger
-- ============================================================
create policy "ledger_select_own" on public.coin_ledger
  for select using (auth.uid() = user_id);

create policy "ledger_select_admin" on public.coin_ledger
  for select using (public.is_admin());

-- ============================================================
-- RLS POLICIES: admin_roles
-- ============================================================
create policy "roles_select_own" on public.admin_roles
  for select using (auth.uid() = user_id);

create policy "roles_select_super" on public.admin_roles
  for select using (public.is_super_admin());

create policy "roles_all_super" on public.admin_roles
  for all using (public.is_super_admin());

-- ============================================================
-- RLS POLICIES: app_settings
-- ============================================================
create policy "settings_select_all" on public.app_settings
  for select using (true);

create policy "settings_update_admin" on public.app_settings
  for update using (public.is_admin());

create policy "settings_insert_admin" on public.app_settings
  for insert with check (public.is_admin());

-- ============================================================
-- RLS POLICIES: audit_logs
-- ============================================================
create policy "audit_select_admin" on public.audit_logs
  for select using (public.is_admin());

-- ============================================================
-- INITIAL ADMIN SETUP
-- ============================================================
create or replace function public.setup_initial_admin()
returns trigger as $$
begin
  if not exists (select 1 from public.admin_roles limit 1) then
    insert into public.admin_roles (user_id, role)
    values (new.id, 'super_admin');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_first_profile_created
  after insert on public.profiles
  for each row execute function public.setup_initial_admin();

-- ============================================================
-- SECURE FUNCTIONS (SECURITY DEFINER)
-- ============================================================

create or replace function public.generate_recovery_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  part1 text := '';
  part2 text := '';
  part3 text := '';
  i integer;
begin
  for i in 1..4 loop
    part1 := part1 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    part2 := part2 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    part3 := part3 || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return part1 || '-' || part2 || '-' || part3;
end;
$$ language plpgsql;

create or replace function public.create_profile_with_recovery(
  p_name text,
  p_district text
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_recovery_code text;
  v_recovery_hash text;
  v_profile jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Profile already exists';
  end if;

  insert into public.profiles (id, name, district, referral_code)
  values (
    v_user_id,
    p_name,
    p_district,
    upper(substr(md5(random()::text), 1, 8))
  );

  v_recovery_code := public.generate_recovery_code();
  v_recovery_hash := crypt(v_recovery_code, gen_salt('bf', 10));

  insert into public.account_recovery (user_id, recovery_code_hash)
  values (v_user_id, v_recovery_hash);

  select jsonb_build_object(
    'id', id,
    'name', name,
    'district', district,
    'status', status,
    'referral_code', referral_code,
    'created_at', created_at
  ) into v_profile
  from public.profiles where id = v_user_id;

  return v_profile || jsonb_build_object('recovery_code', v_recovery_code);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.recover_account(
  p_recovery_code text
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_locked_until timestamptz;
  v_failed_attempts integer;
  v_profile jsonb;
begin
  select locked_until, failed_attempts into v_locked_until, v_failed_attempts
  from public.account_recovery
  where recovery_code_hash = crypt(p_recovery_code, recovery_code_hash);

  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'Account temporarily locked. Try again later.';
  end if;

  select user_id into v_user_id
  from public.account_recovery
  where recovery_code_hash = crypt(p_recovery_code, recovery_code_hash);

  if v_user_id is null then
    update public.account_recovery
    set failed_attempts = failed_attempts + 1,
        locked_until = case
          when failed_attempts >= 4 then now() + interval '15 minutes'
          when failed_attempts >= 9 then now() + interval '1 hour'
          else locked_until
        end
    where recovery_code_hash = crypt(p_recovery_code, recovery_code_hash);
    
    raise exception 'Invalid recovery code';
  end if;

  update public.account_recovery
  set failed_attempts = 0,
      last_used_at = now()
  where user_id = v_user_id;

  select jsonb_build_object(
    'id', id,
    'name', name,
    'district', district,
    'status', status,
    'created_at', created_at
  ) into v_profile
  from public.profiles
  where id = v_user_id;

  return v_profile;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.admin_add_coins(
  p_target_user_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text
)
returns jsonb as $$
declare
  v_admin_id uuid;
  v_new_balance integer;
begin
  v_admin_id := auth.uid();

  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 or p_amount > 10000 then
    raise exception 'Invalid amount';
  end if;

  if char_length(p_reason) < 3 then
    raise exception 'Reason too short';
  end if;

  if exists (select 1 from public.coin_ledger where idempotency_key = p_idempotency_key) then
    raise exception 'Duplicate request';
  end if;

  insert into public.coin_ledger (user_id, delta, type, reason, admin_id, idempotency_key)
  values (p_target_user_id, p_amount, 'admin_adjustment', p_reason, v_admin_id, p_idempotency_key);

  insert into public.audit_logs (actor_id, action, target_id, metadata)
  values (
    v_admin_id,
    'admin_add_coins',
    p_target_user_id::text,
    jsonb_build_object('amount', p_amount, 'reason', p_reason)
  );

  v_new_balance := public.get_balance(p_target_user_id);

  return jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_added', p_amount
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.admin_settle_coins(
  p_target_user_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text
)
returns jsonb as $$
declare
  v_admin_id uuid;
  v_current_balance integer;
  v_new_balance integer;
begin
  v_admin_id := auth.uid();

  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  v_current_balance := public.get_balance(p_target_user_id);
  if p_amount > v_current_balance then
    raise exception 'Insufficient balance';
  end if;

  if exists (select 1 from public.coin_ledger where idempotency_key = p_idempotency_key) then
    raise exception 'Duplicate request';
  end if;

  insert into public.coin_ledger (user_id, delta, type, reason, admin_id, idempotency_key)
  values (p_target_user_id, -p_amount, 'payout_settlement', p_reason, v_admin_id, p_idempotency_key);

  insert into public.audit_logs (actor_id, action, target_id, metadata)
  values (
    v_admin_id,
    'admin_settle_coins',
    p_target_user_id::text,
    jsonb_build_object('amount', p_amount, 'reason', p_reason, 'previous_balance', v_current_balance)
  );

  v_new_balance := public.get_balance(p_target_user_id);

  return jsonb_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'amount_settled', p_amount
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.admin_block_user(
  p_target_user_id uuid,
  p_reason text default 'Blocked by admin'
)
returns jsonb as $$
declare
  v_admin_id uuid;
begin
  v_admin_id := auth.uid();

  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.profiles
  set status = 'blocked', updated_at = now()
  where id = p_target_user_id;

  insert into public.audit_logs (actor_id, action, target_id, metadata)
  values (v_admin_id, 'admin_block_user', p_target_user_id::text, jsonb_build_object('reason', p_reason));

  return jsonb_build_object('success', true, 'user_id', p_target_user_id, 'status', 'blocked');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.admin_unblock_user(
  p_target_user_id uuid
)
returns jsonb as $$
declare
  v_admin_id uuid;
begin
  v_admin_id := auth.uid();

  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.profiles
  set status = 'active', updated_at = now()
  where id = p_target_user_id;

  insert into public.audit_logs (actor_id, action, target_id, metadata)
  values (v_admin_id, 'admin_unblock_user', p_target_user_id::text, '{}');

  return jsonb_build_object('success', true, 'user_id', p_target_user_id, 'status', 'active');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.admin_review_submission(
  p_submission_id uuid,
  p_status text,
  p_rejection_reason text default null
)
returns jsonb as $$
declare
  v_admin_id uuid;
  v_submission record;
begin
  v_admin_id := auth.uid();

  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status';
  end if;

  select * into v_submission from public.task_submissions where id = p_submission_id;
  if not found then
    raise exception 'Submission not found';
  end if;

  update public.task_submissions
  set status = p_status,
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      rejection_reason = case when p_status = 'rejected' then p_rejection_reason else null end
  where id = p_submission_id;

  insert into public.audit_logs (actor_id, action, target_id, metadata)
  values (
    v_admin_id,
    'admin_review_submission',
    p_submission_id::text,
    jsonb_build_object('status', p_status, 'user_id', v_submission.user_id, 'task_id', v_submission.task_id)
  );

  return jsonb_build_object('success', true, 'submission_id', p_submission_id, 'status', p_status);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.create_task_submission(
  p_task_id uuid
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_task record;
  v_existing integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select count(*) into v_existing
  from public.task_submissions
  where user_id = v_user_id and task_id = p_task_id;

  if v_existing > 0 then
    raise exception 'Task already submitted';
  end if;

  select * into v_task from public.tasks where id = p_task_id and status = 'published';
  if not found then
    raise exception 'Task not available';
  end if;

  insert into public.task_submissions (user_id, task_id)
  values (v_user_id, p_task_id);

  return jsonb_build_object('success', true, 'message', 'Task submitted for review');
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.tasks to anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select on public.task_submissions to authenticated;
grant insert on public.task_submissions to authenticated;
grant select on public.coin_ledger to authenticated;
grant select on public.account_recovery to authenticated;
grant insert on public.account_recovery to authenticated;
grant update on public.account_recovery to authenticated;
grant select on public.admin_roles to authenticated;
grant select on public.audit_logs to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_balance(uuid) to authenticated;
grant execute on function public.create_profile_with_recovery(text, text) to authenticated;
grant execute on function public.recover_account(text) to anon, authenticated;
grant execute on function public.admin_add_coins(uuid, integer, text, text) to authenticated;
grant execute on function public.admin_settle_coins(uuid, integer, text, text) to authenticated;
grant execute on function public.admin_block_user(uuid, text) to authenticated;
grant execute on function public.admin_unblock_user(uuid) to authenticated;
grant execute on function public.admin_review_submission(uuid, text, text) to authenticated;
grant execute on function public.create_task_submission(uuid) to authenticated;
