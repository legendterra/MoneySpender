import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

import {
  DEFAULT_CURRENCY,
  MONTHS_TO_SHOW,
  WEEKDAY_OPTIONS,
} from "@/lib/constants";
import { getAuthedContext } from "@/lib/auth";
import type {
  Category,
  AuditLog,
  BudgetAlert,
  CategorySlice,
  DashboardInsight,
  DebtDirection,
  DebtPayment,
  DebtRecord,
  DebtSummary,
  FinanceTransactionType,
  GoalProgress,
  HistoryRecord,
  MonthlyPoint,
  MonthlyBudget,
  ProfileData,
  RecurringTransaction,
  ReminderPreferences,
  SummaryStats,
  TransactionRecord,
  Wallet,
  WalletTransfer,
} from "@/lib/types";
import { calculateRate, toMonthInput } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveMonthValue(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return toMonthInput();
  return month;
}

function buildMonthDate(monthValue: string) {
  return new Date(`${monthValue}-01T00:00:00`);
}

function normalizeProfile(
  profile: ProfileData | null,
  fallbackName: string | null,
): ProfileData {
  return {
    full_name: profile?.full_name ?? fallbackName,
    currency_code: profile?.currency_code ?? DEFAULT_CURRENCY,
    monthly_savings_goal: Number(profile?.monthly_savings_goal ?? 4_000_000),
    yearly_savings_goal: Number(profile?.yearly_savings_goal ?? 48_000_000),
  };
}

function normalizeReminder(reminder: ReminderPreferences | null): ReminderPreferences {
  return {
    reminder_morning_enabled: reminder?.reminder_morning_enabled ?? true,
    reminder_evening_enabled: reminder?.reminder_evening_enabled ?? true,
    push_enabled: reminder?.push_enabled ?? false,
  };
}

function mapTransaction(record: Record<string, unknown>): TransactionRecord {
  return {
    id: String(record.id),
    amount: Number(record.amount ?? 0),
    type: record.type as FinanceTransactionType,
    category_id: record.category_id ? String(record.category_id) : null,
    transaction_date: String(record.transaction_date),
    reason: record.reason ? String(record.reason) : null,
    merchant: record.merchant ? String(record.merchant) : null,
    payment_method: record.payment_method ? String(record.payment_method) : null,
    category_label: record.category_label ? String(record.category_label) : null,
    wallet_id: record.wallet_id ? String(record.wallet_id) : null,
    wallet_label: record.wallet_label ? String(record.wallet_label) : null,
  };
}

function mapDebtPayment(record: Record<string, unknown>): DebtPayment {
  return {
    id: String(record.id),
    debt_id: String(record.debt_id),
    amount: Number(record.amount ?? 0),
    paid_date: String(record.paid_date),
    note: record.note ? String(record.note) : null,
  };
}

function mapDebt(record: Record<string, unknown>): DebtRecord {
  const amount = Number(record.amount ?? 0);
  const paidAmount = Math.min(amount, Number(record.paid_amount ?? 0));
  const direction = (record.direction as DebtDirection | undefined) ?? "payable";
  const contactName =
    record.contact_name
      ? String(record.contact_name)
      : record.lender_name
        ? String(record.lender_name)
        : "";

  return {
    id: String(record.id),
    amount,
    paid_amount: paidAmount,
    remaining_amount: Math.max(0, amount - paidAmount),
    debt_date: String(record.debt_date),
    contact_name: contactName,
    source_name: String(record.source_name ?? ""),
    reason: String(record.reason ?? ""),
    direction,
    wallet_id: record.wallet_id ? String(record.wallet_id) : null,
    wallet_label: record.wallet_label ? String(record.wallet_label) : null,
    category_label: record.category_label ? String(record.category_label) : null,
    is_paid: Boolean(record.is_paid),
    paid_at: record.paid_at ? String(record.paid_at) : null,
  };
}

// ── Wallet balance computation ────────────────────────────────────────────────
// balance = opening_balance + income_in - expense_out + transfers_in - transfers_out

