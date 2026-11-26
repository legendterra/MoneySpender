import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveLocale } from "@/i18n/locales";
import { computeWalletBalances, type BalanceOptions, type WalletRow } from "@/lib/balances";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import {
  expectData,
  expectRows,
  isMissingSchemaError,
  selectAllRows,
} from "@/lib/supabase/query";
import type {
  DebtDirection,
  DebtPayment,
  DebtRecord,
  DigestInterval,
  ProfileData,
  RecurringTransaction,
  ReminderPreferences,
  TransactionRecord,
  TransactionTemplate,
  TransactionType,
  Wallet,
  WalletTransfer,
} from "@/lib/types";

// Column lists shared by every reader. scripts/check-schema.mjs mirrors them:
// update both when a column is added or removed.
export const TRANSACTION_COLUMNS =
  "id,amount,type,category_id,transaction_date,reason,merchant,category_label,wallet_id,wallet_label";
export const DEBT_COLUMNS =
  "id,amount,paid_amount,debt_date,source_name,contact_name,reason,category_label,is_paid,paid_at,direction,wallet_id,wallet_label";
export const DEBT_PAYMENT_COLUMNS = "id,debt_id,amount,paid_date,note,wallet_id,wallet_label";
export const WALLET_COLUMNS = "id,name,kind,opening_balance,color,is_archived";
export const TRANSFER_COLUMNS = "id,from_wallet_id,to_wallet_id,amount,transfer_date,note";
export const RECURRING_COLUMNS =
  "id,type,category_id,category_label,wallet_id,wallet_label,amount,reason,merchant,day_of_month,last_generated_month,is_active";
export const TEMPLATE_COLUMNS =
  "id,label,type,amount,category_id,category_label,wallet_id,wallet_label,sort_order";
export const PROFILE_COLUMNS_BASE = "full_name,currency_code,monthly_savings_goal,yearly_savings_goal";
/** Requires migration 2026-11-20 (locale, reserve_savings). */
export const PROFILE_COLUMNS = `${PROFILE_COLUMNS_BASE},locale,reserve_savings`;
export const REMINDER_COLUMNS_BASE = "reminder_morning_enabled,reminder_evening_enabled,push_enabled";
/**
 * Budget alerts on/off. There is no dedicated column: the deprecated
 * `reminder_evening_enabled` (the pre-digest 19.00 reminder, unused since the
 * hourly digest) stores it, so the switch works without a migration. Default true.
 */
export const BUDGET_ALERTS_COLUMN = "reminder_evening_enabled";
/** Requires migration 2026-11-20 (digest settings). */
export const REMINDER_COLUMNS = `${REMINDER_COLUMNS_BASE},digest_enabled,digest_every_hours,active_start,active_end,hide_amounts`;

type Row = Record<string, unknown>;

const text = (value: unknown) => (value === null || value === undefined ? null : String(value));

export function mapTransaction(record: Row): TransactionRecord {
  return {
    id: String(record.id),
    amount: Number(record.amount ?? 0),
    type: record.type as TransactionType,
    category_id: text(record.category_id),
    transaction_date: String(record.transaction_date),
    reason: text(record.reason),
    merchant: text(record.merchant),
    category_label: text(record.category_label),
    wallet_id: text(record.wallet_id),
    wallet_label: text(record.wallet_label),
  };
}

export function mapDebtPayment(record: Row): DebtPayment {
  return {
    id: String(record.id),
    debt_id: String(record.debt_id),
    amount: Number(record.amount ?? 0),
    paid_date: String(record.paid_date),
    note: text(record.note),
    wallet_id: text(record.wallet_id),
    wallet_label: text(record.wallet_label),
  };
}

export function mapDebt(record: Row): DebtRecord {
  const amount = Number(record.amount ?? 0);
  const paidAmount = Math.min(amount, Number(record.paid_amount ?? 0));
  return {
    id: String(record.id),
    amount,
    paid_amount: paidAmount,
    remaining_amount: Math.max(0, amount - paidAmount),
    debt_date: String(record.debt_date),
    contact_name: String(record.contact_name ?? ""),
    source_name: String(record.source_name ?? ""),
    reason: String(record.reason ?? ""),
    direction: (record.direction as DebtDirection | undefined) ?? "payable",
    wallet_id: text(record.wallet_id),
    wallet_label: text(record.wallet_label),
    category_label: text(record.category_label),
    is_paid: Boolean(record.is_paid),
    paid_at: text(record.paid_at),
  };
}

