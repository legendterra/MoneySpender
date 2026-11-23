"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLocale } from "next-intl";

import {
  currencyPrefix,
  formatAmountNumber,
  formatMoney,
  toUiLocale,
  type MoneySign,
} from "@/components/ui/format";
import { cn } from "@/lib/utils";

export type MoneyTone = "neutral" | "muted" | "income" | "expense" | "debt" | "transfer" | "primary";

export const moneyToneClass: Record<MoneyTone, string> = {
  neutral: "text-text",
  muted: "text-muted",
  income: "text-income",
  expense: "text-expense",
  debt: "text-debt",
  transfer: "text-transfer",
  primary: "text-primary-ink",
};

/** Inline money, e.g. in rows and stats. Tabular numerals, locale aware. */
export function AmountText({
  value,
  tone = "neutral",
  sign = "auto",
  compact = false,
  className,
}: {
  value: number;
  tone?: MoneyTone;
  sign?: MoneySign;
  compact?: boolean;
  className?: string;
}) {
  const locale = toUiLocale(useLocale());
  return (
    <span className={cn("tabular-nums tracking-tight whitespace-nowrap", moneyToneClass[tone], className)}>
      {formatMoney(value, { locale, sign, compact })}
    </span>
  );
}

function sizeFor(digits: number, size: "md" | "lg" | "xl") {
  if (size === "md") return digits > 10 ? "text-2xl" : "text-[28px]";
  if (size === "lg") return digits > 10 ? "text-[28px]" : "text-[34px]";
  if (digits > 11) return "text-[30px]";
  if (digits > 8) return "text-[36px]";
  return "text-[44px]";
}

/**
 * Large amount with a small currency prefix ("Rp 25.000"). Ticks softly when the value
 * changes; framer-motion skips the motion under prefers-reduced-motion (MotionConfig user).
 */
export function AmountDisplay({
  value,
  tone = "neutral",
  size = "xl",
  align = "center",
  className,
  placeholder = false,
  label,
}: {
  value: number;
  tone?: MoneyTone;
  size?: "md" | "lg" | "xl";
  align?: "center" | "start";
  className?: string;
  /** Render zero in muted color, as an input placeholder. */
  placeholder?: boolean;
  /** Accessible description read before the value, e.g. "Nominal". */
  label?: string;
}) {
  const locale = toUiLocale(useLocale());
  const number = formatAmountNumber(value, locale);
  const negative = value < 0;
  const digits = String(Math.abs(Math.round(value))).length;
  const isEmpty = placeholder && value === 0;

  return (
    <div
      className={cn(
        "flex min-w-0 items-baseline gap-1 font-bold tabular-nums tracking-[-0.02em]",
        align === "center" ? "justify-center" : "justify-start",
        sizeFor(digits, size),
        className,
      )}
      aria-label={label ? `${label}: ${formatMoney(value, { locale })}` : undefined}
      role={label ? "status" : undefined}
      aria-live={label ? "polite" : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 font-semibold text-muted",
          size === "xl" ? "text-lg" : "text-[0.55em]",
        )}
      >
        {negative ? "\u2212" : ""}
        {currencyPrefix(locale).trim()}
      </span>
      <span aria-hidden="true" className="relative inline-flex overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={number}
            initial={{ y: "35%", opacity: 0.2 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-35%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
            className={cn("block whitespace-nowrap", isEmpty ? "text-muted/60" : moneyToneClass[tone])}
          >
            {number}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}
