-- ============================================================
-- MoneySpender v2 — preferences, hourly digest, transaction templates
-- PLAN.md section 5. ADDITIVE ONLY: no existing column, row or policy is
-- dropped or changed. Idempotent: safe to run more than once.
--
-- Run manually in the Supabase SQL Editor (Dashboard > SQL Editor > New query),
-- then verify with:  npm run check:schema
-- ============================================================

begin;

-- ── profiles: language + savings reserve ─────────────────────
alter table public.profiles
  add column if not exists locale text not null default 'id';

alter table public.profiles
  add column if not exists reserve_savings boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_locale_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_locale_check check (locale in ('id', 'en'));
  end if;
end $$;

-- ── reminder_preferences: digest settings ────────────────────
alter table public.reminder_preferences
  add column if not exists digest_enabled boolean not null default true;

-- 0 = three times a day (active_start, midpoint, active_end)
alter table public.reminder_preferences
  add column if not exists digest_every_hours integer not null default 3;

alter table public.reminder_preferences
  add column if not exists active_start integer not null default 9;

alter table public.reminder_preferences
  add column if not exists active_end integer not null default 21;

alter table public.reminder_preferences
  add column if not exists hide_amounts boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reminder_preferences_digest_every_hours_check'
      and conrelid = 'public.reminder_preferences'::regclass
  ) then
    alter table public.reminder_preferences
      add constraint reminder_preferences_digest_every_hours_check
      check (digest_every_hours in (0, 2, 3, 4));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reminder_preferences_active_hours_check'
      and conrelid = 'public.reminder_preferences'::regclass
  ) then
    alter table public.reminder_preferences
      add constraint reminder_preferences_active_hours_check
      check (
        active_start between 0 and 23
        and active_end between 0 and 23
        and active_start < active_end
      );
  end if;
end $$;

-- ── notification_digest_logs: per-device dedup of the hourly digest ──
create table if not exists public.notification_digest_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  endpoint   text        not null,
  local_date date        not null,
  local_hour integer     not null check (local_hour between 0 and 23),
  kind       text        not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (endpoint, local_date, local_hour)
);

create index if not exists notification_digest_logs_user_idx
  on public.notification_digest_logs (user_id, local_date desc);

alter table public.notification_digest_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_digest_logs'
      and policyname = 'Notification digest logs owner read'
  ) then
    create policy "Notification digest logs owner read" on public.notification_digest_logs
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- ── transaction_templates: one-tap quick add ─────────────────
create table if not exists public.transaction_templates (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  label          text        not null,
  type           public.transaction_type not null,
  amount         numeric(14,2) not null check (amount > 0),
  category_id    uuid        references public.categories(id) on delete set null,
  category_label text,
  wallet_id      uuid        references public.wallets(id) on delete set null,
  wallet_label   text,
  sort_order     integer     not null default 0,
  created_at     timestamptz not null default timezone('utc', now())
);

create index if not exists transaction_templates_user_idx
  on public.transaction_templates (user_id, sort_order);

alter table public.transaction_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_templates'
      and policyname = 'Transaction templates owner only'
  ) then
    create policy "Transaction templates owner only" on public.transaction_templates
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

commit;

-- Make PostgREST pick up the new columns/tables immediately.
notify pgrst, 'reload schema';
