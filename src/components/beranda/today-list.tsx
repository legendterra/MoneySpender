import { ArrowLeftRight, HandCoins, ReceiptText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CatatButton } from "@/components/quick-add/catat-button";
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
  seeAllHref = "/history",
}: {
  items: TodayItem[];
  /** Expenses today, shown as the day total. */
  spentTotal: number;
  seeAllHref?: string;
}) {
  const t = useTranslations("beranda");

  return (
    <section aria-labelledby="today-heading" className="grid gap-1">
      <SectionHeader
        id="today-heading"
        title={t("today")}
        meta={items.length ? <AmountText value={-spentTotal} tone="muted" /> : undefined}
        action={items.length ? { label: t("seeAll"), href: seeAllHref } : undefined}
      />
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((item) => (
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
      ) : (
        <EmptyState
          compact
          icon={ReceiptText}
          title={t("todayEmptyTitle")}
          body={t("todayEmptyBody")}
          action={<CatatButton size="sm">{t("recordNow")}</CatatButton>}
          className="rounded-control border border-dashed border-line-strong"
        />
      )}
    </section>
  );
}
