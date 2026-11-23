"use client";

import { useLocale, useTranslations } from "next-intl";

import { AmountText } from "@/components/ui/amount-display";
import { toUiLocale } from "@/components/ui/format";
import type { CategoryShare, MerchantTotal } from "@/lib/reports";

/** Shades of the expense color, strongest first; opaque so segments never blend. */
const SHADES = [100, 78, 60, 46, 34, 24, 16];

export function shade(index: number) {
  const pct = SHADES[Math.min(index, SHADES.length - 1)];
  return `color-mix(in srgb, var(--expense) ${pct}%, var(--bg))`;
}

function formatShare(value: number, locale: "id" | "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", { maximumFractionDigits: 1 }).format(value);
}

/** Thin stacked bar of the whole month's expense split (top categories first). */
export function ShareBar({ rows }: { rows: CategoryShare[] }) {
  if (!rows.length) return null;
  return (
    <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
      {rows.map((row, index) => (
        <span
          key={row.key}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${Math.max(row.share, 0.8)}%`, background: shade(index) }}
        />
      ))}
    </div>
  );
}

/** Ranked category rows with a thin share line; plain rows with dividers. */
export function CategoryRows({ rows, startIndex = 0 }: { rows: CategoryShare[]; startIndex?: number }) {
  const t = useTranslations("laporan");
  const locale = toUiLocale(useLocale());
  if (!rows.length) {
    return <p className="border-y border-line py-6 text-center text-[13px] text-muted">{t("categoriesEmpty")}</p>;
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {rows.map((row, index) => (
        <li key={row.key} className="grid gap-1.5 py-3">
          <div className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: shade(startIndex + index) }}
              />
              <span className="truncate font-medium text-text">{row.name}</span>
            </span>
            <AmountText value={row.total} className="shrink-0 font-semibold" />
          </div>
          <div className="flex items-center gap-3 pl-4">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, row.share)}%`, background: shade(startIndex + index) }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-[12px] text-muted tabular-nums">
              {t("shareMeta", { share: formatShare(row.share, locale), count: row.count })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MerchantRows({ rows, startRank = 1 }: { rows: MerchantTotal[]; startRank?: number }) {
  const t = useTranslations("laporan");
  if (!rows.length) {
    return <p className="border-y border-line py-6 text-center text-[13px] text-muted">{t("merchantsEmpty")}</p>;
  }
  return (
    <ol className="divide-y divide-line border-y border-line">
      {rows.map((row, index) => (
        <li key={row.name} className="flex min-h-[60px] items-center gap-3 py-2.5">
          <span aria-hidden="true" className="w-5 shrink-0 text-[13px] font-semibold text-muted tabular-nums">
            {startRank + index}
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="truncate text-[15px] font-medium text-text">{row.name}</span>
            <span className="truncate text-[12px] text-muted">
              {row.topCategory
                ? t("merchantMeta", { count: row.count, category: row.topCategory })
                : t("merchantCount", { count: row.count })}
            </span>
          </span>
          <AmountText value={row.total} className="shrink-0 text-[14px] font-semibold" />
        </li>
      ))}
    </ol>
  );
}
