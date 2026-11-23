"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Download, FileUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ImportSheet } from "@/components/pengaturan/import-sheet";
import { CategoryBreakdown, TopMerchants } from "@/components/reports/breakdown";
import { PeriodBar, usePeriodLabel } from "@/components/reports/period-bar";
import { TrendChart } from "@/components/reports/trend-chart";
import { AmountText } from "@/components/ui/amount-display";
import { buttonVariants } from "@/components/ui/button-styles";
import { Button } from "@/components/ui/button";
import { formatMonthLabel, toUiLocale } from "@/components/ui/format";
import { SectionHeader } from "@/components/ui/section-header";
import type { ReportsPageData } from "@/lib/data-reports";
import { exportQuery } from "@/lib/reports";
import { cn } from "@/lib/utils";

const card = "rounded-sheet border border-line bg-surface p-5 md:p-6";

export function ReportsView(data: ReportsPageData) {
  const t = useTranslations("laporan");
  const locale = toUiLocale(useLocale());
  const { period, summary } = data;
  const periodLabel = usePeriodLabel(period);
  const previousLabel = period.mode === "year" ? data.previous.key : formatMonthLabel(data.previous.key, locale).split(" ")[0];
  const [importOpen, setImportOpen] = React.useState(false);
  const isEmpty = summary.count === 0;

  return (
    <div className="mx-auto grid max-w-2xl gap-6 lg:max-w-none">
      <PeriodBar period={period} currentMonth={data.currentMonth} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-6">
          <section aria-labelledby="report-summary-label" className={card}>
            <p id="report-summary-label" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
              {t("netLabel", { period: periodLabel })}
            </p>
            <AmountText
              value={summary.net}
              sign="always"
              tone={summary.net < 0 ? "expense" : "neutral"}
              className="mt-1.5 block text-[38px] leading-[1.1] font-bold md:text-[44px]"
            />
            <p className="mt-1.5 text-[13px] text-muted">
              {isEmpty
                ? t("emptyPeriod")
                : summary.income > 0
                  ? t("savingsRate", { rate: summary.savingsRate })
                  : t("noIncome")}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <Stat label={t("income")} value={summary.income} tone="income" change={data.incomeChange} previous={previousLabel} />
              <Stat
                label={t("expense")}
                value={summary.expense}
                tone="expense"
                change={data.expenseChange}
                previous={previousLabel}
                invert
              />
            </dl>
            <p className="mt-3 text-[12px] text-muted">
              {t("avgDaily")} <AmountText value={summary.avgDailyExpense} className="font-semibold text-text" />
              <span aria-hidden="true"> · </span>
              {t("txCount", { count: summary.count })}
            </p>
          </section>

          <section aria-labelledby="trend-heading" className={cn(card, "grid gap-3")}>
            <SectionHeader
              id="trend-heading"
              title={t("trendTitle")}
              meta={period.mode === "year" ? period.key : t("lastSixMonths")}
            />
            <TrendChart points={data.trend} highlightSelected={period.mode === "month"} />
          </section>
        </div>

        <div className="grid min-w-0 gap-6">
          <section aria-labelledby="categories-heading" className={cn(card, "grid gap-3")}>
            <SectionHeader
              id="categories-heading"
              title={t("categoriesTitle")}
              meta={summary.expense ? <AmountText value={summary.expense} tone="muted" /> : undefined}
            />
            <CategoryBreakdown rows={data.categories} />
          </section>

          <section aria-labelledby="merchants-heading" className={cn(card, "grid gap-1")}>
            <SectionHeader id="merchants-heading" title={t("merchantsTitle")} />
            <p className="-mt-1 mb-1 text-[12px] text-muted">{t("merchantsHint")}</p>
            <TopMerchants rows={data.merchants} />
          </section>

          <section aria-labelledby="data-heading" className={cn(card, "grid gap-3")}>
            <SectionHeader id="data-heading" title={t("dataTitle")} />
            <p className="-mt-1 text-[13px] leading-5 text-muted">{t("dataBody")}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <a
                href={`/api/export/transactions?${exportQuery(period)}`}
                className={cn(buttonVariants({ variant: "secondary" }), "justify-start")}
              >
                <Download aria-hidden="true" />
                {t("exportPeriod", { period: periodLabel })}
              </a>
              <Button variant="secondary" className="justify-start" onClick={() => setImportOpen(true)}>
                <FileUp aria-hidden="true" />
                {t("importButton")}
              </Button>
            </div>
            <a
              href="/api/export/transactions"
              className="justify-self-start rounded-chip text-[13px] font-semibold text-primary-ink outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t("exportAll")}
            </a>
          </section>
        </div>
      </div>

      <ImportSheet open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  change,
  previous,
  invert = false,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
  change: number | null;
  previous: string;
  /** For expenses, going up is the bad direction. */
  invert?: boolean;
}) {
  const t = useTranslations("laporan");
  const up = (change ?? 0) > 0;
  const bad = change !== null && change !== 0 && (invert ? up : !up);
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-[12px] font-medium text-muted">{label}</dt>
      <dd className="grid gap-0.5">
        <AmountText value={value} tone={tone} className="truncate text-[18px] font-bold" />
        <span className="flex items-center gap-1 text-[12px] text-muted">
          {change === null ? (
            t("noBaseline", { period: previous })
          ) : change === 0 ? (
            t("sameAs", { period: previous })
          ) : (
            <>
              <Icon className={cn("size-3.5 shrink-0", bad ? "text-expense" : "text-income")} aria-hidden="true" />
              <span className="truncate">
                {t(up ? "changeUp" : "changeDown", { pct: Math.abs(change), period: previous })}
              </span>
            </>
          )}
        </span>
      </dd>
    </div>
  );
}
