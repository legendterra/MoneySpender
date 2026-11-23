import { getAuthedContext } from "@/lib/auth";
import { monthValueWIB, todayWIB } from "@/lib/dates";
import {
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
  type ReportPeriod,
  type ReportTransaction,
  type TrendPoint,
} from "@/lib/reports";
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
  categories: CategoryShare[];
  merchants: MerchantTotal[];
};

const REPORT_COLUMNS = "type,amount,transaction_date,category_id,category_label,merchant,reason";

export async function getReportsData(params: {
  mode?: string;
  month?: string;
  year?: string;
}): Promise<ReportsPageData> {
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
    categories: buildCategoryBreakdown(transactions, period, { limit: 6 }),
    merchants: buildTopMerchants(transactions, period, 5),
  };
}
