/**
 * Formatting helpers for v2 components (PLAN.md section 3). Money lives in
 * src/lib/money.ts and WIB calendar math in src/lib/dates.ts; this file
 * re-exports them under the names components use, so server code and the UI
 * share one implementation. Only display-only date labels are defined here.
 */

import { APP_TIMEZONE } from "@/lib/constants";
import {
  addDays,
  daysInMonth,
  daysLeftInMonth as daysLeftInMonthWIB,
  monthValueWIB,
  shiftMonth,
  todayWIB,
} from "@/lib/dates";
import { numberLocale, type UiLocale } from "@/lib/money";

export {
  currencyPrefix,
  formatAmountNumber,
  formatMoney,
  parseAmountInput,
  toUiLocale,
  type MoneySign,
  type UiLocale,
} from "@/lib/money";

export const APP_TIME_ZONE = APP_TIMEZONE;

/** Calendar date (YYYY-MM-DD) of `date` in Asia/Jakarta. Never uses toISOString. */
export const jakartaDateKey = (date: Date = new Date()) => todayWIB(date);

export const jakartaMonthKey = (date: Date = new Date()) => monthValueWIB(date);

/** Pure calendar arithmetic on YYYY-MM-DD keys (UTC based, no timezone drift). */
export const addDaysToKey = (key: string, days: number) => addDays(key, days);

export const addMonthsToKey = (monthKey: string, months: number) => shiftMonth(monthKey, months);

export const daysInMonthKey = (monthKey: string) => daysInMonth(monthKey);

/** Days left in the month including `dateKey` itself. */
export const daysLeftInMonth = (dateKey: string) => daysLeftInMonthWIB(dateKey);

function keyToUtcNoon(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12));
}

export function formatMonthLabel(monthKey: string, locale: UiLocale = "id") {
  return new Intl.DateTimeFormat(numberLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(keyToUtcNoon(`${monthKey}-01`));
}

export function formatShortMonthLabel(monthKey: string, locale: UiLocale = "id") {
  return new Intl.DateTimeFormat(numberLocale(locale), {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(keyToUtcNoon(`${monthKey}-01`));
}

export function formatDateKey(
  key: string,
  locale: UiLocale = "id",
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) {
  return new Intl.DateTimeFormat(numberLocale(locale), { ...options, timeZone: "UTC" }).format(
    keyToUtcNoon(key),
  );
}
