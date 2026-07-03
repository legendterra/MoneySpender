-- Freemium billing: status langganan per user, diisi oleh webhook Stripe.
-- Jalankan file ini di Supabase SQL Editor (aman dijalankan ulang).

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

-- User hanya boleh membaca status langganannya sendiri.
-- Insert/update dilakukan lewat service role (webhook Stripe), tanpa policy tambahan.
drop policy if exists "Subscriptions owner read" on public.subscriptions;
create policy "Subscriptions owner read" on public.subscriptions
  for select using (auth.uid() = user_id);

create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id);
