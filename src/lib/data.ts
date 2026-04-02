import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { redirect } from "next/navigation";

import {
  DEFAULT_CURRENCY,
  DEFAULT_DEBT_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  MONTHS_TO_SHOW,
  WEEKDAY_OPTIONS,
} from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Category,
  CategorySlice,
  DebtRecord,
  DebtSummary,
  FinanceTransactionType,
  GoalProgress,
  HistoryRecord,
  MonthlyPoint,
  ProfileData,
  ReminderPreferences,
  SummaryStats,
  TransactionRecord,
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

async function getAuthedContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserSetup(supabase, user);

  return { supabase, user };
}

async function ensureUserSetup(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null },
) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : user.email?.split("@")[0] ?? "Pengguna";

  const defaultCategories = [
    ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
      user_id: user.id,
      name,
      type: "income" as const,
      color: "#82A5FF",
    })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
      user_id: user.id,
      name,
      type: "expense" as const,
      color: "#4D84FF",
    })),
    ...DEFAULT_DEBT_CATEGORIES.map((name) => ({
      user_id: user.id,
      name,
      type: "debt" as const,
      color: "#FF8A8A",
    })),
  ];

  const [profileCheck, reminderCheck, categoriesCheck] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    supabase
      .from("reminder_preferences")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("categories").select("id").eq("user_id", user.id).limit(1),
  ]);

  if (profileCheck.error || reminderCheck.error || categoriesCheck.error) {
    throw new Error(
      "Gagal menyiapkan data awal user di Supabase. Jalankan schema terbaru dan cek RLS/policies.",
    );
  }

  const writes = [];

  if (!profileCheck.data) {
    writes.push(
      supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName,
        },
        { onConflict: "id" },
      ),
    );
  }

  if (!reminderCheck.data) {
    writes.push(
      supabase.from("reminder_preferences").upsert(
        {
          user_id: user.id,
        },
        { onConflict: "user_id" },
      ),
    );
  }

  if (!(categoriesCheck.data?.length ?? 0)) {
    writes.push(
      supabase.from("categories").upsert(defaultCategories, {
        onConflict: "user_id,name,type",
      }),
    );
  }

  if (!writes.length) {
    return;
  }

  const results = await Promise.all(writes);

  if (results.some((result) => result.error)) {
    throw new Error(
      "Gagal menyiapkan data awal user di Supabase. Jalankan schema terbaru dan cek RLS/policies.",
    );
  }
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
    transaction_date: String(record.transaction_date),
    reason: record.reason ? String(record.reason) : null,
    merchant: record.merchant ? String(record.merchant) : null,
    payment_method: record.payment_method ? String(record.payment_method) : null,
    category_label: record.category_label ? String(record.category_label) : null,
  };
}

function mapDebt(record: Record<string, unknown>): DebtRecord {
  return {
    id: String(record.id),
    amount: Number(record.amount ?? 0),
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
    totalOutstanding: unpaidDebts.reduce((sum, debt) => sum + debt.amount, 0),
    currentMonthOutstanding: unpaidDebts
      .filter((debt) => debt.debt_date.slice(0, 7) === monthKey)
      .reduce((sum, debt) => sum + debt.amount, 0),
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
    subtitle: transaction.reason || "Tanpa alasan tambahan",
    detail: [transaction.merchant, transaction.payment_method].filter(Boolean).join(" • ") || null,
    statusLabel: label,
  };
}

