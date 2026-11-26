export type RecurringCadence = "weekly" | "monthly" | "yearly";

export type FlexibleRecurringRule = {
  cadence: RecurringCadence;
  day_of_month: number;
  day_of_week?: number | null;
  month_of_year?: number | null;
  end_of_month?: boolean;
};

export function daysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

/**
 * Determines whether a flexible recurring rule should trigger on a given WIB date (YYYY-MM-DD).
 * Supports weekly (0=Sun..6=Sat), monthly (1..28 or end_of_month), and yearly schedules.
 */
export function isRecurringDueOnDate(rule: FlexibleRecurringRule, dateKey: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const lastDay = daysInMonth(year, month);

  if (rule.cadence === "weekly") {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return weekday === (rule.day_of_week ?? 1);
  }
  if (rule.cadence === "yearly") {
    const targetMonth = rule.month_of_year ?? 1;
    const targetDay = rule.end_of_month ? lastDay : Math.min(rule.day_of_month, lastDay);
    return month === targetMonth && day === targetDay;
  }
  const targetDay = rule.end_of_month ? lastDay : Math.min(rule.day_of_month, lastDay);
  return day === targetDay;
}
