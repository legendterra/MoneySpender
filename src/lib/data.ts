import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

import { computeAllowance } from "@/lib/allowance";
import { getAuthedContext } from "@/lib/auth";
import { computeBudgetAlerts } from "@/lib/budget";
import { MONTHS_TO_SHOW, WEEKDAY_OPTIONS } from "@/lib/constants";
import { isMonthValue, monthRange, monthValueWIB, shiftMonth, todayWIB } from "@/lib/dates";
import {
  DEBT_COLUMNS,
  TRANSACTION_COLUMNS,
  balancesFromSnapshot,
  fetchFinanceSnapshot,
  fetchProfile,
  fetchRecurring,
  fetchTemplates,
  mapDebt,
  mapTransaction,
} from "@/lib/finance-data";
import { expectCount, expectData, expectRows } from "@/lib/supabase/query";
import type {
  BudgetAlert,
  Category,
  CategorySlice,
  DashboardInsight,
  DebtPayment,
  DebtRecord,
  DebtSummary,
  GoalProgress,
  HistoryRecord,
  MonthlyBudget,
  MonthlyPoint,
  ProfileData,
  SummaryStats,
  TransactionRecord,
  TransactionType,
  Wallet,
} from "@/lib/types";
import { calculateRate, formatCompactCurrency } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveMonthValue(month?: string) {
  return isMonthValue(month) ? month : monthValueWIB();
}

/** Local Date for the 1st of a month, only used to format labels. */
function monthLabelDate(monthValue: string) {
  return new Date(`${monthValue}-01T00:00:00`);
}

