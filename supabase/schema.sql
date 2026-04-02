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

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  category_label text,
  transaction_date date not null default current_date,
  reason text,
  merchant text,
  payment_method text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
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

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

create index if not exists transactions_user_type_date_idx
  on public.transactions (user_id, type, transaction_date desc);

create index if not exists categories_user_idx
  on public.categories (user_id, type);

create index if not exists debts_user_date_idx
  on public.debts (user_id, debt_date desc);

create index if not exists debts_user_paid_idx
  on public.debts (user_id, is_paid, debt_date desc);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

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

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs enable row level security;

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

-- Penting:
-- Kita sengaja TIDAK memakai trigger `auth.users -> handle_new_user`.
-- Pendekatan lama ini sering jadi sumber error signup seperti:
-- "Database error saving new user"
-- Pada project ini, data awal user dibuat saat user pertama kali login ke aplikasi.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
