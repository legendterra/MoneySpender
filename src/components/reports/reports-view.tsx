"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Download, FileUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Eyebrow } from "@/components/flat/layout";
import { ImportSheet } from "@/components/pengaturan/import-sheet";
import { CategoryRows, MerchantRows, ShareBar } from "@/components/reports/breakdown";
import { PeriodBar, usePeriodLabel } from "@/components/reports/period-bar";
import { TrendChart } from "@/components/reports/trend-chart";
import { AmountText } from "@/components/ui/amount-display";
import { formatMonthLabel, toUiLocale } from "@/components/ui/format";
import { Pagination } from "@/components/ui/pagination";
import type { ReportsPageData } from "@/lib/data-reports";
import { pageHref } from "@/lib/paging";
import { exportQuery, reportQuery } from "@/lib/reports";
import { cn } from "@/lib/utils";

const textAction =
  "inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-text outline-none transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function ReportsView(data: ReportsPageData) {
  const t = useTranslations("laporan");
  const locale = toUiLocale(useLocale());
  const { period, summary } = data;
  const periodLabel = usePeriodLabel(period);
  const previousLabel =
    period.mode === "year" ? data.previous.key : formatMonthLabel(data.previous.key, locale).split(" ")[0];
  const [importOpen, setImportOpen] = React.useState(false);
  const isEmpty = summary.count === 0;

  if (data.list) return <FullList data={data} periodLabel={periodLabel} />;

  return (
    <div className="mx-auto grid max-w-2xl gap-8 lg:max-w-5xl">
      <PeriodBar period={period} currentMonth={data.currentMonth} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
        <div className="grid min-w-0 content-start gap-10">
          <section aria-labelledby="report-summary-label" className="grid gap-1.5">
            <Eyebrow id="report-summary-label">{t("netLabel", { period: periodLabel })}</Eyebrow>
            <AmountText
              value={summary.net}
              sign="always"
              tone={summary.net < 0 ? "expense" : "neutral"}
              className="block text-[40px] leading-[1.08] font-bold tracking-tight md:text-[46px]"
            />
            <p className="text-[13px] text-muted">
              {isEmpty
                ? t("emptyPeriod")
                : summary.income > 0
                  ? t("savingsRate", { rate: summary.savingsRate })
                  : t("noIncome")}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-6">
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
            <p className="mt-4 text-[13px] text-muted">
              {t("avgDaily")} <AmountText value={summary.avgDailyExpense} className="font-semibold text-text" />
              <span aria-hidden="true"> · </span>
              {t("txCount", { count: summary.count })}
            </p>
          </section>

          <section aria-labelledby="trend-heading" className="grid gap-3 border-t border-line pt-6">
            <BlockHeader id="trend-heading" title={t("trendTitle")} meta={period.mode === "year" ? period.key : t("lastSixMonths")} />
            <TrendChart points={data.trend} highlightSelected={period.mode === "month"} />
          </section>
        </div>

        <div className="grid min-w-0 content-start gap-10">
          <section aria-labelledby="categories-heading" className="grid gap-3 border-t border-line pt-6 lg:border-t-0 lg:pt-0">
            <BlockHeader
              id="categories-heading"
              title={t("categoriesTitle")}
              meta={summary.expense ? <AmountText value={summary.expense} tone="muted" /> : undefined}
            />
            <ShareBar rows={data.categoryBar} />
            <CategoryRows rows={data.categories} />
            {data.categoryCount > data.categories.length ? (
              <Link href={pageHref("/reports", 1, reportQuery(period, "kategori"))} className={cn(textAction, "text-[13px]")}>
                {t("seeAll", { count: data.categoryCount })}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </section>

          <section aria-labelledby="merchants-heading" className="grid gap-3 border-t border-line pt-6">
            <BlockHeader id="merchants-heading" title={t("merchantsTitle")} description={t("merchantsHint")} />
            <MerchantRows rows={data.merchants} />
            {data.merchantCount > data.merchants.length ? (
              <Link href={pageHref("/reports", 1, reportQuery(period, "tempat"))} className={cn(textAction, "text-[13px]")}>
                {t("seeAll", { count: data.merchantCount })}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </section>

          <section aria-labelledby="data-heading" className="grid gap-1 border-t border-line pt-6">
            <BlockHeader id="data-heading" title={t("dataTitle")} description={t("dataBody")} />
            <div className="mt-1 grid divide-y divide-line border-y border-line">
              <a href={`/api/export/transactions?${exportQuery(period)}`} className={textAction}>
                <Download className="size-[18px] text-muted" aria-hidden="true" />
                {t("exportPeriod", { period: periodLabel })}
              </a>
              <button type="button" className={cn(textAction, "text-left")} onClick={() => setImportOpen(true)}>
                <FileUp className="size-[18px] text-muted" aria-hidden="true" />
                {t("importButton")}
              </button>
              <a href="/api/export/transactions" className={cn(textAction, "font-medium text-muted")}>
                <Download className="size-[18px]" aria-hidden="true" />
                {t("exportAll")}
              </a>
            </div>
          </section>
        </div>
      </div>

      <ImportSheet open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

function FullList({ data, periodLabel }: { data: ReportsPageData; periodLabel: string }) {
  const t = useTranslations("laporan");
  const list = data.list!;
  const title = list.kind === "kategori" ? t("allCategoriesTitle") : t("allMerchantsTitle");
  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Link href={pageHref("/reports", 1, reportQuery(data.period))} className={cn(textAction, "justify-self-start text-[13px] text-muted")}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("backToReport", { period: periodLabel })}
      </Link>
      <div className="grid gap-1">
        <h2 className="text-[22px] leading-tight font-bold tracking-tight text-text">{title}</h2>
        <p className="text-[13px] text-muted">
          <span className="capitalize">{periodLabel}</span>
          <span aria-hidden="true"> · </span>
          {t("listTotal", { count: list.totalItems })}
          {data.summary.expense ? (
            <>
              <span aria-hidden="true"> · </span>
              <AmountText value={data.summary.expense} tone="muted" />
            </>
          ) : null}
        </p>
      </div>
      {list.kind === "kategori" ? (
        <CategoryRows rows={list.categories} startIndex={list.offset} />
      ) : (
        <MerchantRows rows={list.merchants} startRank={list.offset + 1} />
      )}
      <Pagination
        page={list.page}
        totalPages={list.totalPages}
        pathname="/reports"
        query={reportQuery(data.period, list.kind)}
      />
    </div>
  );
}

function BlockHeader({
  id,
  title,
  meta,
  description,
}: {
  id: string;
  title: string;
  meta?: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="grid gap-0.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[17px] font-semibold tracking-tight text-text">
          {title}
        </h2>
        {meta ? <span className="shrink-0 text-[13px] text-muted tabular-nums">{meta}</span> : null}
      </div>
      {description ? <p className="text-[13px] leading-5 text-muted">{description}</p> : null}
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
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className="grid gap-0.5">
        <AmountText value={value} tone={tone} className="truncate text-[20px] font-bold tracking-tight" />
        <span className="flex items-center gap-1 text-[12px] text-muted">
          {change === null ? (
            t("noBaseline", { period: previous })
          ) : change === 0 ? (
            t("sameAs", { period: previous })
          ) : (
            <>
              <Icon className={cn("size-3.5 shrink-0", bad ? "text-expense" : "text-income")} aria-hidden="true" />
              <span className="truncate">{t(up ? "changeUp" : "changeDown", { pct: Math.abs(change), period: previous })}</span>
            </>
          )}
        </span>
      </dd>
    </div>
  );
}