function monthLabel(monthValue: string) {
  return format(monthLabelDate(monthValue), "MMMM yyyy", { locale: indonesiaLocale });
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function fallbackName(user: { user_metadata?: Record<string, unknown> | null }) {
  const name = user.user_metadata?.full_name;
  return typeof name === "string" ? name : null;
}

// ── Summary helpers ───────────────────────────────────────────────────────────

function summarizeTransactions(transactions: TransactionRecord[]): SummaryStats {
  const income = transactions.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = transactions.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
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

function summarizeDebts(debts: DebtRecord[], monthKey: string): DebtSummary {
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
  const hasWallets = wallets.filter((w) => !w.is_archived).length > 0;
  const hasTransactions = monthTransactions.length > 0;

  if (!hasWallets) {
    insights.push({
      title: "Mulai dengan dompet",
      body: "Tambahkan dompet pertamamu di Settings. Tanpa dompet, saldo tidak bisa dilacak dengan benar.",
      tone: "warning",
    });
  }

  if (hasWallets && !hasTransactions) {
    insights.push({
      title: "Catat transaksi pertamamu",
      body: "Pastikan dompet sudah ada, lalu catat pemasukan atau pengeluaran pertamamu hari ini.",
      tone: "neutral",
    });
  }

  if (cur.expense > prev.expense && prev.expense > 0) {
    const diff = Math.round(((cur.expense - prev.expense) / prev.expense) * 100);
    insights.push({
      title: "Pengeluaran naik",
      body: `Bulan ini pengeluaran naik ${diff}% dibanding bulan lalu. Cek kategori terbesar sebelum kebablasan.`,
      tone: diff > 30 ? "warning" : "neutral",
    });
  }

  if (cur.balance > 0 && prev.balance > 0 && cur.balance > prev.balance) {
    const improvement = Math.round(((cur.balance - prev.balance) / prev.balance) * 100);
    insights.push({
      title: "Tabungan membaik",
      body: `Saldo bulan ini naik ${improvement}% dibanding bulan lalu. Pertahankan!`,
      tone: "good",
    });
  }

  if (topExpense) {
    insights.push({
      title: "Kategori paling berat",
      body: `${topExpense.name} jadi pengeluaran terbesar bulan ini.`,
      tone: "neutral",
    });
  }

  const overBudget = budgetAlerts.find((a) => a.status === "over");
  if (overBudget) {
    insights.push({
      title: "Budget terlampaui",
      body: `${overBudget.categoryName} sudah ${overBudget.ratio}% dari budget. Pertimbangkan untuk menahan pengeluaran di sini.`,
      tone: "danger",
    });
  }

  const warningBudget = budgetAlerts.find((a) => a.status === "warning");
  if (warningBudget && !overBudget) {
    insights.push({
      title: "Budget hampir penuh",
      body: `${warningBudget.categoryName} sudah ${warningBudget.ratio}% dari budget. Hati-hati untuk sisa bulan ini.`,
      tone: "warning",
    });
  }

  if (debtSummary.totalPayable > 0) {
    insights.push({
      title: "Hutang aktif",
      body: `Ada ${debtSummary.unpaidCount} hutang belum lunas. Cicil sedikit-sedikit lebih baik daripada menunggu sempurna.`,
      tone: "warning",
    });
  }

  if (debtSummary.totalReceivable > 0) {
    insights.push({
      title: "Piutang masuk",
      body: `Ada ${formatCompactCurrency(debtSummary.totalReceivable)} yang akan masuk. Jangan lupa tagih!`,
      tone: "good",
    });
  }

  const lowWallet = wallets.find((w) => !w.is_archived && w.balance < 50_000);
  if (lowWallet) {
    insights.push({
      title: "Saldo tipis",
      body: `Dompet "${lowWallet.name}" saldo kurang dari Rp50.000. Pastikan ada cadangan cukup untuk kebutuhan mendatang.`,
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

function buildHistory(transactions: TransactionRecord[], monthValue: string): MonthlyPoint[] {
  const seeds = Array.from({ length: MONTHS_TO_SHOW }, (_, i) => {
    const key = shiftMonth(monthValue, i - (MONTHS_TO_SHOW - 1));
    return {
      key,
      label: format(monthLabelDate(key), "MMM yy", { locale: indonesiaLocale }),
      income: 0,
      expense: 0,
      balance: 0,
    };
  });
  const mapped = new Map(seeds.map((s) => [s.key, s]));
  transactions.forEach((e) => {
    const cur = mapped.get(e.transaction_date.slice(0, 7));
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
    detail: [t.merchant, t.wallet_label].filter(Boolean).join(" · ") || null,
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

function groupPaymentsByDebt(payments: DebtPayment[]) {
  const byDebt = new Map<string, DebtPayment[]>();
  [...payments]
    .sort((a, b) => b.paid_date.localeCompare(a.paid_date))
    .forEach((p) => byDebt.set(p.debt_id, [...(byDebt.get(p.debt_id) ?? []), p]));
  return byDebt;
}

const byDebtDateDesc = (a: DebtRecord, b: DebtRecord) => b.debt_date.localeCompare(a.debt_date);

// ── Public data fetchers ──────────────────────────────────────────────────────

export async function getDashboardData(month?: string) {
  const monthValue = resolveMonthValue(month);
  const today = todayWIB();
  const { start: monthStart, end: monthEnd } = monthRange(monthValue);
  const prev = monthRange(shiftMonth(monthValue, -1));
  const year = monthValue.slice(0, 4);
  const historyStart = monthRange(shiftMonth(monthValue, -(MONTHS_TO_SHOW - 1))).start;

  const { supabase, user } = await getAuthedContext();

  const [profile, snapshot, categoriesResult, budgetsResult, recurring, templates] = await Promise.all([
    fetchProfile(supabase, user.id, fallbackName(user)),
    fetchFinanceSnapshot(supabase, user.id),
    supabase.from("categories").select("id,name,type,color").eq("user_id", user.id).eq("type", "expense"),
    supabase
      .from("monthly_budgets")
      .select("id,category_id,month,amount")
      .eq("user_id", user.id)
      .eq("month", monthValue),
    fetchRecurring(supabase, user.id, { activeOnly: true }),
    fetchTemplates(supabase, user.id),
  ]);

  const categories = expectRows<Category>("categories", categoriesResult);
  const budgets = expectRows<MonthlyBudget>("monthly_budgets", budgetsResult);
  const allTx = snapshot.transactions;
  const periodTx = allTx.filter((t) => inRange(t.transaction_date, historyStart, monthEnd));
  const yearTx = allTx.filter((t) => t.transaction_date.slice(0, 4) === year);
  const prevTx = allTx.filter((t) => inRange(t.transaction_date, prev.start, prev.end));
  const monthTx = allTx.filter((t) => inRange(t.transaction_date, monthStart, monthEnd));

  const allWallets = balancesFromSnapshot(snapshot);
  const wallets = allWallets.filter((w) => !w.is_archived);
  const allowance = computeAllowance({
    today,
    walletsAtStartOfToday: balancesFromSnapshot(snapshot, { before: today }),
    transactions: allTx,
    recurring,
    reserveSavings: profile.reserve_savings,
    monthlySavingsGoal: Number(profile.monthly_savings_goal ?? 0),
  });

  const allDebts = [...snapshot.debts].sort(byDebtDateDesc);
  const summary = summarizeTransactions(monthTx);
  const debtSummary = summarizeDebts(allDebts, monthValue);
  const budgetAlerts = computeBudgetAlerts(monthTx, budgets, categories);
  const unpaidMonthDebts = allDebts.filter(
    (d) => !d.is_paid && d.direction === "payable" && inRange(d.debt_date, monthStart, monthEnd),
  );

  return {
    monthValue,
    selectedMonthLabel: monthLabel(monthValue),
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
    trendData: buildHistory(periodTx, monthValue),
    expenseBreakdown: buildCategoryBreakdown(monthTx),
    budgetAlerts,
    insights: buildDashboardInsights(monthTx, prevTx, budgetAlerts, debtSummary, wallets),
    wallets,
    debtSummary,
    recentDebts: unpaidMonthDebts.slice(0, 5),
    // v2 additions (PLAN.md section 4 "Beranda")
    today,
    isCurrentMonth: monthValue === today.slice(0, 7),
    allowance,
    todayTransactions: allTx.filter((t) => t.transaction_date === today).reverse(),
    categories,
    recurring,
    templates,
  };
}

export async function getTransactionsPageData(type: TransactionType, month?: string) {
  const monthValue = resolveMonthValue(month);
  const { start: monthStart, end: monthEnd } = monthRange(monthValue);
  const { supabase, user } = await getAuthedContext();

  const [profile, categoriesResult, transactionsResult, snapshot] = await Promise.all([
    fetchProfile(supabase, user.id, fallbackName(user)),
    supabase
      .from("categories")
      .select("id,name,type,color")
      .eq("user_id", user.id)
      .eq("type", type)
      .order("name"),
    supabase
      .from("transactions")
      .select(TRANSACTION_COLUMNS)
      .eq("user_id", user.id)
      .eq("type", type)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    fetchFinanceSnapshot(supabase, user.id),
  ]);

  const transactions = expectRows<Record<string, unknown>>("transactions", transactionsResult).map(mapTransaction);

  return {
    monthValue,
    selectedMonthLabel: monthLabel(monthValue),
    profile,
    categories: expectRows<Category>("categories", categoriesResult),
    wallets: balancesFromSnapshot(snapshot)
      .filter((w) => !w.is_archived)
      .sort((a, b) => a.name.localeCompare(b.name)),
    transactions,
    total: transactions.reduce((s, t) => s + t.amount, 0),
    type,
  };
}

export async function getDebtsPageData(month?: string) {
  const monthValue = resolveMonthValue(month);
  const { start: monthStart, end: monthEnd } = monthRange(monthValue);
  const { supabase, user } = await getAuthedContext();

  const [profile, snapshot] = await Promise.all([
    fetchProfile(supabase, user.id, fallbackName(user)),
    fetchFinanceSnapshot(supabase, user.id),
  ]);

  const paymentsByDebt = groupPaymentsByDebt(snapshot.payments);
  const allDebts = [...snapshot.debts].sort(byDebtDateDesc);
  const debts = allDebts
    .filter((d) => inRange(d.debt_date, monthStart, monthEnd))
    .map((d) => ({ ...d, payments: paymentsByDebt.get(d.id) ?? [] }));

  return {
    monthValue,
    selectedMonthLabel: monthLabel(monthValue),
    profile,
    wallets: balancesFromSnapshot(snapshot)
      .filter((w) => !w.is_archived)
      .sort((a, b) => a.name.localeCompare(b.name)),
    debts,
    summary: summarizeDebts(allDebts, monthValue),
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
  const pageSize = 10;

  const isComplexFilter = weekday !== "all" || query !== "";
  const kLimit = currentPage * pageSize;

  let txQuery = supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  let debtQuery = supabase
    .from("debts")
    .select(DEBT_COLUMNS)
    .eq("user_id", user.id)
    .order("debt_date", { ascending: false })
    .order("created_at", { ascending: false });

  let txCountQuery = supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  let debtCountQuery = supabase.from("debts").select("id", { count: "exact", head: true }).eq("user_id", user.id);

  if (exactDate) {
    txQuery = txQuery.eq("transaction_date", exactDate);
    debtQuery = debtQuery.eq("debt_date", exactDate);
    txCountQuery = txCountQuery.eq("transaction_date", exactDate);
    debtCountQuery = debtCountQuery.eq("debt_date", exactDate);
  }

  if (year) {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    txQuery = txQuery.gte("transaction_date", yearStart).lte("transaction_date", yearEnd);
    debtQuery = debtQuery.gte("debt_date", yearStart).lte("debt_date", yearEnd);
    txCountQuery = txCountQuery.gte("transaction_date", yearStart).lte("transaction_date", yearEnd);
    debtCountQuery = debtCountQuery.gte("debt_date", yearStart).lte("debt_date", yearEnd);
  }

  if (!isComplexFilter) {
    txQuery = txQuery.limit(kLimit);
    debtQuery = debtQuery.limit(kLimit);
  }

  const [profile, transactionsResult, debtsResult, txCountResult, debtCountResult] = await Promise.all([
    fetchProfile(supabase, user.id, fallbackName(user)),
    txQuery,
    debtQuery,
    txCountQuery,
    debtCountQuery,
  ]);

  let history = [
    ...expectRows<Record<string, unknown>>("transactions", transactionsResult)
      .map(mapTransaction)
      .map(buildHistoryRecordFromTransaction),
    ...expectRows<Record<string, unknown>>("debts", debtsResult).map(mapDebt).map(buildHistoryRecordFromDebt),
  ];
  const txCount = expectCount("transactions", txCountResult);
  const debtCount = expectCount("debts", debtCountResult);

  if (isComplexFilter) {
    history = history.filter((entry) => {
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
    });
  }

  history.sort((a, b) => {
    const diff = b.date.localeCompare(a.date);
    return diff !== 0 ? diff : b.amount - a.amount;
  });

  const totalItems = isComplexFilter ? history.length : txCount + debtCount;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
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
    totalItems,
    totalPages,
    pageSize,
    items: history.slice(startIndex, startIndex + pageSize),
  };
}

/** Pengaturan menu data; each settings section has its own fetcher in src/lib/data-settings.ts. */
export { getSettingsMenuData as getSettingsData } from "@/lib/data-settings";

export async function getNetWorthData() {
  const { supabase, user } = await getAuthedContext();

  const [profile, snapshot] = await Promise.all([
    fetchProfile(supabase, user.id, fallbackName(user)),
    fetchFinanceSnapshot(supabase, user.id),
  ]);

  const wallets = balancesFromSnapshot(snapshot).filter((w) => !w.is_archived);
  const debtSummary = summarizeDebts(snapshot.debts, monthValueWIB());

  // ASSETS = total saldo dompet + piutang; LIABILITIES = hutang (payable)
  const totalWalletBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const totalAssets = totalWalletBalance + debtSummary.totalReceivable;
  const totalDebt = debtSummary.totalPayable;

  return {
    profile,
    wallets,
    transfers: snapshot.transfers,
    debtSummary,
    totalWalletBalance,
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
  };
}

/** profiles.locale for the signed-in user (cheap; used to sync the locale cookie). */
export async function getAccountLocale() {
  const { supabase, user } = await getAuthedContext();
  return (await fetchProfile(supabase, user.id)).locale;
}

export async function checkUserHasWallet(): Promise<boolean> {
  const { supabase, user } = await getAuthedContext();
  const data = expectData(
    "wallets",
    await supabase.from("wallets").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
  );
  return !!data;
}