function computeWalletBalances(
  rawWallets: Array<{
    id: string;
    name: string;
    kind: string;
    opening_balance: number;
    color: string | null;
    is_archived: boolean;
  }>,
  transactions: TransactionRecord[],
  transfers: WalletTransfer[],
): Wallet[] {
  return rawWallets.map((w) => {
    const incomeIn = transactions
      .filter((t) => t.wallet_id === w.id && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenseOut = transactions
      .filter((t) => t.wallet_id === w.id && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const transfersIn = transfers
      .filter((t) => t.to_wallet_id === w.id)
      .reduce((s, t) => s + t.amount, 0);
    const transfersOut = transfers
      .filter((t) => t.from_wallet_id === w.id)
      .reduce((s, t) => s + t.amount, 0);

    return {
      id: w.id,
      name: w.name,
      kind: w.kind as Wallet["kind"],
      opening_balance: w.opening_balance,
      color: w.color,
      is_archived: w.is_archived,
      balance: w.opening_balance + incomeIn - expenseOut + transfersIn - transfersOut,
    };
  });
}

// ── Summary helpers ───────────────────────────────────────────────────────────

function summarizeTransactions(transactions: TransactionRecord[]): SummaryStats {
  const income = transactions
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const expense = transactions
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);
  return { income, expense, balance: income - expense, savingsRate: calculateRate(income, expense) };
}

function buildCategoryBreakdown(transactions: TransactionRecord[]): CategorySlice[] {
  const bucket = new Map<string, number>();
  transactions
    .filter((e) => e.type === "expense")
    .forEach((e) => {
      const key = e.category_label || "Lainnya";
      bucket.set(key, (bucket.get(key) ?? 0) + e.amount);
    });
  return [...bucket.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
}

function summarizeDebts(debts: DebtRecord[], selectedMonthDate: Date): DebtSummary {
  const monthKey = format(selectedMonthDate, "yyyy-MM");
  const unpaid = debts.filter((d) => !d.is_paid);
  const totalPayable = unpaid
    .filter((d) => d.direction === "payable")
    .reduce((s, d) => s + d.remaining_amount, 0);
  const totalReceivable = unpaid
    .filter((d) => d.direction === "receivable")
    .reduce((s, d) => s + d.remaining_amount, 0);
  const currentMonthOutstanding = unpaid
    .filter((d) => d.direction === "payable" && d.debt_date.slice(0, 7) === monthKey)
    .reduce((s, d) => s + d.remaining_amount, 0);

  return {
    totalPayable,
    totalReceivable,
    netLiability: totalPayable - totalReceivable,
    unpaidCount: unpaid.length,
    // backward compat
    totalOutstanding: totalPayable,
    currentMonthOutstanding,
  };
}

function computeBudgetAlerts(
  transactions: TransactionRecord[],
  budgets: MonthlyBudget[],
  categories: Category[],
): BudgetAlert[] {
  if (!budgets.length) return [];
  const spentMap = new Map<string, number>();
  transactions
    .filter((t) => t.type === "expense" && t.category_id)
    .forEach((t) => {
      spentMap.set(t.category_id!, (spentMap.get(t.category_id!) ?? 0) + t.amount);
    });

  return budgets
    .filter((b) => b.amount > 0)
    .map((b) => {
      const cat = categories.find((c) => c.id === b.category_id);
      const spent = spentMap.get(b.category_id) ?? 0;
      const ratio = Math.round((spent / b.amount) * 100);
      return {
        categoryId: b.category_id,
        categoryName: cat?.name ?? "Kategori",
        spent,
        budget: b.amount,
        ratio,
        status: ratio >= 100 ? "over" : ratio >= 80 ? "warning" : "safe",
      } satisfies BudgetAlert;
    })
    .sort((a, b) => b.ratio - a.ratio);
}

function buildDashboardInsights(
  monthTransactions: TransactionRecord[],
  previousMonthTransactions: TransactionRecord[],
  budgetAlerts: BudgetAlert[],
  debtSummary: DebtSummary,
  wallets: Wallet[],
): DashboardInsight[] {
  const cur = summarizeTransactions(monthTransactions);
  const prev = summarizeTransactions(previousMonthTransactions);
  const insights: DashboardInsight[] = [];
  const topExpense = buildCategoryBreakdown(monthTransactions)[0];

  // Cashflow comparison
  if (cur.expense > prev.expense && prev.expense > 0) {
    const diff = Math.round(((cur.expense - prev.expense) / prev.expense) * 100);
    insights.push({
      title: "Pengeluaran naik",
      body: `Bulan ini pengeluaran naik ${diff}% dibanding bulan lalu. Cek kategori terbesar sebelum kebablasan.`,
      tone: diff > 30 ? "warning" : "neutral",
    });
  }

  if (topExpense) {
    insights.push({
      title: "Kategori paling berat",
      body: `${topExpense.name} jadi pengeluaran terbesar bulan ini.`,
      tone: "neutral",
    });
  }

  // Budget alerts
  const overBudget = budgetAlerts.find((a) => a.status === "over");
  if (overBudget) {
    insights.push({
      title: "Budget terlampaui",
      body: `${overBudget.categoryName} sudah ${overBudget.ratio}% dari budget. Pertimbangkan untuk menahan pengeluaran di sini.`,
      tone: "danger",
    });
  }

  // Debt warning
  if (debtSummary.totalPayable > 0) {
    insights.push({
      title: "Hutang aktif",
      body: `Ada ${debtSummary.unpaidCount} hutang belum lunas. Cicil sedikit-sedikit lebih baik daripada menunggu sempurna.`,
      tone: "warning",
    });
  }

  // Wallet health
  const lowWallet = wallets.find((w) => !w.is_archived && w.balance < 50_000);
  if (lowWallet) {
    insights.push({
      title: "Saldo tipis",
      body: `Dompet "${lowWallet.name}" saldo kurang dari Rp50.000. Pastikan ada cadangan cukup untuk kebutuhan mendatang.`,
      tone: "warning",
    });
  }

  // All good
  if (!insights.length) {
    insights.push({
      title: "Bulan ini rapi",
      body: "Belum ada sinyal bahaya besar. Lanjutkan kebiasaan catat uangnya.",
      tone: "good",
    });
  }

  return insights.slice(0, 4);
}

function buildHistory(transactions: TransactionRecord[], selectedMonthDate: Date): MonthlyPoint[] {
  const seeds = Array.from({ length: MONTHS_TO_SHOW }, (_, i) => {
    const date = subMonths(startOfMonth(selectedMonthDate), MONTHS_TO_SHOW - i - 1);
    return {
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM yy", { locale: indonesiaLocale }),
      income: 0,
      expense: 0,
      balance: 0,
    };
  });
  const mapped = new Map(seeds.map((s) => [s.key, s]));
  transactions.forEach((e) => {
    const key = String(e.transaction_date).slice(0, 7);
    const cur = mapped.get(key);
    if (!cur) return;
    if (e.type === "income") cur.income += e.amount;
    else cur.expense += e.amount;
    cur.balance = cur.income - cur.expense;
  });
  return [...mapped.values()].map(({ label, income, expense, balance }) => ({
    label,
    income,
    expense,
    balance,
  }));
}

function buildGoalProgress(
  profile: ProfileData,
  monthSummary: SummaryStats,
  yearTransactions: TransactionRecord[],
): GoalProgress {
  const yearSummary = summarizeTransactions(yearTransactions);
  return {
    currentMonthSaved: monthSummary.balance,
    currentMonthGoal: Number(profile.monthly_savings_goal ?? 0),
    currentYearSaved: yearSummary.balance,
    currentYearGoal: Number(profile.yearly_savings_goal ?? 0),
  };
}

function buildHistoryRecordFromTransaction(t: TransactionRecord): HistoryRecord {
  const label = t.type === "income" ? "Pemasukan" : "Pengeluaran";
  return {
    id: t.id,
    source: "transaction",
    type: t.type,
    amount: t.amount,
    date: t.transaction_date,
    title: t.category_label || label,
    subtitle: t.reason || "Tanpa catatan",
    detail: [t.merchant, t.payment_method, t.wallet_label].filter(Boolean).join(" · ") || null,
    statusLabel: label,
  };
}

function buildHistoryRecordFromDebt(d: DebtRecord): HistoryRecord {
  const dirLabel = d.direction === "receivable" ? "Piutang" : "Hutang";
  return {
    id: d.id,
    source: "debt",
    type: "debt",
    amount: d.remaining_amount || d.amount,
    date: d.debt_date,
    title: `${dirLabel}: ${d.contact_name}`,
    subtitle: d.reason,
    detail: d.source_name || null,
    statusLabel: d.is_paid ? "Lunas" : "Belum lunas",
  };
}

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getWeekdayLabel(value: string) {
  return WEEKDAY_OPTIONS.find((o) => o.value === value)?.label ?? "Semua Hari";
}

// ── Public data fetchers ──────────────────────────────────────────────────────

export async function getDashboardData(month?: string) {
  const monthValue = resolveMonthValue(month);
  const selectedMonthDate = buildMonthDate(monthValue);
  const monthStart = format(startOfMonth(selectedMonthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonthDate), "yyyy-MM-dd");
  const prevDate = subMonths(selectedMonthDate, 1);
  const prevStart = format(startOfMonth(prevDate), "yyyy-MM-dd");
  const prevEnd = format(endOfMonth(prevDate), "yyyy-MM-dd");
  const yearStart = format(startOfYear(selectedMonthDate), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(selectedMonthDate), "yyyy-MM-dd");
  const historyStart = format(
    startOfMonth(subMonths(selectedMonthDate, MONTHS_TO_SHOW - 1)),
    "yyyy-MM-dd",
  );

  const { supabase, user } = await getAuthedContext();

  const [
    profileResult,
    periodTxResult,
    yearTxResult,
    allDebtsResult,
    prevTxResult,
    walletsResult,
    transfersResult,
    categoriesResult,
    budgetsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label,wallet_id,wallet_label")
      .eq("user_id", user.id)
      .gte("transaction_date", historyStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: true }),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label,wallet_id,wallet_label")
      .eq("user_id", user.id)
      .gte("transaction_date", yearStart)
      .lte("transaction_date", yearEnd)
      .order("transaction_date", { ascending: true }),
    supabase
      .from("debts")
      .select("id,amount,paid_amount,debt_date,source_name,contact_name,lender_name,reason,category_label,is_paid,paid_at,direction")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false }),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label,wallet_id,wallet_label")
      .eq("user_id", user.id)
      .gte("transaction_date", prevStart)
      .lte("transaction_date", prevEnd),
    supabase
      .from("wallets")
      .select("id,name,kind,opening_balance,color,is_archived")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("wallet_transfers")
      .select("id,from_wallet_id,to_wallet_id,amount,transfer_date,note")
      .eq("user_id", user.id),
    supabase
      .from("categories")
      .select("id,name,type,color")
      .eq("user_id", user.id)
      .eq("type", "expense"),
    supabase
      .from("monthly_budgets")
      .select("id,category_id,month,amount")
      .eq("user_id", user.id)
      .eq("month", monthValue),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const allPeriodTx = (periodTxResult.data ?? []).map(mapTransaction);
  const yearTx = (yearTxResult.data ?? []).map(mapTransaction);
  const allDebts = (allDebtsResult.data ?? []).map(mapDebt);
  const prevTx = (prevTxResult.data ?? []).map(mapTransaction);
  const rawWallets = (walletsResult.data ?? []) as Array<{
    id: string; name: string; kind: string; opening_balance: number;
    color: string | null; is_archived: boolean;
  }>;
  // All transactions (not just current period) needed for wallet balance
  const allTxForWallets = allPeriodTx; // We already have period; for real-time balances use all-time
  const allTransfersRaw = (transfersResult.data ?? []) as Array<{
    id: string; from_wallet_id: string; to_wallet_id: string;
    amount: number; transfer_date: string; note: string | null;
  }>;
  const allTransfers: WalletTransfer[] = allTransfersRaw.map((t) => ({
    id: t.id,
    from_wallet_id: t.from_wallet_id,
    to_wallet_id: t.to_wallet_id,
    amount: t.amount,
    transfer_date: t.transfer_date,
    note: t.note,
  }));

  // For wallet balance we need ALL transactions, but we only fetched period+year
  // Fetch all-time transactions separately for wallet balance calculation
  const allTimeTxResult = await supabase
    .from("transactions")
    .select("id,amount,type,wallet_id,transaction_date")
    .eq("user_id", user.id);
  const allTimeTx = ((allTimeTxResult.data ?? []) as unknown as TransactionRecord[]);

  const wallets = computeWalletBalances(rawWallets, allTimeTx, allTransfers);

  const monthTx = allPeriodTx.filter(
    (t) => t.transaction_date >= monthStart && t.transaction_date <= monthEnd,
  );
  const summary = summarizeTransactions(monthTx);
  const debtSummary = summarizeDebts(allDebts, selectedMonthDate);
  const categories = (categoriesResult.data ?? []) as Category[];
  const budgets = (budgetsResult.data ?? []) as MonthlyBudget[];
  const budgetAlerts = computeBudgetAlerts(monthTx, budgets, categories);
  const unpaidMonthDebts = allDebts.filter(
    (d) => !d.is_paid && d.direction === "payable" && d.debt_date >= monthStart && d.debt_date <= monthEnd,
  );

  return {
    monthValue,
    selectedMonthLabel: format(selectedMonthDate, "MMMM yyyy", { locale: indonesiaLocale }),
    profile,
    summary,
    goalProgress: buildGoalProgress(profile, summary, yearTx),
    topIncome: monthTx
      .filter((t) => t.type === "income")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    topExpense: monthTx
      .filter((t) => t.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    trendData: buildHistory(allPeriodTx, selectedMonthDate),
    expenseBreakdown: buildCategoryBreakdown(monthTx),
    budgetAlerts,
    insights: buildDashboardInsights(monthTx, prevTx, budgetAlerts, debtSummary, wallets),
    wallets,
    debtSummary,
    recentDebts: unpaidMonthDebts.slice(0, 5),
  };
}

export async function getTransactionsPageData(type: FinanceTransactionType, month?: string) {
  const monthValue = resolveMonthValue(month);
  const selectedMonthDate = buildMonthDate(monthValue);
  const monthStart = format(startOfMonth(selectedMonthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonthDate), "yyyy-MM-dd");
  const { supabase, user } = await getAuthedContext();

  const [profileResult, categoriesResult, transactionsResult, walletsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id,name,type,color")
      .eq("user_id", user.id)
      .eq("type", type)
      .order("name"),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label,wallet_id,wallet_label")
      .eq("user_id", user.id)
      .eq("type", type)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("wallets")
      .select("id,name,kind,opening_balance,color,is_archived")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name"),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const transactions = (transactionsResult.data ?? []).map(mapTransaction);
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const rawWallets = (walletsResult.data ?? []) as Array<{
    id: string; name: string; kind: string; opening_balance: number;
    color: string | null; is_archived: boolean;
  }>;
  const wallets: Wallet[] = rawWallets.map((w) => ({
    ...w,
    kind: w.kind as Wallet["kind"],
    balance: w.opening_balance, // simplified for form
  }));

  return {
    monthValue,
    selectedMonthLabel: format(selectedMonthDate, "MMMM yyyy", { locale: indonesiaLocale }),
    profile,
    categories: (categoriesResult.data ?? []) as Category[],
    wallets,
    transactions,
    total,
    type,
  };
}

export async function getDebtsPageData(month?: string) {
  const monthValue = resolveMonthValue(month);
  const selectedMonthDate = buildMonthDate(monthValue);
  const monthStart = format(startOfMonth(selectedMonthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonthDate), "yyyy-MM-dd");
  const { supabase, user } = await getAuthedContext();

  const [profileResult, categoriesResult, debtsResult, allDebtsResult, debtPaymentsResult, walletsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("categories")
        .select("id,name,type,color")
        .eq("user_id", user.id)
        .eq("type", "debt")
        .order("name"),
      supabase
        .from("debts")
        .select("id,amount,paid_amount,debt_date,source_name,contact_name,lender_name,reason,category_label,is_paid,paid_at,direction,wallet_id,wallet_label")
        .eq("user_id", user.id)
        .gte("debt_date", monthStart)
        .lte("debt_date", monthEnd)
        .order("debt_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("debts")
        .select("id,amount,paid_amount,debt_date,source_name,contact_name,lender_name,reason,category_label,is_paid,paid_at,direction,wallet_id,wallet_label")
        .eq("user_id", user.id)
        .order("debt_date", { ascending: false }),
      supabase
        .from("debt_payments")
        .select("id,debt_id,amount,paid_date,note")
        .eq("user_id", user.id)
        .order("paid_date", { ascending: false }),
      supabase
        .from("wallets")
        .select("id,name,kind,opening_balance,color,is_archived")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("name"),
    ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const payments = (debtPaymentsResult.data ?? []).map(mapDebtPayment);
  const paymentsByDebt = new Map<string, DebtPayment[]>();
  payments.forEach((p) => {
    paymentsByDebt.set(p.debt_id, [...(paymentsByDebt.get(p.debt_id) ?? []), p]);
  });
  const debts = (debtsResult.data ?? []).map(mapDebt).map((d) => ({
    ...d,
    payments: paymentsByDebt.get(d.id) ?? [],
  }));
  const allDebts = (allDebtsResult.data ?? []).map(mapDebt);
  const rawWalletsDebt = (walletsResult.data ?? []) as Array<{
    id: string; name: string; kind: string; opening_balance: number;
    color: string | null; is_archived: boolean;
  }>;
  const wallets: Wallet[] = rawWalletsDebt.map((w) => ({
    ...w,
    kind: w.kind as Wallet["kind"],
    balance: w.opening_balance,
  }));

  return {
    monthValue,
    selectedMonthLabel: format(selectedMonthDate, "MMMM yyyy", { locale: indonesiaLocale }),
    profile,
    categories: (categoriesResult.data ?? []) as Category[],
    wallets,
    debts,
    summary: summarizeDebts(allDebts, selectedMonthDate),
  };
}

export async function getAllTransactionsData(filters?: {
  date?: string;
  weekday?: string;
  year?: string;
  page?: string;
  q?: string;
}) {
  const { supabase, user } = await getAuthedContext();
  const exactDate = filters?.date ?? "";
  const weekday = filters?.weekday ?? "all";
  const year = filters?.year ?? "";
  const query = (filters?.q ?? "").trim().toLowerCase();
  const currentPage = Math.max(1, Number(filters?.page ?? "1") || 1);

  const [profileResult, transactionsResult, debtsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label,wallet_id,wallet_label")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("debts")
      .select("id,amount,paid_amount,debt_date,source_name,contact_name,lender_name,reason,category_label,is_paid,paid_at,direction")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );

  const history = [
    ...(transactionsResult.data ?? []).map(mapTransaction).map(buildHistoryRecordFromTransaction),
    ...(debtsResult.data ?? []).map(mapDebt).map(buildHistoryRecordFromDebt),
  ]
    .filter((entry) => {
      if (exactDate && entry.date !== exactDate) return false;
      if (year && entry.date.slice(0, 4) !== year) return false;
      if (weekday !== "all") {
        const day = parseLocalDate(entry.date).getDay().toString();
        if (day !== weekday) return false;
      }
      if (query) {
        const haystack = [entry.title, entry.subtitle, entry.detail, entry.statusLabel, String(entry.amount)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const diff = parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime();
      return diff !== 0 ? diff : b.amount - a.amount;
    });

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    profile,
    filters: {
      date: exactDate,
      weekday,
      weekdayLabel: getWeekdayLabel(weekday),
      year,
      q: query,
      page: safePage,
    },
    totalItems: history.length,
    totalPages,
    pageSize,
    items: history.slice(startIndex, startIndex + pageSize),
  };
}

export async function getSettingsData() {
  const { supabase, user } = await getAuthedContext();
  const monthValue = toMonthInput();

  const [profileResult, categoriesResult, reminderResult, budgetsResult, walletsResult, transfersResult, auditResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("categories").select("id,name,type,color").eq("user_id", user.id).order("name"),
      supabase
        .from("reminder_preferences")
        .select("reminder_morning_enabled,reminder_evening_enabled,push_enabled")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("monthly_budgets")
        .select("id,category_id,month,amount")
        .eq("user_id", user.id)
        .eq("month", monthValue),
      supabase
        .from("wallets")
        .select("id,name,kind,opening_balance,color,is_archived")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("wallet_transfers")
        .select("id,from_wallet_id,to_wallet_id,amount,transfer_date,note")
        .eq("user_id", user.id),
      supabase
        .from("audit_logs")
        .select("id,action,metadata,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const rawWallets = (walletsResult.data ?? []) as Array<{
    id: string; name: string; kind: string; opening_balance: number;
    color: string | null; is_archived: boolean;
  }>;
  const allTxResult = await supabase
    .from("transactions")
    .select("id,amount,type,wallet_id,transaction_date")
    .eq("user_id", user.id);
  const allTimeTx = (allTxResult.data ?? []) as unknown as TransactionRecord[];
  const allTransfers: WalletTransfer[] = ((transfersResult.data ?? []) as Array<{
    id: string; from_wallet_id: string; to_wallet_id: string;
    amount: number; transfer_date: string; note: string | null;
  }>).map((t) => ({ ...t }));
  const wallets = computeWalletBalances(rawWallets, allTimeTx, allTransfers);

  return {
    profile,
    categories: (categoriesResult.data ?? []) as Category[],
    reminder: normalizeReminder(reminderResult.data as ReminderPreferences | null),
    budgetMonth: monthValue,
    budgets: (budgetsResult.data ?? []) as MonthlyBudget[],
    recurringTransactions: [] as RecurringTransaction[],
    wallets,
    auditLogs: (auditResult.data ?? []) as AuditLog[],
    user: { id: user.id, email: user.email ?? "" },
  };
}

export async function getNetWorthData() {
  const { supabase, user } = await getAuthedContext();

  const [profileResult, debtsResult, walletsResult, transfersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("debts")
      .select("id,amount,paid_amount,debt_date,source_name,contact_name,lender_name,reason,category_label,is_paid,paid_at,direction")
      .eq("user_id", user.id),
    supabase
      .from("wallets")
      .select("id,name,kind,opening_balance,color,is_archived")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("wallet_transfers")
      .select("id,from_wallet_id,to_wallet_id,amount,transfer_date,note")
      .eq("user_id", user.id),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const debts = (debtsResult.data ?? []).map(mapDebt);
  const rawWallets = (walletsResult.data ?? []) as Array<{
    id: string; name: string; kind: string; opening_balance: number;
    color: string | null; is_archived: boolean;
  }>;
  const allTxResult = await supabase
    .from("transactions")
    .select("id,amount,type,wallet_id,transaction_date")
    .eq("user_id", user.id);
  const allTimeTx = (allTxResult.data ?? []) as unknown as TransactionRecord[];
  const allTransfers: WalletTransfer[] = ((transfersResult.data ?? []) as Array<{
    id: string; from_wallet_id: string; to_wallet_id: string;
    amount: number; transfer_date: string; note: string | null;
  }>).map((t) => ({ ...t }));

  const wallets = computeWalletBalances(rawWallets, allTimeTx, allTransfers);
  const debtSummary = summarizeDebts(debts, new Date());

  // Net worth berbasis aset nyata:
  // ASSETS = total saldo dompet + piutang
  // LIABILITIES = hutang (payable)
  const totalWalletBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const totalAssets = totalWalletBalance + debtSummary.totalReceivable;
  const totalDebt = debtSummary.totalPayable;

  return {
    profile,
    wallets,
    transfers: allTransfers,
    debtSummary,
    totalWalletBalance,
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
  };
}

export async function checkUserHasWallet(): Promise<boolean> {
  const { supabase, user } = await getAuthedContext();
  const { data } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return !!data;
}
