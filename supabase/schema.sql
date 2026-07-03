-- ============================================================
-- MoneySpender — Full Schema (drop & recreate)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ── 1. DROP semua (urutan child → parent) ───────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at() cascade;

drop table if exists public.budget_notification_logs  cascade;
drop table if exists public.audit_logs                cascade;
drop table if exists public.notification_logs         cascade;
drop table if exists public.push_subscriptions        cascade;
drop table if exists public.transaction_attachments   cascade;
drop table if exists public.transaction_splits        cascade;
drop table if exists public.debt_payments             cascade;
drop table if exists public.recurring_transactions    cascade;
drop table if exists public.monthly_budgets           cascade;
drop table if exists public.wallet_transfers          cascade;
drop table if exists public.transactions              cascade;
drop table if exists public.debts                     cascade;
drop table if exists public.wallets                   cascade;
drop table if exists public.categories                cascade;
drop table if exists public.reminder_preferences      cascade;
drop table if exists public.profiles                  cascade;

drop type if exists public.transaction_type cascade;
drop type if exists public.debt_direction   cascade;

-- ── 2. Extensions ────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── 3. Enum types ────────────────────────────────────────────
create type public.transaction_type as enum ('income', 'expense');
create type public.debt_direction   as enum ('payable', 'receivable');

-- ── 4. Helper function ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ── 5. Tables ────────────────────────────────────────────────

-- profiles: data & preferensi per user
create table public.profiles (
  id                   uuid        primary key references auth.users(id) on delete cascade,
  full_name            text,
  currency_code        text        not null default 'IDR',
  monthly_savings_goal numeric(14,2) not null default 4000000,
  yearly_savings_goal  numeric(14,2) not null default 48000000,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now())
);

-- categories: kategori income/expense/debt buatan user
create table public.categories (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  type       public.transaction_type not null,
  color      text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name, type)
);

-- wallets: tempat menyimpan uang (tunai, bank, e-wallet, kartu kredit, dll)
create table public.wallets (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  name            text        not null,
  -- cash=tunai, bank=rekening bank, ewallet=gopay/ovo/dana dll,
  -- card=kartu kredit (balance = hutang kartu), other=lainnya
  kind            text        not null default 'cash'
                  check (kind in ('cash', 'bank', 'ewallet', 'card', 'other')),
  opening_balance numeric(14,2) not null default 0,
  color           text,
  is_archived     boolean     not null default false,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

-- transactions: pemasukan & pengeluaran harian
-- wallet_id wajib diisi → saldo dompet dihitung dari sini
create table public.transactions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  type             public.transaction_type not null,
  amount           numeric(14,2) not null check (amount > 0),
  category_id      uuid        references public.categories(id) on delete set null,
  category_label   text,
  wallet_id        uuid        references public.wallets(id) on delete set null,
  wallet_label     text,
  transaction_date date        not null default current_date,
  reason           text,
  merchant         text,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

-- wallet_transfers: pindah uang antar dompet (tidak mempengaruhi income/expense)
create table public.wallet_transfers (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  from_wallet_id  uuid        not null references public.wallets(id) on delete cascade,
  to_wallet_id    uuid        not null references public.wallets(id) on delete cascade,
  amount          numeric(14,2) not null check (amount > 0),
  transfer_date   date        not null default current_date,
  note            text,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  check (from_wallet_id <> to_wallet_id)
);

-- debts: hutang (payable) dan piutang (receivable)
--
-- KONSEP WALLET INTEGRATION:
--
-- PAYABLE (kamu berhutang):
--   → Uang masuk ke wallet kamu (wallet_id = dompet penerima)
--   → wallet.balance bertambah saat debt dicatat
--   → wallet.balance berkurang saat dibayar lewat debt_payments.wallet_id
--   Contoh: Pinjam Rp2jt dari Budi → masuk Mandiri → Mandiri +2jt, Hutang +2jt
--
-- RECEIVABLE (kamu memberi pinjaman):
--   → Uang keluar dari wallet kamu (wallet_id = dompet sumber)
--   → wallet.balance berkurang saat piutang dicatat
--   → wallet.balance bertambah saat diterima lewat debt_payments.wallet_id
--   Contoh: Kasih Cici Rp500rb dari GoPay → GoPay -500rb, Piutang +500rb
--
-- source_name: nama orang/platform pemberi/penerima (bisa diketik manual)
-- contact_name: nama kontak (siapa yang terlibat)

create table public.debts (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  direction      public.debt_direction not null default 'payable',
  amount         numeric(14,2) not null check (amount > 0),
  paid_amount    numeric(14,2) not null default 0 check (paid_amount >= 0),

  -- Dompet yang terpengaruh langsung saat debt dicatat:
  -- payable   → wallet yang MENERIMA uang pinjaman
  -- receivable → wallet yang MENGELUARKAN uang pinjaman
  wallet_id      uuid        references public.wallets(id) on delete set null,
  wallet_label   text,

  category_id    uuid        references public.categories(id) on delete set null,
  category_label text,
  debt_date      date        not null default current_date,

  -- contact_name: nama orang/pihak yang terlibat
  -- payable   → nama pemberi hutang (siapa yang kamu hutangi)
  -- receivable → nama peminjam (siapa yang berhutang ke kamu)
  contact_name   text        not null default '',

  -- source_name: platform / asal transaksi (BCA, GoPay, Transfer, dll)
  -- Bisa diketik manual jika tidak ada di daftar
  source_name    text        not null default '',

  reason         text        not null default '',
  is_paid        boolean     not null default false,
  paid_at        timestamptz,
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now())
);