export function mapTransfer(record: Row): WalletTransfer {
  return {
    id: String(record.id),
    from_wallet_id: String(record.from_wallet_id),
    to_wallet_id: String(record.to_wallet_id),
    amount: Number(record.amount ?? 0),
    transfer_date: String(record.transfer_date),
    note: text(record.note),
  };
}

export function mapWalletRow(record: Row): WalletRow {
  return {
    id: String(record.id),
    name: String(record.name ?? ""),
    kind: String(record.kind ?? "other"),
    opening_balance: Number(record.opening_balance ?? 0),
    color: text(record.color),
    is_archived: Boolean(record.is_archived),
  };
}

export function mapRecurring(record: Row): RecurringTransaction {
  return {
    id: String(record.id),
    type: record.type as TransactionType,
    category_id: text(record.category_id),
    category_label: text(record.category_label),
    wallet_id: text(record.wallet_id),
    wallet_label: text(record.wallet_label),
    amount: Number(record.amount ?? 0),
    reason: String(record.reason ?? ""),
    merchant: text(record.merchant),
    day_of_month: Number(record.day_of_month ?? 1),
    last_generated_month: text(record.last_generated_month),
    is_active: Boolean(record.is_active),
  };
}

export function mapTemplate(record: Row): TransactionTemplate {
  return {
    id: String(record.id),
    label: String(record.label ?? ""),
    type: record.type as TransactionType,
    amount: Number(record.amount ?? 0),
    category_id: text(record.category_id),
    category_label: text(record.category_label),
    wallet_id: text(record.wallet_id),
    wallet_label: text(record.wallet_label),
    sort_order: Number(record.sort_order ?? 0),
  };
}

export function normalizeProfile(profile: Row | null, fallbackName: string | null): ProfileData {
  return {
    full_name: text(profile?.full_name) ?? fallbackName,
    currency_code: text(profile?.currency_code) ?? DEFAULT_CURRENCY,
    monthly_savings_goal: Number(profile?.monthly_savings_goal ?? 4_000_000),
    yearly_savings_goal: Number(profile?.yearly_savings_goal ?? 48_000_000),
    locale: resolveLocale(profile?.locale),
    reserve_savings: Boolean(profile?.reserve_savings),
  };
}

const DIGEST_INTERVALS: DigestInterval[] = [0, 2, 3, 4];

export function normalizeReminder(reminder: Row | null): ReminderPreferences {
  const interval = Number(reminder?.digest_every_hours ?? 3) as DigestInterval;
  const start = Number(reminder?.active_start ?? 9);
  const end = Number(reminder?.active_end ?? 21);
  const validWindow = Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end <= 23 && start < end;
  return {
    reminder_morning_enabled: (reminder?.reminder_morning_enabled as boolean | undefined) ?? true,
    reminder_evening_enabled: (reminder?.reminder_evening_enabled as boolean | undefined) ?? true,
    push_enabled: (reminder?.push_enabled as boolean | undefined) ?? false,
    digest_enabled: (reminder?.digest_enabled as boolean | undefined) ?? true,
    digest_every_hours: DIGEST_INTERVALS.includes(interval) ? interval : 3,
    active_start: validWindow ? start : 9,
    active_end: validWindow ? end : 21,
    hide_amounts: (reminder?.hide_amounts as boolean | undefined) ?? false,
    budget_alerts_enabled: (reminder?.[BUDGET_ALERTS_COLUMN] as boolean | undefined) ?? true,
  };
}

/**
 * Selects `columns` and, only when the 2026-11-20 migration has not been run
 * yet (missing column), retries with `baseColumns`.
 */
async function selectSingleWithFallback(
  table: string,
  columns: string,
  baseColumns: string,
  run: (columns: string) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
): Promise<Row | null> {
  const result = await run(columns);
  if (result.error && isMissingSchemaError(result.error)) {
    return expectData(table, (await run(baseColumns)) as { data: Row | null; error: null }) ?? null;
  }
  return expectData(table, result as { data: Row | null; error: { message: string; code?: string } | null });
}

