"use client";

import { useLocale, useTranslations } from "next-intl";

import { AmountText } from "@/components/ui/amount-display";
import { toUiLocale } from "@/components/ui/format";
import { ListRow, RowAvatar } from "@/components/ui/list-row";
import type { CategoryShare, MerchantTotal } from "@/lib/reports";

/** Shades of the expense color, strongest first; opaque so segments never blend. */
const SHADES = [100, 78, 60, 46, 34, 24, 16];

function shade(index: number) {
  const pct = SHADES[Math.min(index, SHADES.length - 1)];
  return `color-mix(in srgb, var(--expense) ${pct}%, var(--surface-2))`;
}

function formatShare(value: number, locale: "id" | "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", { maximumFractionDigits: 1 }).format(value);
}

/** One stacked bar plus a ranked list: calmer and easier to read than a pie. */
export function CategoryBreakdown({ rows }: { rows: CategoryShare[] }) {
  const t = useTranslations("laporan");
  const locale = toUiLocale(useLocale());
  if (!rows.length) {
    return <p className="py-6 text-center text-[13px] text-muted">{t("categoriesEmpty")}</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        {rows.map((row, index) => (
          <span
            key={row.key}
            className="h-full first:rounded-l-full last:rounded-r-full [&+&]:border-l-2 [&+&]:border-surface"
            style={{ width: `${Math.max(row.share, 0.8)}%`, background: shade(index) }}
          />
        ))}
      </div>
      <ul className="grid gap-3.5">
        {rows.map((row, index) => (
          <li key={row.key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: shade(index) }} />
                <span className="truncate font-medium text-text">{row.name}</span>
              </span>
              <AmountText value={row.total} className="shrink-0 font-semibold" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, row.share)}%`, background: shade(index) }} />
              </div>
              <span className="w-24 shrink-0 text-right text-[12px] text-muted tabular-nums">
                {t("shareMeta", { share: formatShare(row.share, locale), count: row.count })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TopMerchants({ rows }: { rows: MerchantTotal[] }) {
  const t = useTranslations("laporan");
  if (!rows.length) {
    return <p className="py-6 text-center text-[13px] text-muted">{t("merchantsEmpty")}</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => (
        <li key={row.name}>
          <ListRow
            leading={<RowAvatar label={row.name} tone="expense" />}
            title={row.name}
            subtitle={
              row.topCategory
                ? t("merchantMeta", { count: row.count, category: row.topCategory })
                : t("merchantCount", { count: row.count })
            }
            trailing={<AmountText value={row.total} />}
          />
        </li>
      ))}
    </ul>
  );
}
