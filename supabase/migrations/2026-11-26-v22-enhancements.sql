-- ============================================================
-- MoneySpender v2.2 — Additive enhancements migration
-- Safe to run multiple times (idempotent, never drops/alters data).
-- Run in Supabase SQL Editor when ready to enable v2.2 DB features:
--   1. debts.due_date (tanggal jatuh tempo hutang/piutang + reminder H-3)
--   2. recurring_transactions cadence (weekly/monthly/yearly), end_of_month & recurring transfers
--   3. savings_goals (kantong tabungan multi-tujuan / sinking funds)
-- ============================================================

-- 1. Debt due date
alter table public.debts
  add column if not exists due_date date;

create index if not exists debts_user_due_date_idx
  on public.debts (user_id, due_date)
  where is_paid = false and due_date is not null;

-- 2. Flexible recurring schedules + recurring transfers
alter table public.recurring_transactions
  add column if not exists cadence text not null default 'monthly',
  add column if not exists day_of_week integer,
  add column if not exists month_of_year integer,
  add column if not exists end_of_month boolean not null default false,
  add column if not exists to_wallet_id uuid references public.wallets(id) on delete set null,
  add column if not exists to_wallet_label text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'recurring_transactions_cadence_check'
  ) then
    alter table public.recurring_transactions
      add constraint recurring_transactions_cadence_check
      check (cadence in ('weekly', 'monthly', 'yearly'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'recurring_transactions_day_of_week_check'
  ) then
    alter table public.recurring_transactions
      add constraint recurring_transactions_day_of_week_check
      check (day_of_week is null or day_of_week between 0 and 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'recurring_transactions_month_of_year_check'
  ) then
    alter table public.recurring_transactions
      add constraint recurring_transactions_month_of_year_check
      check (month_of_year is null or month_of_year between 1 and 12);
  end if;
end $$;

-- 3. Multi-pocket savings goals (sinking funds)
create table if not exists public.savings_goals (
  id             uuid          primary key default gen_random_uuid(),
  user_id        uuid          not null references auth.users(id) on delete cascade,
  name           text          not null,
  target_amount  numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date    date,
  wallet_id      uuid          references public.wallets(id) on delete set null,
  is_archived    boolean       not null default false,
  created_at     timestamptz   not null default timezone('utc', now()),
  updated_at     timestamptz   not null default timezone('utc', now())
);

create index if not exists savings_goals_user_idx
  on public.savings_goals (user_id, is_archived);

alter table public.savings_goals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings_goals' and policyname = 'Savings goals owner only'
  ) then
    create policy "Savings goals owner only" on public.savings_goals
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_savings_goals_updated_at'
  ) then
    create trigger set_savings_goals_updated_at
      before update on public.savings_goals
      for each row execute function public.set_updated_at();
  end if;
end $$;

notify pgrst, 'reload schema';
