import { useLocale, useTranslations } from "next-intl";

import { AmountText } from "@/components/ui/amount-display";
import { formatMoney, toUiLocale } from "@/components/ui/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

export type AllowanceHeroProps = {
  /** Safe amount for today, computed at the start of the day. */
  allowanceToday: number;
  /** Expenses recorded today (excludes transfers). */
  spentToday: number;
  /** allowanceToday - spentToday; negative means over. */
  remainingToday: number;
  /** Allowance for tomorrow after today's spending. */
  tomorrowAllowance: number;
  /** Days left in the month including today. */
  daysLeft: number;
  monthIncome: number;
  monthExpense: number;
  className?: string;
};

export function AllowanceHero({
  allowanceToday,
  spentToday,
  remainingToday,
  tomorrowAllowance,
  daysLeft,
  monthIncome,
  monthExpense,
  className,
}: AllowanceHeroProps) {
  const t = useTranslations("beranda");
  const locale = toUiLocale(useLocale());
  const over = remainingToday < 0;
  const money = (value: number) => formatMoney(value, { locale });

  return (
    <section
      aria-labelledby="allowance-label"
      className={cn("pt-1", className)}
    >
      <p
        id="allowance-label"
        className={cn(
          "text-[11px] font-semibold tracking-[0.08em] uppercase",
          over ? "text-expense" : "text-muted",
        )}
      >
        {over ? t("overLabel") : t("allowanceLabel")}
      </p>
      <AmountText
        value={remainingToday}
        tone={over ? "expense" : "neutral"}
        className="mt-1.5 block text-[38px] leading-[1.1] font-bold md:text-[44px]"
      />
      <p className="mt-1.5 text-[13px] text-muted">
        {over
          ? t("overBy", { amount: money(-remainingToday), allowance: money(allowanceToday) })
          : t("usedOf", { spent: money(spentToday), allowance: money(allowanceToday) })}
        <span aria-hidden="true"> · </span>
        {daysLeft > 1 ? t("daysLeft", { count: daysLeft }) : t("lastDay")}
      </p>
      <ProgressBar
        value={spentToday}
        max={Math.max(allowanceToday, 1)}
        label={t("allowanceProgress")}
        className="mt-4"
      />
      {over && daysLeft > 1 ? (
        <p className="mt-2.5 text-[13px] font-medium text-text">
          {t("tomorrow", { amount: money(tomorrowAllowance) })}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-3.5 text-[13px]">
        <p className="flex min-w-0 items-baseline gap-1.5 text-muted">
          {t("monthIncome")}
          <AmountText value={monthIncome} tone="income" compact className="font-semibold" />
        </p>
        <p className="flex min-w-0 items-baseline gap-1.5 text-muted">
          {t("monthExpense")}
          <AmountText value={monthExpense} tone="expense" compact className="font-semibold" />
        </p>
      </div>
    </section>
  );
}

export function MonthHero({
  monthLabel,
  income,
  expense,
  className,
}: {
  monthLabel: string;
  income: number;
  expense: number;
  className?: string;
}) {
  const t = useTranslations("beranda");
  const net = income - expense;
  return (
    <section
      aria-labelledby="month-hero-label"
      className={cn("pt-1", className)}
    >
      <p id="month-hero-label" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
        {t("pastMonthTitle", { month: monthLabel })}
      </p>
      <AmountText
        value={net}
        sign="always"
        tone={net < 0 ? "expense" : "neutral"}
        className="mt-1.5 block text-[38px] leading-[1.1] font-bold md:text-[44px]"
      />
      <p className="mt-1.5 text-[13px] text-muted">{t("pastMonthBody")}</p>
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-3.5 text-[13px]">
        <p className="flex items-baseline gap-1.5 text-muted">
          {t("monthIncome")}
          <AmountText value={income} tone="income" compact className="font-semibold" />
        </p>
        <p className="flex items-baseline gap-1.5 text-muted">
          {t("monthExpense")}
          <AmountText value={expense} tone="expense" compact className="font-semibold" />
        </p>
      </div>
    </section>
  );
}
