create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'transaction_type'
  ) then
    create type public.transaction_type as enum ('income', 'expense');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.transaction_type'::regtype
      and enumlabel = 'debt'
  ) then
    alter type public.transaction_type add value 'debt';
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  currency_code text not null default 'IDR',
  monthly_savings_goal numeric(14,2) not null default 4000000,
  yearly_savings_goal numeric(14,2) not null default 48000000,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.transaction_type not null,
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name, type)
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'cash' check (kind in ('cash', 'bank', 'ewallet', 'card', 'other')),
  opening_balance numeric(14,2) not null default 0,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  category_id uuid references public.categories(id) on delete set null,
  category_label text,
  wallet_id uuid references public.wallets(id) on delete set null,
  wallet_label text,
  transaction_date date not null default current_date,
  reason text,
  merchant text,
  payment_method text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wallet_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_wallet_id uuid not null references public.wallets(id) on delete cascade,
  to_wallet_id uuid not null references public.wallets(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  transfer_date date not null default current_date,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (from_wallet_id <> to_wallet_id)
);

alter table if exists public.debts
  add column if not exists paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0);

alter table if exists public.transactions
  add column if not exists wallet_id uuid references public.wallets(id) on delete set null,
  add column if not exists wallet_label text;

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  category_id uuid references public.categories(id) on delete set null,
  category_label text,
  debt_date date not null default current_date,
  source_name text not null,
  lender_name text not null,
  reason text not null,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.debts
  add column if not exists paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_date date not null default current_date,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  debt_id uuid references public.debts(id) on delete cascade,
  label text not null default 'Lampiran',
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (transaction_id is not null or debt_id is not null)
);

create table if not exists public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  category_label text,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reminder_morning_enabled boolean not null default true,
  reminder_evening_enabled boolean not null default true,
  push_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('morning', 'evening')),
  reminder_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, slot, reminder_date)
);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, category_id, month)
);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null check (type in ('income', 'expense')),
  category_id uuid references public.categories(id) on delete set null,
  category_label text,
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  merchant text,
  payment_method text,
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  last_generated_month text check (last_generated_month is null or last_generated_month ~ '^[0-9]{4}-[0-9]{2}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.recurring_transactions
  add column if not exists last_generated_month text check (last_generated_month is null or last_generated_month ~ '^[0-9]{4}-[0-9]{2}$');

create table if not exists public.budget_notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  threshold integer not null check (threshold in (80, 100)),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, category_id, month, threshold)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

create index if not exists transactions_user_type_date_idx
  on public.transactions (user_id, type, transaction_date desc);

create index if not exists categories_user_idx
  on public.categories (user_id, type);

create index if not exists wallets_user_idx
  on public.wallets (user_id, is_archived);

create index if not exists wallet_transfers_user_date_idx
  on public.wallet_transfers (user_id, transfer_date desc);

create index if not exists debts_user_date_idx
  on public.debts (user_id, debt_date desc);

create index if not exists debts_user_paid_idx
  on public.debts (user_id, is_paid, debt_date desc);

create index if not exists debt_payments_debt_idx
  on public.debt_payments (debt_id, paid_date desc);

create index if not exists transaction_attachments_user_idx
  on public.transaction_attachments (user_id, created_at desc);

create index if not exists transaction_splits_transaction_idx
  on public.transaction_splits (transaction_id);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

create index if not exists monthly_budgets_user_month_idx
  on public.monthly_budgets (user_id, month);

create index if not exists recurring_transactions_user_idx
  on public.recurring_transactions (user_id, is_active);

create index if not exists budget_notification_logs_user_idx
  on public.budget_notification_logs (user_id, month);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_reminder_preferences_updated_at on public.reminder_preferences;
create trigger set_reminder_preferences_updated_at
before update on public.reminder_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_debts_updated_at on public.debts;
create trigger set_debts_updated_at
before update on public.debts
for each row execute function public.set_updated_at();

drop trigger if exists set_monthly_budgets_updated_at on public.monthly_budgets;
create trigger set_monthly_budgets_updated_at
before update on public.monthly_budgets
for each row execute function public.set_updated_at();

drop trigger if exists set_recurring_transactions_updated_at on public.recurring_transactions;
create trigger set_recurring_transactions_updated_at
before update on public.recurring_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_wallets_updated_at on public.wallets;
create trigger set_wallets_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

drop trigger if exists set_wallet_transfers_updated_at on public.wallet_transfers;
create trigger set_wallet_transfers_updated_at
before update on public.wallet_transfers
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.transaction_attachments enable row level security;
alter table public.transaction_splits enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.wallets enable row level security;
alter table public.audit_logs enable row level security;
alter table public.wallet_transfers enable row level security;
alter table public.budget_notification_logs enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Categories owner only" on public.categories;
create policy "Categories owner only"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Wallets owner only" on public.wallets;
create policy "Wallets owner only"
  on public.wallets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Wallet transfers owner only" on public.wallet_transfers;
create policy "Wallet transfers owner only"
  on public.wallet_transfers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Transactions owner only" on public.transactions;
create policy "Transactions owner only"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Debts owner only" on public.debts;
create policy "Debts owner only"
  on public.debts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Debt payments owner only" on public.debt_payments;
create policy "Debt payments owner only"
  on public.debt_payments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Attachments owner only" on public.transaction_attachments;
create policy "Attachments owner only"
  on public.transaction_attachments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Transaction splits owner only" on public.transaction_splits;
create policy "Transaction splits owner only"
  on public.transaction_splits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Reminder owner only" on public.reminder_preferences;
create policy "Reminder owner only"
  on public.reminder_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Push subscriptions owner only" on public.push_subscriptions;
create policy "Push subscriptions owner only"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Notification logs owner only" on public.notification_logs;
create policy "Notification logs owner only"
  on public.notification_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Monthly budgets owner only" on public.monthly_budgets;
create policy "Monthly budgets owner only"
  on public.monthly_budgets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Recurring transactions owner only" on public.recurring_transactions;
create policy "Recurring transactions owner only"
  on public.recurring_transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Audit logs owner read" on public.audit_logs;
create policy "Audit logs owner read"
  on public.audit_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Budget notification logs owner read" on public.budget_notification_logs;
create policy "Budget notification logs owner read"
  on public.budget_notification_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users upload own receipts" on storage.objects;
create policy "Users upload own receipts"
  on storage.objects
  for insert
  with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users read own receipts" on storage.objects;
create policy "Users read own receipts"
  on storage.objects
  for select
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

-- Penting:
-- Kita sengaja TIDAK memakai trigger `auth.users -> handle_new_user`.
-- Pendekatan lama ini sering jadi sumber error signup seperti:
-- "Database error saving new user"
-- Pada project ini, data awal user dibuat saat user pertama kali login ke aplikasi.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