function buildHistoryRecordFromDebt(debt: DebtRecord): HistoryRecord {
  return {
    id: debt.id,
    source: "debt",
    type: "debt",
    amount: debt.amount,
    date: debt.debt_date,
    title: `Hutang ke ${debt.lender_name}`,
    subtitle: debt.reason,
    detail: `Transaksi dari ${debt.source_name}`,
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
  const yearStart = format(startOfYear(selectedMonthDate), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(selectedMonthDate), "yyyy-MM-dd");
  const historyStart = format(
    startOfMonth(subMonths(selectedMonthDate, MONTHS_TO_SHOW - 1)),
    "yyyy-MM-dd",
  );

  const { supabase, user } = await getAuthedContext();

  const [
    profileResult,
    categoriesResult,
    reminderResult,
    monthTransactionsResult,
    topIncomeResult,
    topExpenseResult,
    historyTransactionsResult,
    yearTransactionsResult,
    monthDebtsResult,
    allDebtsResult,
  ] = await Promise.all([
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
      .from("transactions")
      .select("id,amount,type,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id,amount,type,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .eq("type", "income")
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .order("amount", { ascending: false })
      .limit(10),
    supabase
      .from("transactions")
      .select("id,amount,type,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .order("amount", { ascending: false })
      .limit(10),
    supabase
      .from("transactions")
      .select("id,amount,type,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .gte("transaction_date", historyStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: true }),
    supabase
      .from("transactions")
      .select("id,amount,type,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .gte("transaction_date", yearStart)
      .lte("transaction_date", yearEnd)
      .order("transaction_date", { ascending: true }),
    supabase
      .from("debts")
      .select("id,amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
      .eq("user_id", user.id)
      .gte("debt_date", monthStart)
      .lte("debt_date", monthEnd)
      .order("debt_date", { ascending: false }),
    supabase
      .from("debts")
      .select("id,amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false }),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const categories = (categoriesResult.data ?? []) as Category[];
  const reminder = normalizeReminder(reminderResult.data as ReminderPreferences | null);
  const monthTransactions = (monthTransactionsResult.data ?? []).map(mapTransaction);
  const historyTransactions = (historyTransactionsResult.data ?? []).map(mapTransaction);
  const yearTransactions = (yearTransactionsResult.data ?? []).map(mapTransaction);
  const monthDebts = (monthDebtsResult.data ?? []).map(mapDebt);
  const allDebts = (allDebtsResult.data ?? []).map(mapDebt);
  const summary = summarizeTransactions(monthTransactions);
  const debtSummary = summarizeDebts(allDebts, selectedMonthDate);
  const unpaidMonthDebts = monthDebts.filter((debt) => !debt.is_paid);

  return {
    monthValue,
    selectedMonthLabel: format(selectedMonthDate, "MMMM yyyy", { locale: indonesiaLocale }),
    profile,
    categories,
    reminder,
    summary,
    goalProgress: buildGoalProgress(profile, summary, yearTransactions),
    topIncome: (topIncomeResult.data ?? []).map(mapTransaction),
    topExpense: (topExpenseResult.data ?? []).map(mapTransaction),
    monthTransactions,
    monthDebts,
    trendData: buildHistory(historyTransactions, selectedMonthDate),
    expenseBreakdown: buildCategoryBreakdown(monthTransactions),
    debtSummary,
    recentDebts: unpaidMonthDebts.slice(0, 5),
    user: {
      id: user.id,
      email: user.email ?? "",
      fullName: profile.full_name ?? null,
    },
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
      .select("id,amount,type,transaction_date,reason,merchant,payment_method,category_label")
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

  const [profileResult, categoriesResult, debtsResult, allDebtsResult] = await Promise.all([
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
      .select("id,amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
      .eq("user_id", user.id)
      .gte("debt_date", monthStart)
      .lte("debt_date", monthEnd)
      .order("debt_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("debts")
      .select("id,amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false }),
  ]);

  const profile = normalizeProfile(
    profileResult.data as ProfileData | null,
    user.user_metadata?.full_name ?? null,
  );
  const debts = (debtsResult.data ?? []).map(mapDebt);
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
}) {
  const { supabase, user } = await getAuthedContext();
  const exactDate = filters?.date ?? "";
  const weekday = filters?.weekday ?? "all";
  const year = filters?.year ?? "";
  const currentPage = Math.max(1, Number(filters?.page ?? "1") || 1);

  const [profileResult, transactionsResult, debtsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,currency_code,monthly_savings_goal,yearly_savings_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id,amount,type,transaction_date,reason,merchant,payment_method,category_label")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("debts")
      .select("id,amount,debt_date,source_name,lender_name,reason,category_label,is_paid,paid_at")
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
    user: {
      id: user.id,
      email: user.email ?? "",
    },
  };
}
