import { clsx, type ClassValue } from "clsx";
import { format as formatDateFns } from "date-fns";
import { twMerge } from "tailwind-merge";

import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/constants";
import { monthRange, monthValueWIB } from "@/lib/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
}

function parseDateValue(value: string) {
  const parsedDate = new Date(normalizeDateValue(value));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function currencyConfig(currency: string) {
  return (
    SUPPORTED_CURRENCIES.find((item) => item.code === currency) ?? {
      code: currency,
      locale: "id-ID",
      maxDigits: 0,
    }
  );
}

export function formatCurrency(value: number, currency = DEFAULT_CURRENCY) {
  const config = currencyConfig(currency);
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    maximumFractionDigits: config.maxDigits,
  }).format(value ?? 0);
}

export function formatCompactCurrency(value: number, currency = DEFAULT_CURRENCY) {
  const config = currencyConfig(currency);
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function formatDate(date: string) {
  const parsedDate = parseDateValue(date);
  return parsedDate ? formatDateFns(parsedDate, "dd/MM/yyyy") : date;
}

export function formatMonthLabel(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(normalizeDateValue(date)));
}

/** Current (or given) month in WIB, `yyyy-MM`. */
export function toMonthInput(date = new Date()) {
  return monthValueWIB(date);
}

export function getMonthRange(monthValue: string) {
  return monthRange(monthValue);
}

export function calculateRate(income: number, expense: number) {
  if (!income) return 0;
  return Math.max(0, Math.round(((income - expense) / income) * 100));
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
