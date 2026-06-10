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
} from "@/lib/types";
import { calculateRate, toMonthInput } from "@/lib/utils";

function resolveMonthValue(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return toMonthInput();
  }

  return month;
}

function buildMonthDate(monthValue: string) {
  return new Date(`${monthValue}-01T00:00:00`);
}

function normalizeProfile(profile: ProfileData | null, fallbackName: string | null): ProfileData {
  return {
    full_name: profile?.full_name ?? fallbackName,
    currency_code: profile?.currency_code ?? DEFAULT_CURRENCY,
    monthly_savings_goal: Number(profile?.monthly_savings_goal ?? 4000000),
    yearly_savings_goal: Number(profile?.yearly_savings_goal ?? 48000000),
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

  return {
    id: String(record.id),
    amount,
    paid_amount: paidAmount,
    remaining_amount: Math.max(0, amount - paidAmount),
    debt_date: String(record.debt_date),
    source_name: String(record.source_name ?? ""),
    lender_name: String(record.lender_name ?? ""),
    reason: String(record.reason ?? ""),
    category_label: record.category_label ? String(record.category_label) : null,
    is_paid: Boolean(record.is_paid),
    paid_at: record.paid_at ? String(record.paid_at) : null,
  };
}

function summarizeTransactions(transactions: TransactionRecord[]): SummaryStats {
  const income = transactions
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expense = transactions
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const balance = income - expense;

  return {
    income,
    expense,
    balance,
    savingsRate: calculateRate(income, expense),
  };
}

function buildCategoryBreakdown(transactions: TransactionRecord[]) {
  const bucket = new Map<string, number>();

  transactions
    .filter((entry) => entry.type === "expense")
    .forEach((entry) => {
      const key = entry.category_label || "Lainnya";
      bucket.set(key, (bucket.get(key) ?? 0) + entry.amount);
    });

  return [...bucket.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6) as CategorySlice[];
}

function buildDashboardInsights(
  monthTransactions: TransactionRecord[],
  previousMonthTransactions: TransactionRecord[],
  budgetAlerts: BudgetAlert[],
  debtSummary: DebtSummary,
): DashboardInsight[] {
  const currentSummary = summarizeTransactions(monthTransactions);
  const previousSummary = summarizeTransactions(previousMonthTransactions);
  const insights: DashboardInsight[] = [];
  const topExpense = buildCategoryBreakdown(monthTransactions)[0];

  if (currentSummary.expense > previousSummary.expense && previousSummary.expense > 0) {
    const diff = Math.round(((currentSummary.expense - previousSummary.expense) / previousSummary.expense) * 100);
    insights.push({
      title: "Pengeluaran naik",
      body: `Bulan ini pengeluaran naik ${diff}% dibanding bulan lalu. Cek kategori terbesar sebelum kebablasan.`,
      tone: diff > 30 ? "warning" : "neutral",
    });
  }

  if (topExpense) {
    insights.push({
      title: "Kategori paling berat",
      body: `${topExpense.name} jadi pengeluaran terbesar bulan ini. Totalnya sudah ${topExpense.total.toLocaleString("id-ID")}.`,
      tone: "neutral",
    });
  }

  const overBudget = budgetAlerts.find((alert) => alert.status === "over");
  if (overBudget) {
    insights.push({
      title: "Budget lewat batas",
      body: `${overBudget.categoryName} sudah ${overBudget.ratio}% dari budget. Stop dulu kalau bukan kebutuhan penting.`,
      tone: "danger",
    });
  }

  if (debtSummary.totalOutstanding > 0) {
    insights.push({
      title: "Hutang masih aktif",
      body: `Masih ada ${debtSummary.unpaidCount} hutang belum lunas. Cicil sedikit-sedikit lebih baik daripada menunggu sempurna.`,
      tone: "warning",
    });
  }

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
  const seeds = Array.from({ length: MONTHS_TO_SHOW }, (_, index) => {
    const date = subMonths(startOfMonth(selectedMonthDate), MONTHS_TO_SHOW - index - 1);
    return {
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM yy", { locale: indonesiaLocale }),
      income: 0,
      expense: 0,
      balance: 0,
    };
  });

  const mapped = new Map(seeds.map((seed) => [seed.key, seed]));

  transactions.forEach((entry) => {
    const key = String(entry.transaction_date).slice(0, 7);
    const current = mapped.get(key);

    if (!current) {
      return;
    }

    if (entry.type === "income") {
      current.income += entry.amount;
    } else {
      current.expense += entry.amount;
    }

    current.balance = current.income - current.expense;
  });

  return [...mapped.values()].map((item) => ({
    label: item.label,
    income: item.income,
    expense: item.expense,
    balance: item.balance,
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

function summarizeDebts(
  debts: DebtRecord[],
  selectedMonthDate: Date,
): DebtSummary {
  const monthKey = format(selectedMonthDate, "yyyy-MM");
  const unpaidDebts = debts.filter((debt) => !debt.is_paid);

  return {
    totalOutstanding: unpaidDebts.reduce((sum, debt) => sum + debt.remaining_amount, 0),
    currentMonthOutstanding: unpaidDebts
      .filter((debt) => debt.debt_date.slice(0, 7) === monthKey)
      .reduce((sum, debt) => sum + debt.remaining_amount, 0),
    unpaidCount: unpaidDebts.length,
  };
}

function buildHistoryRecordFromTransaction(transaction: TransactionRecord): HistoryRecord {
  const label =
    transaction.type === "income" ? "Pemasukan" : "Pengeluaran";

  return {
    id: transaction.id,
    source: "transaction",
    type: transaction.type,
    amount: transaction.amount,
    date: transaction.transaction_date,
    title: transaction.category_label || label,
    subtitle: transaction.reason || "Tanpa catatan",
    detail: [transaction.merchant, transaction.payment_method, transaction.wallet_label].filter(Boolean).join(" | ") || null,
    statusLabel: label,
  };
}

function buildHistoryRecordFromDebt(debt: DebtRecord): HistoryRecord {
  return {
    id: debt.id,
    source: "debt",
    type: "debt",
    amount: debt.remaining_amount || debt.amount,
    date: debt.debt_date,
    title: `Hutang ke ${debt.lender_name}`,
    subtitle: debt.reason,
    detail: `Transaksi dari ${debt.source_name} | Dibayar ${debt.paid_amount}`,
    statusLabel: debt.is_paid ? "Lunas" : "Belum lunas",
  };
}

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getWeekdayLabel(value: string) {
  return WEEKDAY_OPTIONS.find((option) => option.value === value)?.label ?? "Semua Hari";
}

export async function getDashboardData(month?: string) {
  const monthValue = resolveMonthValue(month);
  const selectedMonthDate = buildMonthDate(monthValue);
  const monthStart = format(startOfMonth(selectedMonthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonthDate), "yyyy-MM-dd");
  const previousMonthDate = subMonths(selectedMonthDate, 1);
  const previousMonthStart = format(startOfMonth(previousMonthDate), "yyyy-MM-dd");
  const previousMonthEnd = format(endOfMonth(previousMonthDate), "yyyy-MM-dd");
  const yearStart = format(startOfYear(selectedMonthDate), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(selectedMonthDate), "yyyy-MM-dd");
  const historyStart = format(
    startOfMonth(subMonths(selectedMonthDate, MONTHS_TO_SHOW - 1)),
    "yyyy-MM-dd",
  );

  const { supabase, user } = await getAuthedContext();

  const [
    profileResult,
    periodTransactionsResult,
    yearTransactionsResult,
    allDebtsResult,
    previousMonthTransactionsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .gte("transaction_date", historyStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: true }),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .gte("transaction_date", yearStart)
      .lte("transaction_date", yearEnd)
      .order("transaction_date", { ascending: true }),
    supabase
      .from("debts")
      .select("id,amount,paid_amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false }),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .gte("transaction_date", previousMonthStart)
      .lte("transaction_date", previousMonthEnd),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const periodTransactions = (periodTransactionsResult.data ?? []).map(mapTransaction);
  const yearTransactions = (yearTransactionsResult.data ?? []).map(mapTransaction);
  const allDebts = (allDebtsResult.data ?? []).map(mapDebt);
  const previousMonthTransactions = (previousMonthTransactionsResult.data ?? []).map(mapTransaction);
  const monthTransactions = periodTransactions.filter(
    (transaction) => transaction.transaction_date >= monthStart && transaction.transaction_date <= monthEnd,
  );
  const summary = summarizeTransactions(monthTransactions);
  const debtSummary = summarizeDebts(allDebts, selectedMonthDate);
  const budgetAlerts: BudgetAlert[] = [];
  const unpaidMonthDebts = allDebts.filter(
    (debt) => !debt.is_paid && debt.debt_date >= monthStart && debt.debt_date <= monthEnd,
  );

  return {
    monthValue,
    selectedMonthLabel: format(selectedMonthDate, "MMMM yyyy", { locale: indonesiaLocale }),
    profile,
    summary,
    goalProgress: buildGoalProgress(profile, summary, yearTransactions),
    topIncome: monthTransactions
      .filter((transaction) => transaction.type === "income")
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 10),
    topExpense: monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 10),
    trendData: buildHistory(periodTransactions, selectedMonthDate),
    expenseBreakdown: buildCategoryBreakdown(monthTransactions),
    budgetAlerts,
    insights: buildDashboardInsights(monthTransactions, previousMonthTransactions, budgetAlerts, debtSummary),
    wallets: [],
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

  const [profileResult, categoriesResult, transactionsResult] = await Promise.all([
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
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .eq("type", type)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const transactions = (transactionsResult.data ?? []).map(mapTransaction);
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    monthValue,
    selectedMonthLabel: format(selectedMonthDate, "MMMM yyyy", { locale: indonesiaLocale }),
    profile,
    categories: (categoriesResult.data ?? []) as Category[],
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

  const [profileResult, categoriesResult, debtsResult, allDebtsResult, debtPaymentsResult] = await Promise.all([
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
      .select("id,amount,paid_amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
      .eq("user_id", user.id)
      .gte("debt_date", monthStart)
      .lte("debt_date", monthEnd)
      .order("debt_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("debts")
      .select("id,amount,paid_amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false }),
    supabase
      .from("debt_payments")
      .select("id,debt_id,amount,paid_date,note")
      .eq("user_id", user.id)
      .order("paid_date", { ascending: false }),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const payments = (debtPaymentsResult.data ?? []).map(mapDebtPayment);
  const paymentsByDebt = new Map<string, DebtPayment[]>();
  payments.forEach((payment) => {
    paymentsByDebt.set(payment.debt_id, [...(paymentsByDebt.get(payment.debt_id) ?? []), payment]);
  });
  const debts = (debtsResult.data ?? []).map(mapDebt).map((debt) => ({
    ...debt,
    payments: paymentsByDebt.get(debt.id) ?? [],
  }));
  const allDebts = (allDebtsResult.data ?? []).map(mapDebt);

  return {
    monthValue,
    selectedMonthLabel: format(selectedMonthDate, "MMMM yyyy", { locale: indonesiaLocale }),
    profile,
    categories: (categoriesResult.data ?? []) as Category[],
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
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("debts")
      .select("id,amount,paid_amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
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
      if (exactDate && entry.date !== exactDate) {
        return false;
      }

      if (year && entry.date.slice(0, 4) !== year) {
        return false;
      }

      if (weekday !== "all") {
        const day = parseLocalDate(entry.date).getDay().toString();
        if (day !== weekday) {
          return false;
        }
      }

      if (query) {
        const haystack = [
          entry.title,
          entry.subtitle,
          entry.detail,
          entry.statusLabel,
          entry.amount.toString(),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateDiff = parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return b.amount - a.amount;
    });

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleItems = history.slice(startIndex, startIndex + pageSize);

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
    items: visibleItems,
  };
}

export async function getSettingsData() {
  const { supabase, user } = await getAuthedContext();
  const monthValue = toMonthInput();

  const [profileResult, categoriesResult, reminderResult] = await Promise.all([
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
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );

  return {
    profile,
    categories: (categoriesResult.data ?? []) as Category[],
    reminder: normalizeReminder(reminderResult.data as ReminderPreferences | null),
    budgetMonth: monthValue,
    budgets: [] as MonthlyBudget[],
    recurringTransactions: [] as RecurringTransaction[],
    wallets: [] as Wallet[],
    auditLogs: [] as AuditLog[],
    user: {
      id: user.id,
      email: user.email ?? "",
    },
  };
}

export async function getNetWorthData() {
  const { supabase, user } = await getAuthedContext();

  const [profileResult, transactionsResult, debtsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id,amount,type,category_id,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id),
    supabase
      .from("debts")
      .select("id,amount,paid_amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
      .eq("user_id", user.id),
  ]);

  const profile = normalizeProfile(profileResult.data as ProfileData | null, user.user_metadata?.full_name ?? null);
  const transactions = (transactionsResult.data ?? []).map(mapTransaction);
  const debts = (debtsResult.data ?? []).map(mapDebt);
  const summary = summarizeTransactions(transactions);
  const totalAssets = summary.balance;
  const totalDebt = summarizeDebts(debts, new Date()).totalOutstanding;

  return {
    profile,
    wallets: [],
    transfers: [],
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
  };
}
