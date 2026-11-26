import { daysInMonth, isMonthValue, monthRange, shiftMonth } from "@/lib/dates";

// Pure aggregation for the Laporan screen (PLAN.md section 4, /reports).
// Dates are WIB calendar keys (yyyy-MM-dd); nothing here reads the clock.

export type ReportMode = "month" | "year";

export type ReportPeriod = {
  mode: ReportMode;
  /** yyyy-MM for month mode, yyyy for year mode. */
  key: string;
  start: string;
  end: string;
};

export type ReportTransaction = {
  type: string;
  amount: number | string;
  transaction_date: string;
  category_id: string | null;
  category_label: string | null;
  merchant: string | null;
  reason: string | null;
};

export type TrendPoint = {
  /** yyyy-MM */
  key: string;
  income: number;
  expense: number;
  /** The selected period (month mode) or false for context bars. */
  selected: boolean;
};

export type PeriodSummary = {
  income: number;
  expense: number;
  net: number;
  /** Share of income kept, 0-100 (0 without income). */
  savingsRate: number;
  count: number;
  /** Expense / elapsed days of the period (whole rupiah). */
  avgDailyExpense: number;
};

export type CategoryShare = {
  key: string;
  name: string;
  total: number;
  /** 0-100, one decimal. */
  share: number;
  count: number;
};

export type MerchantTotal = {
  name: string;
  total: number;
  count: number;
  /** Most frequent category label, for context. */
  topCategory: string | null;
};

const YEAR_RE = /^\d{4}$/;

export function isYearValue(value: unknown): value is string {
  return typeof value === "string" && YEAR_RE.test(value) && Number(value) >= 2000 && Number(value) <= 2100;
}

/** Resolves ?mode/&month/&year search params to a period, falling back to the current WIB month/year. */
export function resolveReportPeriod(
  params: { mode?: string | null; month?: string | null; year?: string | null },
  currentMonth: string,
): ReportPeriod {
  const currentYear = currentMonth.slice(0, 4);
  if (params.mode === "year") {
    const requested = isYearValue(params.year) ? params.year : currentYear;
    const key = requested > currentYear ? currentYear : requested;
    return { mode: "year", key, start: `${key}-01-01`, end: `${key}-12-31` };
  }
  const requested = isMonthValue(params.month) ? params.month : currentMonth;
  const key = requested > currentMonth ? currentMonth : requested;
  const { start, end } = monthRange(key);
  return { mode: "month", key, start, end };
}

/** The period before `period` (previous month or previous year). */
export function previousPeriod(period: ReportPeriod): ReportPeriod {
  if (period.mode === "year") {
    const key = String(Number(period.key) - 1);
    return { mode: "year", key, start: `${key}-01-01`, end: `${key}-12-31` };
  }
  const key = shiftMonth(period.key, -1);
  return { mode: "month", key, ...monthRange(key) };
}

/** First day of the trend window: 6 months ending at the month, or January of the year. */
export function trendStart(period: ReportPeriod) {
  return period.mode === "year" ? period.start : monthRange(shiftMonth(period.key, -5)).start;
}

function amountOf(t: { amount: number | string }) {
  const value = Number(t.amount);
  return Number.isFinite(value) ? value : 0;
}

function inPeriod(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

/** Monthly income vs expense bars: 6 months ending at the month, or Jan-Dec of the year. */
export function buildTrend(transactions: ReportTransaction[], period: ReportPeriod): TrendPoint[] {
  const keys =
    period.mode === "year"
      ? Array.from({ length: 12 }, (_, i) => `${period.key}-${String(i + 1).padStart(2, "0")}`)
      : Array.from({ length: 6 }, (_, i) => shiftMonth(period.key, i - 5));
  const points = new Map<string, TrendPoint>(
    keys.map((key) => [key, { key, income: 0, expense: 0, selected: period.mode === "month" && key === period.key }]),
  );
  for (const t of transactions) {
    const point = points.get(t.transaction_date.slice(0, 7));
    if (!point) continue;
    if (t.type === "income") point.income += amountOf(t);
    else if (t.type === "expense") point.expense += amountOf(t);
  }
  return keys.map((key) => points.get(key)!);
}

/**
 * Days of the period that have passed by `today` (whole period when it is over,
 * at least 1). Used for the average daily expense.
 */
export function elapsedDays(period: ReportPeriod, today: string) {
  if (today > period.end) {
    if (period.mode === "month") return daysInMonth(period.key);
    const year = Number(period.key);
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 366 : 365;
  }
  if (today < period.start) return 1;
  const [ty, tm, td] = today.split("-").map(Number);
  const [sy, sm, sd] = period.start.split("-").map(Number);
  const diff = (Date.UTC(ty, tm - 1, td) - Date.UTC(sy, sm - 1, sd)) / 86_400_000;
  return Math.max(1, Math.round(diff) + 1);
}

export function summarizePeriod(
  transactions: ReportTransaction[],
  period: ReportPeriod,
  today: string,
): PeriodSummary {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const t of transactions) {
    if (!inPeriod(t.transaction_date, period.start, period.end)) continue;
    if (t.type === "income") income += amountOf(t);
    else if (t.type === "expense") expense += amountOf(t);
    else continue;
    count += 1;
  }
  const net = income - expense;
  return {
    income,
    expense,
    net,
    savingsRate: income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0,
    count,
    avgDailyExpense: Math.round(expense / elapsedDays(period, today)),
  };
}

