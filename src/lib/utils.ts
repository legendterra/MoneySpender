import { clsx, type ClassValue } from "clsx";
import { format as formatDateFns } from "date-fns";
import { twMerge } from "tailwind-merge";

import { DEFAULT_CURRENCY } from "@/lib/constants";

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

export function formatCurrency(value: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatCompactCurrency(value: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("id-ID", {
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

export function toMonthInput(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
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
