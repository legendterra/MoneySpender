-- Migration: tambah kolom direction dan contact_name ke tabel debts
-- Ini memungkinkan pencatatan hutang (payable) dan piutang (receivable) secara terpisah
-- yang keduanya mempengaruhi Net Worth dengan arah berbeda.

-- 1. Tambah kolom direction dengan default 'payable' (backward compatible)
alter table public.debts
  add column if not exists direction text not null default 'payable'
  check (direction in ('payable', 'receivable'));

-- 2. Tambah kolom contact_name (gabungan dari lender_name/borrower_name)
--    Isi dari lender_name yang sudah ada untuk data lama
alter table public.debts
  add column if not exists contact_name text;

-- 3. Backfill contact_name dari lender_name untuk data lama
update public.debts
  set contact_name = lender_name
  where contact_name is null and lender_name is not null and lender_name != '';

-- 4. Set default kosong jika masih null
update public.debts
  set contact_name = ''
  where contact_name is null;

-- 5. Jadikan not null setelah backfill
alter table public.debts
  alter column contact_name set not null;

-- 6. Index untuk query per direction
create index if not exists debts_user_direction_idx
  on public.debts (user_id, direction, is_paid, debt_date desc);

-- Catatan: kolom lender_name tetap ada untuk backward compatibility dengan
-- data lama dan kode yang mungkin masih referencing kolom tersebut.
-- Tidak perlu drop lender_name.
