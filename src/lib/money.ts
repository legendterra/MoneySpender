// Money formatting for the v2 UI (PLAN.md section 3). One source of truth:
// src/components/ui/format.ts re-exports these for components.
// id: "Rp142.000" / "Rp8,5 jt"   en: "IDR 142,000" / "IDR 8.5M".

export type UiLocale = "id" | "en";
export type MoneySign = "auto" | "always" | "never";

const MINUS = "\u2212";

export function numberLocale(locale: UiLocale) {
  return locale === "en" ? "en-US" : "id-ID";
}

export function toUiLocale(locale: string | undefined | null): UiLocale {
  return locale === "en" ? "en" : "id";
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

/**
 * Parses typed rupiah ("25.000", "25,000", "Rp 25000", "-150.000") into an integer.
 * Returns null for empty or invalid input. Decimals are not used for IDR.
 */
export function parseAmountInput(text: string, { allowNegative = false } = {}): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const negative = allowNegative && /^[-\u2212]/.test(trimmed.replace(/^(rp|idr)\s*/i, ""));
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number(digits.slice(0, 14));
  if (!Number.isSafeInteger(value)) return null;
  return negative ? -value : value;
}
