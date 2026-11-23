"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, formatShortMonthLabel, toUiLocale, type UiLocale } from "@/components/ui/format";
import { useIsClient } from "@/components/ui/use-media-query";
import type { TrendPoint } from "@/lib/reports";

function axisMoney(value: number, locale: UiLocale) {
  return formatMoney(value, { locale, compact: true }).replace(/^(Rp|IDR\s)/, "");
}

function monthTick(key: string, locale: UiLocale, short: boolean) {
  const label = formatShortMonthLabel(key, locale);
  // "Nov 2026" -> "Nov" (year only when the window crosses years is noise on a 6-bar chart)
  return short ? label.split(" ")[0] : label;
}

function TrendTooltip({
  active,
  payload,
  locale,
  labels,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  locale: UiLocale;
  labels: { income: string; expense: string; net: string };
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as TrendPoint | undefined;
  if (!point) return null;
  const net = point.income - point.expense;
  return (
    <div className="min-w-[11rem] rounded-control border border-line bg-surface px-3 py-2.5 text-[12px] shadow-pop">
      <p className="mb-1.5 font-semibold text-text capitalize">{formatShortMonthLabel(point.key, locale)}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
        <dt className="flex items-center gap-1.5 text-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-income" />
          {labels.income}
        </dt>
        <dd className="text-right font-semibold text-text">{formatMoney(point.income, { locale })}</dd>
        <dt className="flex items-center gap-1.5 text-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-expense" />
          {labels.expense}
        </dt>
        <dd className="text-right font-semibold text-text">{formatMoney(point.expense, { locale })}</dd>
        <dt className="border-t border-line pt-1 text-muted">{labels.net}</dt>
        <dd className={`border-t border-line pt-1 text-right font-semibold ${net < 0 ? "text-expense" : "text-text"}`}>
          {formatMoney(net, { locale, sign: "always" })}
        </dd>
      </dl>
    </div>
  );
}

/** Monthly income vs expense bars; the selected month is solid, context months are faded. */
export function TrendChart({ points, highlightSelected }: { points: TrendPoint[]; highlightSelected: boolean }) {
  const t = useTranslations("laporan");
  const locale = toUiLocale(useLocale());
  const isClient = useIsClient();
  const labels = { income: t("income"), expense: t("expense"), net: t("net") };
  const shortTicks = points.length > 6;
  const max = Math.max(1, ...points.map((p) => Math.max(p.income, p.expense)));
  const hasData = points.some((p) => p.income > 0 || p.expense > 0);
  const opacity = (point: TrendPoint) => (!highlightSelected || point.selected ? 1 : 0.38);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-4 text-[12px] font-medium text-muted" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-income" />
          {labels.income}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-expense" />
          {labels.expense}
        </span>
      </div>
      <div className="relative h-[220px] md:h-[260px]" role="img" aria-label={t("trendAria")}>
        {isClient ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barGap={3} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
              <XAxis
                dataKey="key"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                tickFormatter={(key: string) => monthTick(key, locale, true)}
              />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                tickCount={4}
                domain={[0, Math.ceil(max * 1.08)]}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickFormatter={(value: number) => axisMoney(value, locale)}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
                content={(props) => (
                  <TrendTooltip active={props.active} payload={props.payload} locale={locale} labels={labels} />
                )}
              />
              <Bar dataKey="income" name={labels.income} radius={[4, 4, 0, 0]} maxBarSize={shortTicks ? 14 : 22} isAnimationActive={false}>
                {points.map((point) => (
                  <Cell key={point.key} fill="var(--income)" fillOpacity={opacity(point)} />
                ))}
              </Bar>
              <Bar dataKey="expense" name={labels.expense} radius={[4, 4, 0, 0]} maxBarSize={shortTicks ? 14 : 22} isAnimationActive={false}>
                {points.map((point) => (
                  <Cell key={point.key} fill="var(--expense)" fillOpacity={opacity(point)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : null}
        {!hasData ? (
          <p className="absolute inset-0 grid place-items-center text-[13px] text-muted">{t("trendEmpty")}</p>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>{t("trendAria")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("monthColumn")}</th>
            <th scope="col">{labels.income}</th>
            <th scope="col">{labels.expense}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{formatShortMonthLabel(point.key, locale)}</th>
              <td>{formatMoney(point.income, { locale })}</td>
              <td>{formatMoney(point.expense, { locale })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
