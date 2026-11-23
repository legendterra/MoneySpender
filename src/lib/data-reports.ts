import { getAuthedContext } from "@/lib/auth";
import { monthValueWIB, todayWIB } from "@/lib/dates";
import {
  REPORT_LIST_PAGE_SIZE,
  REPORT_TOP_ROWS,
  buildCategoryBreakdown,
  buildTopMerchants,
  buildTrend,
  changePercent,
  previousPeriod,
  resolveReportPeriod,
  summarizePeriod,
  trendStart,
  type CategoryShare,
  type MerchantTotal,
  type PeriodSummary,
  type ReportListKind,
  type ReportPeriod,
  type ReportTransaction,
  type TrendPoint,
} from "@/lib/reports";
import { paginate } from "@/lib/paging";
import { selectAllRows } from "@/lib/supabase/query";

// Server fetcher for /reports (Laporan). One paged read of the transactions in
// the trend window plus the previous period; everything else is pure.

export type ReportsPageData = {
  period: ReportPeriod;
  previous: ReportPeriod;
  currentMonth: string;
  summary: PeriodSummary;
  previousSummary: PeriodSummary;
  /** % change of expense vs the previous period, null without a baseline. */
  expenseChange: number | null;
  incomeChange: number | null;
  trend: TrendPoint[];
  /** Top rows for the overview. */
  categories: CategoryShare[];
  /** Top categories plus one folded "other" bucket, for the stacked bar. */
  categoryBar: CategoryShare[];
  categoryCount: number;
  merchants: MerchantTotal[];
  merchantCount: number;
  /** "Lihat semua" view: one page of the full list. */
  list: null | {
    kind: ReportListKind;
    page: number;
    totalPages: number;
    totalItems: number;
    /** Index of the first row on this page (for rank numbers and shades). */
    offset: number;
    categories: CategoryShare[];
    merchants: MerchantTotal[];
  };
};

const REPORT_COLUMNS = "type,amount,transaction_date,category_id,category_label,merchant,reason";

export async function getReportsData(
  params: { mode?: string; month?: string; year?: string },
  view: { list: ReportListKind | null; page: number } = { list: null, page: 1 },
): Promise<ReportsPageData> {
  const currentMonth = monthValueWIB();
  const today = todayWIB();
  const period = resolveReportPeriod(params, currentMonth);
  const previous = previousPeriod(period);
  const from = [trendStart(period), previous.start].sort()[0];
  const { supabase, user } = await getAuthedContext();

  const transactions = await selectAllRows<ReportTransaction>("transactions", () =>
    supabase
      .from("transactions")
      .select(REPORT_COLUMNS)
      .eq("user_id", user.id)
      .gte("transaction_date", from)
      .lte("transaction_date", period.end)
      .order("transaction_date", { ascending: true })
      .order("id", { ascending: true }),
  );

  const allCategories = buildCategoryBreakdown(transactions, period, { limit: Number.POSITIVE_INFINITY });
  const allMerchants = buildTopMerchants(transactions, period, Number.POSITIVE_INFINITY);
  const summary = summarizePeriod(transactions, period, today);
  const previousSummary = summarizePeriod(transactions, previous, today);

  return {
    period,
    previous,
    currentMonth,
    summary,
    previousSummary,
    expenseChange: changePercent(summary.expense, previousSummary.expense),
    incomeChange: changePercent(summary.income, previousSummary.income),
    trend: buildTrend(transactions, period),
    categories: allCategories.slice(0, REPORT_TOP_ROWS),
    categoryBar: buildCategoryBreakdown(transactions, period, { limit: REPORT_TOP_ROWS }),
    categoryCount: allCategories.length,
    merchants: allMerchants.slice(0, REPORT_TOP_ROWS),
    merchantCount: allMerchants.length,
    list: listPage(view, allCategories, allMerchants),
  };
}

function listPage(
  view: { list: ReportListKind | null; page: number },
  categories: CategoryShare[],
  merchants: MerchantTotal[],
): ReportsPageData["list"] {
  if (!view.list) return null;
  if (view.list === "kategori") {
    const paged = paginate(categories, view.page, REPORT_LIST_PAGE_SIZE);
    return { kind: "kategori", ...meta(paged), categories: paged.items, merchants: [] };
  }
  const paged = paginate(merchants, view.page, REPORT_LIST_PAGE_SIZE);
  return { kind: "tempat", ...meta(paged), categories: [], merchants: paged.items };
}

function meta(paged: { page: number; totalPages: number; totalItems: number }) {
  return {
    page: paged.page,
    totalPages: paged.totalPages,
    totalItems: paged.totalItems,
    offset: (paged.page - 1) * REPORT_LIST_PAGE_SIZE,
  };
}