/** Percentage change from `previous` to `current`, null when there is nothing to compare. */
export function changePercent(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function normalizeLabel(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Expense per category, biggest first. Rows past `limit` are folded into one
 * "other" row keyed `__other__` (its name comes from `otherLabel`).
 */
export function buildCategoryBreakdown(
  transactions: ReportTransaction[],
  period: ReportPeriod,
  options: { limit?: number; otherLabel?: string; uncategorizedLabel?: string } = {},
): CategoryShare[] {
  const { limit = 6, otherLabel = "Lainnya", uncategorizedLabel = "Tanpa kategori" } = options;
  const buckets = new Map<string, CategoryShare>();
  let total = 0;
  for (const t of transactions) {
    if (t.type !== "expense" || !inPeriod(t.transaction_date, period.start, period.end)) continue;
    const label = normalizeLabel(t.category_label) || uncategorizedLabel;
    const key = t.category_id ?? `label:${label.toLocaleLowerCase("id-ID")}`;
    const bucket = buckets.get(key) ?? { key, name: label, total: 0, share: 0, count: 0 };
    bucket.total += amountOf(t);
    bucket.count += 1;
    buckets.set(key, bucket);
    total += amountOf(t);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "id"));
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);
  if (tail.length) {
    head.push({
      key: "__other__",
      name: otherLabel,
      total: tail.reduce((sum, row) => sum + row.total, 0),
      share: 0,
      count: tail.reduce((sum, row) => sum + row.count, 0),
    });
  }
  return head.map((row) => ({ ...row, share: total > 0 ? Math.round((row.total / total) * 1000) / 10 : 0 }));
}

/**
 * Where the money went: expenses grouped by merchant, falling back to the note
 * (Catat stores the note in `reason`). Case/space-insensitive; keeps the most
 * common spelling. Biggest total first.
 */
export function buildTopMerchants(
  transactions: ReportTransaction[],
  period: ReportPeriod,
  limit = 5,
): MerchantTotal[] {
  type Bucket = { total: number; count: number; spellings: Map<string, number>; categories: Map<string, number> };
  const buckets = new Map<string, Bucket>();
  for (const t of transactions) {
    if (t.type !== "expense" || !inPeriod(t.transaction_date, period.start, period.end)) continue;
    const name = normalizeLabel(t.merchant) || normalizeLabel(t.reason);
    if (!name) continue;
    const key = name.toLocaleLowerCase("id-ID");
    const bucket = buckets.get(key) ?? { total: 0, count: 0, spellings: new Map(), categories: new Map() };
    bucket.total += amountOf(t);
    bucket.count += 1;
    bucket.spellings.set(name, (bucket.spellings.get(name) ?? 0) + 1);
    const category = normalizeLabel(t.category_label);
    if (category) bucket.categories.set(category, (bucket.categories.get(category) ?? 0) + 1);
    buckets.set(key, bucket);
  }
  // Ties keep the first spelling seen (Array.prototype.sort is stable).
  const mostCommon = (counts: Map<string, number>) =>
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return [...buckets.values()]
    .map((bucket) => ({
      name: mostCommon(bucket.spellings) ?? "",
      total: bucket.total,
      count: bucket.count,
      topCategory: mostCommon(bucket.categories),
    }))
    .sort((a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name, "id"))
    .slice(0, limit);
}

/** Query string for /api/export/transactions limited to the period. */
export function exportQuery(period: ReportPeriod) {
  return period.mode === "year" ? `year=${period.key}` : `month=${period.key}`;
}

export type ReportListKind = "kategori" | "tempat";
export const REPORT_TOP_ROWS = 5;
export const REPORT_LIST_PAGE_SIZE = 10;

/** `?list=` for the full ("Lihat semua") category or place list; anything else = overview. */
export function parseReportList(value: unknown): ReportListKind | null {
  return value === "kategori" || value === "tempat" ? value : null;
}

/** Query for a report URL that keeps the period (and optionally opens a full list). */
export function reportQuery(period: ReportPeriod, list?: ReportListKind | null): Record<string, string | undefined> {
  return {
    ...(period.mode === "year" ? { mode: "year", year: period.key } : { month: period.key }),
    list: list ?? undefined,
  };
}