-- debt_payments: riwayat cicilan / pembayaran hutang & piutang
-- wallet_id di sini = dompet yang digunakan untuk bayar/terima
-- payable   → dompet yang MENGELUARKAN uang untuk bayar hutang (balance berkurang)
-- receivable → dompet yang MENERIMA uang balik dari piutang (balance bertambah)
create table public.debt_payments (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  debt_id    uuid        not null references public.debts(id) on delete cascade,
  amount     numeric(14,2) not null check (amount > 0),
  wallet_id  uuid        references public.wallets(id) on delete set null,
  wallet_label text,
  paid_date  date        not null default current_date,
  note       text,
  created_at timestamptz not null default timezone('utc', now())
);

-- transaction_attachments: lampiran / foto struk
create table public.transaction_attachments (
  id             uuid    primary key default gen_random_uuid(),
  user_id        uuid    not null references auth.users(id) on delete cascade,
  transaction_id uuid    references public.transactions(id) on delete cascade,
  debt_id        uuid    references public.debts(id) on delete cascade,
  label          text    not null default 'Lampiran',
  file_url       text    not null,
  created_at     timestamptz not null default timezone('utc', now()),
  check (transaction_id is not null or debt_id is not null)
);

-- transaction_splits: split 1 transaksi ke beberapa kategori
create table public.transaction_splits (
  id             uuid    primary key default gen_random_uuid(),
  user_id        uuid    not null references auth.users(id) on delete cascade,
  transaction_id uuid    not null references public.transactions(id) on delete cascade,
  category_id    uuid    references public.categories(id) on delete set null,
  category_label text,
  amount         numeric(14,2) not null check (amount > 0),
  created_at     timestamptz not null default timezone('utc', now())
);

-- reminder_preferences: pengingat push notification
create table public.reminder_preferences (
  user_id                  uuid    primary key references auth.users(id) on delete cascade,
  reminder_morning_enabled boolean not null default true,
  reminder_evening_enabled boolean not null default true,
  push_enabled             boolean not null default false,
  created_at               timestamptz not null default timezone('utc', now()),
  updated_at               timestamptz not null default timezone('utc', now())
);

-- push_subscriptions: web push credentials
create table public.push_subscriptions (
  id         uuid    primary key default gen_random_uuid(),
  user_id    uuid    not null references auth.users(id) on delete cascade,
  endpoint   text    not null unique,
  p256dh     text    not null,
  auth       text    not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

-- notification_logs: dedup log reminder harian
create table public.notification_logs (
  id            uuid    primary key default gen_random_uuid(),
  user_id       uuid    not null references auth.users(id) on delete cascade,
  slot          text    not null check (slot in ('morning', 'evening')),
  reminder_date date    not null,
  created_at    timestamptz not null default timezone('utc', now()),
  unique (user_id, slot, reminder_date)
);

-- monthly_budgets: batas belanja per kategori per bulan
create table public.monthly_budgets (
  id          uuid    primary key default gen_random_uuid(),
  user_id     uuid    not null references auth.users(id) on delete cascade,
  category_id uuid    not null references public.categories(id) on delete cascade,
  month       text    not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount      numeric(14,2) not null check (amount >= 0),
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  unique (user_id, category_id, month)
);

-- recurring_transactions: template transaksi berulang
create table public.recurring_transactions (
  id                   uuid    primary key default gen_random_uuid(),
  user_id              uuid    not null references auth.users(id) on delete cascade,
  type                 public.transaction_type not null,
  category_id          uuid    references public.categories(id) on delete set null,
  category_label       text,
  wallet_id            uuid    references public.wallets(id) on delete set null,
  wallet_label         text,
  amount               numeric(14,2) not null check (amount > 0),
  reason               text    not null,
  merchant             text,
  day_of_month         integer not null default 1 check (day_of_month between 1 and 28),
  last_generated_month text    check (last_generated_month is null
                                or last_generated_month ~ '^[0-9]{4}-[0-9]{2}$'),
  is_active            boolean not null default true,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now())
);

-- budget_notification_logs: dedup notif budget 80%/100%
create table public.budget_notification_logs (
  id          uuid    primary key default gen_random_uuid(),
  user_id     uuid    not null references auth.users(id) on delete cascade,
  category_id uuid    references public.categories(id) on delete cascade,
  month       text    not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  threshold   integer not null check (threshold in (80, 100)),
  created_at  timestamptz not null default timezone('utc', now()),
  unique (user_id, category_id, month, threshold)
);

