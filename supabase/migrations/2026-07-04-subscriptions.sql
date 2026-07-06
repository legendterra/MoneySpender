-- Freemium billing: status langganan per user, diisi oleh webhook
-- Lemon Squeezy lewat service role.
-- Jalankan file ini di Supabase SQL Editor (aman dijalankan ulang).
-- Kalau kamu pernah menjalankan versi lama file ini (kolom stripe_*),
-- jalankan dulu: drop table if exists public.subscriptions;

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'inactive',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- User hanya boleh membaca status langganannya sendiri.
-- Insert/update dilakukan lewat service role (webhook), tanpa policy tambahan.
drop policy if exists "Subscriptions owner read" on public.subscriptions;
create policy "Subscriptions owner read" on public.subscriptions
  for select using (auth.uid() = user_id);

create index if not exists subscriptions_provider_customer_idx
  on public.subscriptions (provider_customer_id);
