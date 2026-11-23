"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { formatMonthLabel, toUiLocale } from "@/components/ui/format";
import { MonthSwitcher } from "@/components/ui/month-switcher";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { ReportPeriod } from "@/lib/reports";
import { cn } from "@/lib/utils";

const arrow =
  "relative grid size-9 place-items-center rounded-chip text-muted transition-colors outline-none before:absolute before:-inset-1 before:content-[''] hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-ring aria-disabled:pointer-events-none aria-disabled:opacity-35";

/** Bulanan / Tahunan toggle plus the matching month or year stepper (URL driven). */
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
  const router = useRouter();
  const currentYear = currentMonth.slice(0, 4);

  function setMode(mode: "month" | "year") {
    if (mode === period.mode) return;
    const year = period.mode === "year" ? period.key : period.key.slice(0, 4);
    const month = mode === "month" ? (year === currentYear ? currentMonth : `${year}-12`) : null;
    router.push(mode === "year" ? `${basePath}?mode=year&year=${year}` : `${basePath}?month=${month}`, { scroll: false });
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <SegmentedControl
        label={t("periodLabel")}
        value={period.mode}
        onChange={setMode}
        options={[
          { value: "month", label: t("monthly") },
          { value: "year", label: t("yearly") },
        ]}
        className="w-auto min-w-[13rem]"
        size="sm"
      />
      {period.mode === "month" ? (
        <MonthSwitcher value={period.key} basePath={basePath} max={currentMonth} />
      ) : (
        <YearSwitcher year={period.key} max={currentYear} basePath={basePath} />
      )}
    </div>
  );
}

function YearSwitcher({ year, max, basePath }: { year: string; max: string; basePath: string }) {
  const t = useTranslations("laporan");
  const prev = String(Number(year) - 1);
  const next = String(Number(year) + 1);
  const nextDisabled = next > max;
  return (
    <div className="inline-flex h-10 items-center gap-0.5 rounded-control border border-line bg-surface px-0.5">
      <Link href={`${basePath}?mode=year&year=${prev}`} aria-label={t("prevYear")} className={arrow} scroll={false}>
        <ChevronLeft className="size-[18px]" aria-hidden="true" />
      </Link>
      <span aria-live="polite" className="min-w-[7.5rem] px-1 text-center text-[13px] font-semibold text-text tabular-nums">
        {year}
      </span>
      <Link
        href={`${basePath}?mode=year&year=${next}`}
        aria-label={t("nextYear")}
        aria-disabled={nextDisabled || undefined}
        tabIndex={nextDisabled ? -1 : undefined}
        className={arrow}
        scroll={false}
      >
        <ChevronRight className="size-[18px]" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** "November 2026" or "2026" for headings. */
export function usePeriodLabel(period: ReportPeriod) {
  const locale = toUiLocale(useLocale());
  return period.mode === "year" ? period.key : formatMonthLabel(period.key, locale);
}
