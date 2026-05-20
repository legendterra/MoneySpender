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

alter table public.debt_payments enable row level security;

drop policy if exists "Debt payments owner only" on public.debt_payments;
create policy "Debt payments owner only"
  on public.debt_payments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
