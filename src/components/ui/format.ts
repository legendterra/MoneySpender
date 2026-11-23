/**
 * Money and date formatting for the v2 UI (PLAN.md section 3).
 * id: "Rp142.000" / "Rp8,5 jt"   en: "IDR 142,000" / "IDR 8.5M".
 *
 * TODO(v2-merge): if src/lib/money.ts / src/lib/dates.ts land with the same
 * behaviour, re-export from there instead of duplicating.
 */

export type UiLocale = "id" | "en";
export type MoneySign = "auto" | "always" | "never";

export const APP_TIME_ZONE = "Asia/Jakarta";
const MINUS = "\u2212";

function numberLocale(locale: UiLocale) {
  return locale === "en" ? "en-US" : "id-ID";
}

export function currencyPrefix(locale: UiLocale) {
  return locale === "en" ? "IDR " : "Rp";
}

/** Digits only, grouped for the locale, no currency prefix: 142.000 / 142,000. */
export function formatAmountNumber(value: number, locale: UiLocale = "id") {
  return new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(value)));
}

function compactNumber(value: number, locale: UiLocale) {
  const abs = Math.abs(value);
  if (abs < 1000) return formatAmountNumber(abs, locale);
  return new Intl.NumberFormat(numberLocale(locale), {
    notation: "compact",
    maximumFractionDigits: abs >= 1_000_000 ? 1 : 0,
  }).format(abs);
}

export function formatMoney(
  value: number,
  {
    locale = "id",
    compact = false,
    sign = "auto",
  }: { locale?: UiLocale; compact?: boolean; sign?: MoneySign } = {},
) {
  const safe = Number.isFinite(value) ? value : 0;
  const body = compact ? compactNumber(safe, locale) : formatAmountNumber(safe, locale);
  const prefix = currencyPrefix(locale);
  let signChar = "";
  if (sign !== "never") {
    if (safe < 0) signChar = MINUS;
    else if (sign === "always" && safe > 0) signChar = "+";
  }
  return `${signChar}${prefix}${body}`;
}

/** Calendar date (YYYY-MM-DD) of `date` in Asia/Jakarta. Never uses toISOString. */
export function jakartaDateKey(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function jakartaMonthKey(date: Date = new Date()) {
  return jakartaDateKey(date).slice(0, 7);
}

/** Pure calendar arithmetic on YYYY-MM-DD keys (UTC based, no timezone drift). */
export function addDaysToKey(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const yy = String(next.getUTCFullYear()).padStart(4, "0");
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function addMonthsToKey(monthKey: string, months: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonthKey(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Days left in the month including `dateKey` itself. */
export function daysLeftInMonth(dateKey: string) {
  const day = Number(dateKey.slice(8, 10));
  return daysInMonthKey(dateKey.slice(0, 7)) - day + 1;
}

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

export function toUiLocale(locale: string | undefined | null): UiLocale {
  return locale === "en" ? "en" : "id";
}
