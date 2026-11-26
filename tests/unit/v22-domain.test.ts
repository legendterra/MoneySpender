import { describe, expect, it } from "vitest";

import { evaluateDebtDue } from "@/lib/debt-due";
import { daysInMonth, isRecurringDueOnDate } from "@/lib/recurring-schedule";
import { computeSavingsGoalProgress } from "@/lib/savings-goals";

describe("v2.2 debt due date classification", () => {
  it("classifies overdue, today, soon (H-3), upcoming, and settled debts", () => {
    expect(evaluateDebtDue("2026-11-24", "2026-11-26")).toEqual({ state: "overdue", daysUntil: -2 });
    expect(evaluateDebtDue("2026-11-26", "2026-11-26")).toEqual({ state: "today", daysUntil: 0 });
    expect(evaluateDebtDue("2026-11-29", "2026-11-26")).toEqual({ state: "soon", daysUntil: 3 });
    expect(evaluateDebtDue("2026-12-05", "2026-11-26")).toEqual({ state: "upcoming", daysUntil: 9 });
    expect(evaluateDebtDue("2026-11-24", "2026-11-26", true)).toEqual({ state: "none", daysUntil: null });
    expect(evaluateDebtDue(null, "2026-11-26")).toEqual({ state: "none", daysUntil: null });
  });
});

describe("v2.2 flexible recurring schedules", () => {
  it("handles end-of-month across leap and non-leap February and 30/31 months", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    const eom = { cadence: "monthly" as const, day_of_month: 31, end_of_month: true };
    expect(isRecurringDueOnDate(eom, "2026-02-28")).toBe(true);
    expect(isRecurringDueOnDate(eom, "2026-02-27")).toBe(false);
    expect(isRecurringDueOnDate(eom, "2026-11-30")).toBe(true);
    expect(isRecurringDueOnDate(eom, "2026-12-31")).toBe(true);
  });

  it("handles weekly and yearly cadences", () => {
    // 2026-11-26 is Thursday (day 4)
    expect(isRecurringDueOnDate({ cadence: "weekly", day_of_month: 1, day_of_week: 4 }, "2026-11-26")).toBe(true);
    expect(isRecurringDueOnDate({ cadence: "weekly", day_of_month: 1, day_of_week: 1 }, "2026-11-26")).toBe(false);
    expect(
      isRecurringDueOnDate({ cadence: "yearly", day_of_month: 26, month_of_year: 11 }, "2026-11-26"),
    ).toBe(true);
    expect(
      isRecurringDueOnDate({ cadence: "yearly", day_of_month: 26, month_of_year: 10 }, "2026-11-26"),
    ).toBe(false);
  });
});

describe("v2.2 multi-pocket savings goals", () => {
  it("calculates progress, remaining, and monthly target needed", () => {
    const progress = computeSavingsGoalProgress(
      {
        id: "g1",
        name: "Dana Darurat",
        target_amount: 12_000_000,
        current_amount: 6_000_000,
        target_date: "2027-04-30",
        wallet_id: null,
        is_archived: false,
      },
      "2026-11-26",
    );
    expect(progress.percent).toBe(50);
    expect(progress.remaining).toBe(6_000_000);
    expect(progress.reached).toBe(false);
    // Nov, Dec, Jan, Feb, Mar, Apr = 6 months inclusive
    expect(progress.monthlyNeeded).toBe(1_000_000);
  });
});
