"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronRight, HandCoins, ReceiptText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { toTodayItems } from "@/components/beranda/map-today";
import { CatatButton } from "@/components/quick-add/catat-button";
import { useCatat } from "@/components/quick-add/catat-provider";
import { AmountText } from "@/components/ui/amount-display";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAmountNumber, toUiLocale } from "@/components/ui/format";
import { ListRow, RowAvatar, type RowTone } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";

export type TodayItem = {
  id: string;
  kind: "expense" | "income" | "transfer" | "debt";
  /** Money flow from the user's point of view. */
  flow: "in" | "out" | "move";
  title: string;
  /** E.g. "Makan · GoPay". */
  subtitle: string;
  amount: number;
};

/** Beranda shows at most this many of today's rows; the rest are one tap away in Riwayat. */
export const TODAY_LIMIT = 5;

const avatarTone: Record<TodayItem["kind"], RowTone> = {
  expense: "expense",
  income: "income",
  transfer: "transfer",
  debt: "debt",
};

function RowAmount({ amount, flow }: { amount: number; flow: TodayItem["flow"] }) {
  const locale = toUiLocale(useLocale());
  const sign = flow === "in" ? "+" : flow === "out" ? "\u2212" : "";
  return (
    <span
      className={cn(
        "tabular-nums tracking-tight",
        flow === "in" ? "text-income" : flow === "out" ? "text-expense" : "text-transfer",
      )}
    >
      {sign}
      {formatAmountNumber(amount, locale)}
    </span>
  );
}

export function TodayList({
  items,
  spentTotal,
  total,
  date,
  seeAllHref = "/history",
}: {
  /** Today's newest rows from the server (at most TODAY_LIMIT are shown). */
  items: TodayItem[];
  /** Expenses today, shown as the day total. */
  spentTotal: number;
  /** All of today's rows on the server (defaults to items.length). */
  total?: number;
  /** Today (WIB, yyyy-MM-dd): rows saved in this tab for this day show at once. */
  date?: string;
  seeAllHref?: string;
}) {
  const t = useTranslations("beranda");
  const tr = useTranslations("riwayat");
  const { pending } = useCatat();

  // Rows saved from the Catat sheet show at once, until the refreshed page arrives.
  const fresh = date ? pending.filter((item) => item.entry.date === date) : [];
  const movedAway = new Set(pending.filter((item) => item.entry.date !== date).map((item) => item.entry.key));
  const freshItems = toTodayItems(
    fresh.map((item) => item.entry),
    tr,
  );
  const freshIds = new Set(freshItems.map((item) => item.id));
  const added = fresh.filter((item) => item.isNew && !items.some((row) => row.id === item.entry.key));
  const rows = [...freshItems, ...items.filter((item) => !freshIds.has(item.id) && !movedAway.has(item.id))];
  const shown = rows.slice(0, TODAY_LIMIT);
  const count = (total ?? items.length) + added.length;
  const spent =
    spentTotal +
    added.filter((item) => item.entry.kind === "expense").reduce((sum, item) => sum + item.entry.amount, 0);
  const more = count - shown.length;

  return (
    <section aria-labelledby="today-heading" className="grid gap-1">
      <SectionHeader
        id="today-heading"
        title={t("today")}
        meta={shown.length ? <AmountText value={-spent} tone="muted" /> : undefined}
        action={shown.length ? { label: t("seeAll"), href: seeAllHref } : undefined}
      />
      {shown.length ? (
        <>
          <ul className="divide-y divide-line" data-testid="today-list">
            {shown.map((item) => (
              <li key={item.id}>
                <ListRow
                  leading={
                    <RowAvatar
                      tone={avatarTone[item.kind]}
                      label={item.title}
                      icon={
                        item.kind === "transfer" ? ArrowLeftRight : item.kind === "debt" ? HandCoins : undefined
                      }
                    />
                  }
                  title={item.title}
                  subtitle={item.subtitle}
                  trailing={<RowAmount amount={item.amount} flow={item.flow} />}
                />
              </li>
            ))}
          </ul>
          {more > 0 ? (
            <Link
              href={seeAllHref}
              className="flex min-h-11 items-center justify-between border-t border-line text-[13px] font-medium text-muted outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t("todayMore", { count: more })}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </>
      ) : (
        <EmptyState
          compact
          icon={ReceiptText}
          title={t("todayEmptyTitle")}
          body={t("todayEmptyBody")}
          action={<CatatButton size="sm">{t("recordNow")}</CatatButton>}
        />
      )}
    </section>
  );
}
