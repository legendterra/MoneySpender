-- ============================================================
-- !!! DANGER — DESTROYS ALL MONEYSPENDER DATA. THERE IS NO UNDO. !!!
--
-- Drops every MoneySpender table, enum type, function and trigger in the
-- public schema: every user's transactions, wallets, debts, budgets and
-- settings are gone afterwards. Supabase Auth users and storage files are
-- not touched.
--
-- Only for wiping a development/test project before running schema.sql.
-- NEVER run this on production. Existing databases get the files in
-- supabase/migrations/ instead.
-- ============================================================

-- DROP semua (urutan child → parent)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at() cascade;

drop table if exists public.notification_digest_logs  cascade;
drop table if exists public.transaction_templates     cascade;
drop table if exists public.subscriptions             cascade;
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
