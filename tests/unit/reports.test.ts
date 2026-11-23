import { describe, expect, it } from "vitest";

import {
  buildCategoryBreakdown,
  buildTopMerchants,
  buildTrend,
  changePercent,
  elapsedDays,
  exportQuery,
  previousPeriod,
  resolveReportPeriod,
  summarizePeriod,
  trendStart,
  type ReportTransaction,
  parseReportList,
  reportQuery,
} from "@/lib/reports";

function t(
  date: string,
  type: "income" | "expense",
  amount: number,
  extra: Partial<ReportTransaction> = {},
): ReportTransaction {
  return {
    type,
    amount,
    transaction_date: date,
    category_id: null,
    category_label: null,
    merchant: null,
    reason: null,
    ...extra,
  };
}

const NOV = resolveReportPeriod({ month: "2026-11" }, "2026-11");

describe("report periods", () => {
  it("resolves month and year periods and clamps the future to now", () => {
    expect(NOV).toEqual({ mode: "month", key: "2026-11", start: "2026-11-01", end: "2026-11-30" });
    expect(resolveReportPeriod({ month: "2027-01" }, "2026-11").key).toBe("2026-11");
    expect(resolveReportPeriod({ month: "bad" }, "2026-11").key).toBe("2026-11");
    expect(resolveReportPeriod({ mode: "year", year: "2025" }, "2026-11")).toEqual({
      mode: "year",
      key: "2025",
      start: "2025-01-01",
      end: "2025-12-31",
    });
    expect(resolveReportPeriod({ mode: "year", year: "2031" }, "2026-11").key).toBe("2026");
    expect(resolveReportPeriod({ mode: "year" }, "2026-11").key).toBe("2026");
  });

  it("knows the previous period, the trend window and the export query", () => {
    expect(previousPeriod(resolveReportPeriod({ month: "2026-01" }, "2026-11")).key).toBe("2025-12");
    expect(previousPeriod(resolveReportPeriod({ mode: "year", year: "2026" }, "2026-11")).key).toBe("2025");
    expect(trendStart(NOV)).toBe("2026-06-01");
    expect(trendStart(resolveReportPeriod({ mode: "year", year: "2026" }, "2026-11"))).toBe("2026-01-01");
    expect(exportQuery(NOV)).toBe("month=2026-11");
    expect(exportQuery(resolveReportPeriod({ mode: "year", year: "2026" }, "2026-11"))).toBe("year=2026");
  });

  it("counts elapsed days for averages (running, finished, leap years)", () => {
    expect(elapsedDays(NOV, "2026-11-23")).toBe(23);
    expect(elapsedDays(NOV, "2026-12-05")).toBe(30);
    expect(elapsedDays(resolveReportPeriod({ month: "2024-02" }, "2026-11"), "2026-11-01")).toBe(29);
    expect(elapsedDays(resolveReportPeriod({ mode: "year", year: "2024" }, "2026-11"), "2026-11-01")).toBe(366);
    expect(elapsedDays(resolveReportPeriod({ mode: "year", year: "2026" }, "2026-11"), "2026-02-01")).toBe(32);
  });
});

describe("report aggregation", () => {
  const data = [
    t("2026-06-15", "expense", 100_000),
    t("2026-05-31", "expense", 999_999), // before the 6-month window
    t("2026-10-01", "income", 8_000_000),
    t("2026-10-02", "expense", 2_000_000),
    t("2026-11-01", "income", 10_000_000),
    t("2026-11-02", "expense", 600_000, { category_id: "food", category_label: "Makan", reason: "Warteg Bahari" }),
    t("2026-11-03", "expense", 400_000, { category_id: "food", category_label: "Makan", merchant: "warteg  bahari" }),
    t("2026-11-04", "expense", 300_000, { category_label: "Parkir" }),
    t("2026-11-05", "expense", 200_000, { category_id: "fun", category_label: "Hiburan", reason: "Bioskop" }),
    t("2026-11-06", "expense", 100_000),
    t("2026-12-01", "expense", 50_000), // after the period
  ];

  it("builds a 6-month trend ending at the selected month", () => {
    const trend = buildTrend(data, NOV);
    expect(trend.map((p) => p.key)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(trend[0]).toEqual({ key: "2026-06", income: 0, expense: 100_000, selected: false });
    expect(trend[4]).toMatchObject({ income: 8_000_000, expense: 2_000_000 });
    expect(trend[5]).toMatchObject({ income: 10_000_000, expense: 1_600_000, selected: true });
  });

  it("builds a 12-month trend for a year", () => {
    const trend = buildTrend(data, resolveReportPeriod({ mode: "year", year: "2026" }, "2026-12"));
    expect(trend).toHaveLength(12);
    expect(trend.every((p) => !p.selected)).toBe(true);
    expect(trend[4].expense).toBe(999_999);
    expect(trend[11].expense).toBe(50_000);
  });

  it("summarizes the period with savings rate and daily average", () => {
    const summary = summarizePeriod(data, NOV, "2026-11-20");
    expect(summary).toEqual({
      income: 10_000_000,
      expense: 1_600_000,
      net: 8_400_000,
      savingsRate: 84,
      count: 6,
      avgDailyExpense: 80_000,
    });
    expect(summarizePeriod([], NOV, "2026-11-20").savingsRate).toBe(0);
    expect(summarizePeriod([t("2026-11-01", "expense", 10)], NOV, "2026-11-20").savingsRate).toBe(0);
  });

  it("compares with the previous period", () => {
    expect(changePercent(1_600_000, 2_000_000)).toBe(-20);
    expect(changePercent(150, 100)).toBe(50);
    expect(changePercent(100, 0)).toBeNull();
  });

  it("breaks expenses down by category with shares and an other bucket", () => {
    const rows = buildCategoryBreakdown(data, NOV, { limit: 2 });
    expect(rows.map((r) => [r.name, r.total, r.share, r.count])).toEqual([
      ["Makan", 1_000_000, 62.5, 2],
      ["Parkir", 300_000, 18.8, 1],
      ["Lainnya", 300_000, 18.8, 2],
    ]);
    const all = buildCategoryBreakdown(data, NOV, { uncategorizedLabel: "Tanpa kategori" });
    expect(all.map((r) => r.name)).toEqual(["Makan", "Parkir", "Hiburan", "Tanpa kategori"]);
    expect(all.find((r) => r.name === "Parkir")?.key).toBe("label:parkir");
  });

  it("ranks merchants (falling back to the note), merging spelling variants", () => {
    const merchants = buildTopMerchants(data, NOV);
    expect(merchants).toEqual([
      { name: "Warteg Bahari", total: 1_000_000, count: 2, topCategory: "Makan" },
      { name: "Bioskop", total: 200_000, count: 1, topCategory: "Hiburan" },
    ]);
    expect(buildTopMerchants(data, NOV, 1)).toHaveLength(1);
  });
});

describe("report list view params", () => {
  it("accepts only the two full-list kinds", () => {
    expect(parseReportList("kategori")).toBe("kategori");
    expect(parseReportList("tempat")).toBe("tempat");
    expect(parseReportList("anything")).toBeNull();
    expect(parseReportList(undefined)).toBeNull();
  });

  it("keeps the period in report links", () => {
    const month = resolveReportPeriod({ month: "2026-10" }, "2026-11");
    const year = resolveReportPeriod({ mode: "year", year: "2025" }, "2026-11");
    expect(reportQuery(month)).toEqual({ month: "2026-10", list: undefined });
    expect(reportQuery(year, "tempat")).toEqual({ mode: "year", year: "2025", list: "tempat" });
  });
});
