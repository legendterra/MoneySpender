import type { AppLocale } from "@/i18n/locales";

export type TransactionType = "income" | "expense";

/** Payable = kamu hutang ke orang lain (liability, kurangi net worth).
 *  Receivable = orang lain hutang ke kamu (asset, tambah net worth). */
export type DebtDirection = "payable" | "receivable";

export type { AppLocale };

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
};

export type WalletKind = "cash" | "bank" | "ewallet" | "card" | "other";

export type Wallet = {
  id: string;
  name: string;
  kind: WalletKind;
  opening_balance: number;
  color: string | null;
  is_archived: boolean;
  /** Computed by computeWalletBalances (src/lib/balances.ts), PLAN.md section 4.2. */
  balance: number;
};

export type WalletTransfer = {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  transfer_date: string;
  note: string | null;
};

export type TransactionRecord = {
  id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  transaction_date: string;
  reason: string | null;
  merchant: string | null;
  category_label: string | null;
  wallet_id: string | null;
  wallet_label: string | null;
  attachment_url?: string | null;
};

export type DebtPayment = {
  id: string;
  debt_id: string;
  amount: number;
  paid_date: string;
  note: string | null;
  /** Wallet the payment left (payable) or entered (receivable); null = the debt's wallet. */
  wallet_id: string | null;
  wallet_label: string | null;
};

export type DebtRecord = {
  id: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  debt_date: string;
  /** Untuk payable: siapa yang kamu hutangi. Untuk receivable: siapa yang hutang ke kamu. */
  contact_name: string;
  /** Asal transaksi / keterangan sumber */
  source_name: string;
  reason: string;
  direction: DebtDirection;
  /** Dompet yang terpengaruh saat debt dicatat */
  wallet_id: string | null;
  wallet_label: string | null;
  category_label: string | null;
  is_paid: boolean;
  paid_at: string | null;
  payments?: DebtPayment[];
};

export type DebtSummary = {
  /** Total hutang yang belum lunas (payable) */
  totalPayable: number;
  /** Total piutang yang belum lunas (receivable) */
  totalReceivable: number;
  /** Net liability = payable - receivable */
  netLiability: number;
  /** Jumlah item belum lunas */
  unpaidCount: number;
  /** @deprecated gunakan totalPayable */
  totalOutstanding: number;
  /** @deprecated */
  currentMonthOutstanding: number;
};

export type HistoryRecordType = TransactionType | "debt";

export type HistoryRecord = {
  id: string;
  source: "transaction" | "debt";
  type: HistoryRecordType;
  amount: number;
  date: string;
  title: string;
  subtitle: string;
  detail: string | null;
  statusLabel: string;
};

export type SummaryStats = {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
};

export type MonthlyPoint = {
  label: string;
  income: number;
  expense: number;
  balance: number;
};

export type CategorySlice = {
  name: string;
  total: number;
};

export type BudgetAlert = {
  categoryId: string | null;
  categoryName: string;
  spent: number;
  budget: number;
  ratio: number;
  status: "safe" | "warning" | "over";
};

export type DashboardInsight = {
  title: string;
  body: string;
  tone: "neutral" | "good" | "warning" | "danger";
};

export type GoalProgress = {
  currentMonthSaved: number;
  currentMonthGoal: number;
  currentYearSaved: number;
  currentYearGoal: number;
};

export type ProfileData = {
  full_name: string | null;
  currency_code: string | null;
  monthly_savings_goal: number | null;
  yearly_savings_goal: number | null;
  /** profiles.locale (migration 2026-11-20); "id" until the migration runs. */
  locale: AppLocale;
  /** Reserve the remaining monthly savings goal from the daily allowance. */
  reserve_savings: boolean;
};

/** 0 = three times a day (active_start, midpoint, active_end). */
export type DigestInterval = 0 | 2 | 3 | 4;

export type ReminderPreferences = {
  /** @deprecated replaced by the hourly digest */
  reminder_morning_enabled: boolean;
  /** @deprecated replaced by the hourly digest */
  reminder_evening_enabled: boolean;
  push_enabled: boolean;
  digest_enabled: boolean;
  digest_every_hours: DigestInterval;
  active_start: number;
  active_end: number;
  hide_amounts: boolean;
  /** 80% / 100% budget alerts; stored in reminder_evening_enabled (see BUDGET_ALERTS_COLUMN). */
  budget_alerts_enabled: boolean;
};

export type MonthlyBudget = {
  id: string;
  category_id: string;
  month: string;
  amount: number;
};

export type RecurringTransaction = {
  id: string;
  type: TransactionType;
  category_id: string | null;
  category_label: string | null;
  wallet_id: string | null;
  wallet_label: string | null;
  amount: number;
  reason: string;
  merchant: string | null;
  day_of_month: number;
  last_generated_month: string | null;
  is_active: boolean;
};

export type TransactionTemplate = {
  id: string;
  label: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  category_label: string | null;
  wallet_id: string | null;
  wallet_label: string | null;
  sort_order: number;
};

export type AuditLog = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NetWorthData = {
  wallets: Wallet[];
  transfers: WalletTransfer[];
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
};