export async function fetchProfile(
  client: SupabaseClient,
  userId: string,
  fallbackName: string | null = null,
): Promise<ProfileData> {
  const row = await selectSingleWithFallback("profiles", PROFILE_COLUMNS, PROFILE_COLUMNS_BASE, (columns) =>
    client.from("profiles").select(columns).eq("id", userId).maybeSingle(),
  );
  return normalizeProfile(row, fallbackName);
}

export async function fetchReminderPreferences(client: SupabaseClient, userId: string) {
  const row = await selectSingleWithFallback(
    "reminder_preferences",
    REMINDER_COLUMNS,
    REMINDER_COLUMNS_BASE,
    (columns) => client.from("reminder_preferences").select(columns).eq("user_id", userId).maybeSingle(),
  );
  return normalizeReminder(row);
}

/** Templates table arrives with migration 2026-11-20; until then there are none. */
export async function fetchTemplates(client: SupabaseClient, userId: string): Promise<TransactionTemplate[]> {
  const result = await client
    .from("transaction_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (result.error && isMissingSchemaError(result.error)) return [];
  return expectRows<Row>("transaction_templates", result as { data: Row[] | null; error: null }).map(mapTemplate);
}

export async function fetchRecurring(
  client: SupabaseClient,
  userId: string,
  options: { activeOnly?: boolean } = {},
): Promise<RecurringTransaction[]> {
  let query = client.from("recurring_transactions").select(RECURRING_COLUMNS).eq("user_id", userId);
  if (options.activeOnly) query = query.eq("is_active", true);
  const rows = expectRows<Row>("recurring_transactions", await query.order("day_of_month", { ascending: true }));
  return rows.map(mapRecurring);
}

export type FinanceSnapshot = {
  walletRows: WalletRow[];
  /** Every transaction of the user, oldest first. */
  transactions: TransactionRecord[];
  transfers: WalletTransfer[];
  debts: DebtRecord[];
  payments: DebtPayment[];
};

/** Everything computeWalletBalances needs, paged so >1000 rows stay correct. */
export async function fetchFinanceSnapshot(
  client: SupabaseClient,
  userId: string,
  options: { includeArchivedWallets?: boolean } = {},
): Promise<FinanceSnapshot> {
  const [walletRows, transactions, transfers, debts, payments] = await Promise.all([
    (async () => {
      let query = client.from("wallets").select(WALLET_COLUMNS).eq("user_id", userId);
      if (!options.includeArchivedWallets) query = query.eq("is_archived", false);
      return expectRows<Row>("wallets", await query.order("created_at", { ascending: true })).map(mapWalletRow);
    })(),
    selectAllRows<Row>("transactions", () =>
      client
        .from("transactions")
        .select(TRANSACTION_COLUMNS)
        .eq("user_id", userId)
        .order("transaction_date", { ascending: true })
        .order("id", { ascending: true }),
    ),
    selectAllRows<Row>("wallet_transfers", () =>
      client.from("wallet_transfers").select(TRANSFER_COLUMNS).eq("user_id", userId).order("id", { ascending: true }),
    ),
    selectAllRows<Row>("debts", () =>
      client.from("debts").select(DEBT_COLUMNS).eq("user_id", userId).order("id", { ascending: true }),
    ),
    selectAllRows<Row>("debt_payments", () =>
      client
        .from("debt_payments")
        .select(DEBT_PAYMENT_COLUMNS)
        .eq("user_id", userId)
        .order("id", { ascending: true }),
    ),
  ]);

  return {
    walletRows,
    transactions: transactions.map(mapTransaction),
    transfers: transfers.map(mapTransfer),
    debts: debts.map(mapDebt),
    payments: payments.map(mapDebtPayment),
  };
}

export function balancesFromSnapshot(snapshot: FinanceSnapshot, options: BalanceOptions = {}): Wallet[] {
  return computeWalletBalances(
    snapshot.walletRows,
    {
      transactions: snapshot.transactions,
      transfers: snapshot.transfers,
      debts: snapshot.debts,
      payments: snapshot.payments,
    },
    options,
  );
}
