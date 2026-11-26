import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";

import { computeAllowance } from "@/lib/allowance";
import { getAuthedContext } from "@/lib/auth";
import { computeBudgetAlerts } from "@/lib/budget";
import { MONTHS_TO_SHOW } from "@/lib/constants";
import { isMonthValue, monthRange, monthValueWIB, shiftMonth, todayWIB } from "@/lib/dates";
import { DEBTS_PAGE_SIZE, buildDebtBoard, summarizeSide, toDebtItem } from "@/lib/debt-board";
import {
  DEBT_COLUMNS,
  DEBT_PAYMENT_COLUMNS,
  balancesFromLean,
  balancesFromSnapshot,
  fetchBalanceData,
  fetchFinanceSnapshot,
  fetchProfile,
  fetchRecurring,
  fetchTemplates,
  mapDebt,
  mapDebtPayment,
} from "@/lib/finance-data";
import { paginate } from "@/lib/paging";
import { expectData, expectRows, selectAllRows } from "@/lib/supabase/query";
import type {
  BudgetAlert,
  Category,
  CategorySlice,
  DashboardInsight,
  DebtRecord,
  DebtSummary,
  GoalProgress,
  MonthlyBudget,
  MonthlyPoint,
  ProfileData,
  SummaryStats,
  TransactionRecord,
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

export type DebtsPageParams = {
  tab: "payable" | "receivable";
  page: number;
  settledPage: number;
  /** Opened from Riwayat (?debt=): returned with its payments even when on another page. */
  debtId: string | null;
};

/**
 * Hutang screen: every debt (not only one month), grouped into payable /
 * receivable, 10 per page per list. Debts are few per user, so totals come
 * from all of them; payments are read only for the debts on screen. Wallet
 * balances use lean columns, in parallel.
 */
export async function getDebtsPageData(params: DebtsPageParams) {
  const { supabase, user } = await getAuthedContext();
  const [debtRows, balanceData] = await Promise.all([
    selectAllRows<Record<string, unknown>>("debts", () =>
      supabase.from("debts").select(DEBT_COLUMNS).eq("user_id", user.id).order("id", { ascending: true }),
    ),
    fetchBalanceData(supabase, user.id),
  ]);
  const board = buildDebtBoard(debtRows.map(mapDebt), []);
  const side = board[params.tab];
  const active = paginate(side.active, params.page, DEBTS_PAGE_SIZE);
  const settled = paginate(side.settled, params.settledPage, DEBTS_PAGE_SIZE);
  const all = [...board.payable.active, ...board.payable.settled, ...board.receivable.active, ...board.receivable.settled];
  const focus = params.debtId ? (all.find((debt) => debt.id === params.debtId) ?? null) : null;

  const shownIds = [...new Set([...active.items, ...settled.items, ...(focus ? [focus] : [])].map((debt) => debt.id))];
  const payments = shownIds.length
    ? expectRows<Record<string, unknown>>(
        "debt_payments",
        await supabase.from("debt_payments").select(DEBT_PAYMENT_COLUMNS).eq("user_id", user.id).in("debt_id", shownIds),
      ).map(mapDebtPayment)
    : [];
  const withPayments = (debt: DebtRecord) => toDebtItem(debt, payments.filter((payment) => payment.debt_id === debt.id));

  return {
    today: todayWIB(),
    wallets: balancesFromLean(balanceData).filter((wallet) => !wallet.is_archived),
    summary: { payable: summarizeSide(board.payable), receivable: summarizeSide(board.receivable) },
    active: { items: active.items.map(withPayments), page: active.page, totalPages: active.totalPages },
    settled: { items: settled.items.map(withPayments), page: settled.page, totalPages: settled.totalPages },
    focus: focus ? withPayments(focus) : null,
  };
}

/** Pengaturan menu data; each settings section has its own fetcher in src/lib/data-settings.ts. */
export { getSettingsMenuData as getSettingsData } from "@/lib/data-settings";

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
