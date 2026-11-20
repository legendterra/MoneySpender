import { APP_TIMEZONE } from "@/lib/constants";

// All "today / this month" logic runs in Asia/Jakarta (WIB), never in the
// server's local zone and never via toISOString(), which is UTC.

type ZonedParts = { year: number; month: number; day: number; hour: number };

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

const MONTH_RE = /^(\d{4})-(\d{2})$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

export function zonedParts(date: Date = new Date()): ZonedParts {
  const parts = zonedFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour") % 24 };
}

/** Today's calendar date in WIB, `yyyy-MM-dd`. */
export function todayWIB(date: Date = new Date()) {
  const { year, month, day } = zonedParts(date);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Current month in WIB, `yyyy-MM`. */
export function monthValueWIB(date: Date = new Date()) {
  const { year, month } = zonedParts(date);
  return `${pad(year, 4)}-${pad(month)}`;
}

/** Current hour in WIB, 0-23. */
export function hourWIB(date: Date = new Date()) {
  return zonedParts(date).hour;
}

export function isMonthValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = MONTH_RE.exec(value);
  return Boolean(match && Number(match[2]) >= 1 && Number(match[2]) <= 12);
}

export function isDateValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(`${match[1]}-${match[2]}`) && year > 0;
}

function parseMonth(month: string) {
  const match = MONTH_RE.exec(month);
  if (!match) throw new Error(`Invalid month value "${month}", expected yyyy-MM`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function daysInMonth(month: string) {
  const { year, month: monthNumber } = parseMonth(month);
  // Day 0 of the next month is the last day of this month (UTC avoids DST).
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

/** First and real last day of a `yyyy-MM` month (no `-31` shortcuts). */
export function monthRange(month: string) {
  return { start: `${month}-01`, end: `${month}-${pad(daysInMonth(month))}` };
}

export function shiftMonth(month: string, delta: number) {
  const { year, month: monthNumber } = parseMonth(month);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`;
}

/** Calendar arithmetic on `yyyy-MM-dd` strings, timezone independent. */
export function addDays(date: string, days: number) {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Invalid date value "${date}", expected yyyy-MM-dd`);
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return `${pad(next.getUTCFullYear(), 4)}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Days remaining in the month, today included (last day of month = 1). */
export function daysLeftInMonth(today: string | Date = new Date()) {
  const date = typeof today === "string" ? today : todayWIB(today);
  if (!DATE_RE.test(date)) throw new Error(`Invalid date value "${date}", expected yyyy-MM-dd`);
  return daysInMonth(date.slice(0, 7)) - Number(date.slice(8, 10)) + 1;
}
