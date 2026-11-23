"use client";

import { useLocale, useTranslations } from "next-intl";

import { LinkTabs, PlainStepper } from "@/components/flat/controls";
import { addMonthsToKey, formatMonthLabel, toUiLocale } from "@/components/ui/format";
import type { ReportPeriod } from "@/lib/reports";
import { cn } from "@/lib/utils";

/** Bulanan / Tahunan text tabs plus a plain month or year stepper (URL driven). */
export function PeriodBar({
  period,
  currentMonth,
  basePath = "/reports",
  className,
}: {
  period: ReportPeriod;
  currentMonth: string;
  basePath?: string;
  className?: string;
}) {
  const t = useTranslations("laporan");
  const locale = toUiLocale(useLocale());
  const currentYear = currentMonth.slice(0, 4);
  const year = period.mode === "year" ? period.key : period.key.slice(0, 4);
  const monthForYear = year === currentYear ? currentMonth : `${year}-12`;

  let stepper: React.ReactNode;
  if (period.mode === "month") {
    const prev = addMonthsToKey(period.key, -1);
    const next = addMonthsToKey(period.key, 1);
    stepper = (
      <PlainStepper
        label={formatMonthLabel(period.key, locale)}
        prev={{ href: `${basePath}?month=${prev}` }}
        next={next <= currentMonth ? { href: `${basePath}?month=${next}` } : null}
        prevLabel={t("prevMonth")}
        nextLabel={t("nextMonth")}
      />
    );
  } else {
    const prev = String(Number(year) - 1);
    const next = String(Number(year) + 1);
    stepper = (
      <PlainStepper
        label={year}
        prev={{ href: `${basePath}?mode=year&year=${prev}` }}
        next={next <= currentYear ? { href: `${basePath}?mode=year&year=${next}` } : null}
        prevLabel={t("prevYear")}
        nextLabel={t("nextYear")}
      />
    );
  }

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line", className)}>
      <LinkTabs
        label={t("periodLabel")}
        value={period.mode}
        className="border-b-0"
        items={[
          { value: "month", label: t("monthly"), href: `${basePath}?month=${monthForYear}` },
          { value: "year", label: t("yearly"), href: `${basePath}?mode=year&year=${year}` },
        ]}
      />
      <div className="pb-1">{stepper}</div>
    </div>
  );
}

/** "November 2026" or "2026" for headings. */
export function usePeriodLabel(period: ReportPeriod) {
  const locale = toUiLocale(useLocale());
  return period.mode === "year" ? period.key : formatMonthLabel(period.key, locale);
}