-- audit_logs: log aktivitas penting (read-only untuk user)
create table public.audit_logs (
  id         uuid    primary key default gen_random_uuid(),
  user_id    uuid    references auth.users(id) on delete set null,
  action     text    not null,
  metadata   jsonb   not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- ── 6. Storage bucket ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- ── 7. Indexes ───────────────────────────────────────────────
create index transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

create index transactions_user_type_date_idx
  on public.transactions (user_id, type, transaction_date desc);

create index transactions_wallet_idx
  on public.transactions (wallet_id, transaction_date desc);

create index categories_user_idx
  on public.categories (user_id, type);

create index wallets_user_idx
  on public.wallets (user_id, is_archived);

create index wallet_transfers_user_date_idx
  on public.wallet_transfers (user_id, transfer_date desc);

create index debts_user_date_idx
  on public.debts (user_id, debt_date desc);

create index debts_user_direction_paid_idx
  on public.debts (user_id, direction, is_paid, debt_date desc);

create index debts_wallet_idx
  on public.debts (wallet_id);

create index debt_payments_debt_idx
  on public.debt_payments (debt_id, paid_date desc);

create index debt_payments_wallet_idx
  on public.debt_payments (wallet_id);

create index transaction_attachments_user_idx
  on public.transaction_attachments (user_id, created_at desc);

create index transaction_splits_transaction_idx
  on public.transaction_splits (transaction_id);

create index push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

create index monthly_budgets_user_month_idx
  on public.monthly_budgets (user_id, month);

create index recurring_transactions_user_idx
  on public.recurring_transactions (user_id, is_active);

create index budget_notification_logs_user_idx
  on public.budget_notification_logs (user_id, month);

-- ── 8. Triggers ──────────────────────────────────────────────
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

create trigger set_wallet_transfers_updated_at
  before update on public.wallet_transfers
  for each row execute function public.set_updated_at();

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger set_debts_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

create trigger set_reminder_preferences_updated_at
  before update on public.reminder_preferences
  for each row execute function public.set_updated_at();

create trigger set_monthly_budgets_updated_at
  before update on public.monthly_budgets
  for each row execute function public.set_updated_at();

create trigger set_recurring_transactions_updated_at
  before update on public.recurring_transactions
  for each row execute function public.set_updated_at();

-- ── 9. Row Level Security ────────────────────────────────────
alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.wallets                enable row level security;
alter table public.wallet_transfers       enable row level security;
alter table public.transactions           enable row level security;
alter table public.debts                  enable row level security;
alter table public.debt_payments          enable row level security;
alter table public.transaction_attachments enable row level security;
alter table public.transaction_splits     enable row level security;
alter table public.reminder_preferences   enable row level security;
alter table public.push_subscriptions     enable row level security;
alter table public.notification_logs      enable row level security;
alter table public.monthly_budgets        enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.budget_notification_logs enable row level security;
alter table public.audit_logs             enable row level security;

-- profiles
create policy "Profiles owner only" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- categories
create policy "Categories owner only" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wallets
create policy "Wallets owner only" on public.wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wallet_transfers
create policy "Wallet transfers owner only" on public.wallet_transfers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- transactions
create policy "Transactions owner only" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- debts
create policy "Debts owner only" on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- debt_payments
create policy "Debt payments owner only" on public.debt_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- attachments
create policy "Attachments owner only" on public.transaction_attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- splits
create policy "Transaction splits owner only" on public.transaction_splits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reminders
create policy "Reminder owner only" on public.reminder_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- push
create policy "Push subscriptions owner only" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notification logs (read only)
create policy "Notification logs owner read" on public.notification_logs
  for select using (auth.uid() = user_id);

-- monthly budgets
create policy "Monthly budgets owner only" on public.monthly_budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recurring
create policy "Recurring transactions owner only" on public.recurring_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- audit (read only)
create policy "Audit logs owner read" on public.audit_logs
  for select using (auth.uid() = user_id);

-- budget notification (read only)
create policy "Budget notification logs owner read" on public.budget_notification_logs
  for select using (auth.uid() = user_id);

-- storage receipts
create policy "Users upload own receipts" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own receipts" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 10. Catatan ──────────────────────────────────────────────
-- Tidak memakai trigger handle_new_user. Setup data awal user
-- (profile, categories, reminder prefs) dilakukan saat first login
-- lewat ensureUserSetup() di src/lib/auth.ts — lebih reliable.

-- ── 11. Billing (freemium) ───────────────────────────────────
-- Diisi oleh webhook Stripe lewat service role.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Subscriptions owner read" on public.subscriptions;
create policy "Subscriptions owner read" on public.subscriptions
  for select using (auth.uid() = user_id);

create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id);
