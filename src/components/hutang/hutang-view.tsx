"use client";

import * as React from "react";
import { ChevronDown, HandCoins, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { DebtSheet, type PayWallet } from "@/components/hutang/debt-sheet";
import { useCatat } from "@/components/quick-add/catat-provider";
import { useLivePatches } from "@/components/quick-add/use-live-patches";
import { useDeleteWithUndo } from "@/components/riwayat/use-delete-with-undo";
import { AmountText } from "@/components/ui/amount-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateKey, formatMoney, toUiLocale } from "@/components/ui/format";
import { RowAvatar } from "@/components/ui/list-row";
import { Pagination } from "@/components/ui/pagination";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs } from "@/components/ui/tabs";
import {
  applyDebtPatches,
  entryToDebtItem,
  type DebtItem,
  type DebtPatch,
  type DebtSideSummary,
} from "@/lib/debt-board";
import type { DebtDirection } from "@/lib/types";
import { cn } from "@/lib/utils";

type PagedDebts = { items: DebtItem[]; page: number; totalPages: number };

export type HutangViewData = {
  today: string;
  wallets: PayWallet[];
  summary: Record<DebtDirection, DebtSideSummary>;
  active: PagedDebts;
  settled: PagedDebts;
  /** Debt opened from Riwayat (?debt=), possibly not on this page. */
  focus: DebtItem | null;
};

/** Keeps ?debt= in the address bar without a server round trip. */
function syncDebtParam(debtId: string | null) {
  const url = new URL(window.location.href);
  if (debtId) url.searchParams.set("debt", debtId);
  else url.searchParams.delete("debt");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}

export function HutangView({
  data,
  tab,
  initialDebtId,
  settledOpen,
}: {
  data: HutangViewData;
  tab: DebtDirection;
  initialDebtId: string | null;
  /** The settled list starts open (its pager was used). */
  settledOpen: boolean;
}) {
  const t = useTranslations("hutang");
  const locale = toUiLocale(useLocale());
  const catat = useCatat();
  const [selectedId, setSelectedId] = React.useState<string | null>(initialDebtId);
  const [showSettled, setShowSettled] = React.useState(settledOpen);
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(() => new Set());
  const [patches, pushPatch] = useLivePatches<DebtPatch>();

  const remove = useDeleteWithUndo(
    React.useCallback((key: string, hide: boolean) => {
      setHidden((current) => {
        const next = new Set(current);
        if (hide) next.add(key);
        else next.delete(key);
        return next;
      });
    }, []),
  );

  const payable = tab === "payable";
  const money = (value: number) => formatMoney(value, { locale });

  // Debts saved from the Catat sheet in this tab: new ones join the first page, edits replace.
  const pendingDebts = catat.pending
    .map((item) => ({ item: entryToDebtItem(item.entry), isNew: item.isNew }))
    .filter((row): row is { item: DebtItem; isNew: boolean } => Boolean(row.item));
  const replace = (items: DebtItem[]) =>
    items.map((debt) => {
      const edited = pendingDebts.find((row) => row.item.id === debt.id);
      return edited ? { ...edited.item, paid_amount: debt.paid_amount, payments: debt.payments } : debt;
    });
  const added = pendingDebts
    .filter((row) => row.isNew && row.item.direction === tab && !row.item.settled)
    .map((row) => row.item)
    .filter((debt) => !data.active.items.some((item) => item.id === debt.id));
  const visible = (items: DebtItem[]) =>
    applyDebtPatches(replace(items), patches).filter((debt) => !hidden.has(`db:${debt.id}`));

  const active = visible([...(data.active.page === 1 ? added : []), ...data.active.items]);
  const settled = visible(data.settled.items);
  const pool = visible([...active, ...settled, ...(data.focus ? [data.focus] : [])]);
  const selected = selectedId ? (pool.find((debt) => debt.id === selectedId) ?? null) : null;

  // Totals follow local changes too.
  const summary = data.summary[tab];
  const addedRemaining = added.reduce((sum, debt) => sum + debt.remaining_amount, 0);
  const patchedPaid = patches.reduce((sum, patch) => {
    const debt = pool.find((item) => item.id === patch.debtId);
    return debt?.direction === tab ? sum + patch.paidDelta : sum;
  }, 0);
  const remaining = Math.max(0, summary.remaining + addedRemaining - patchedPaid);
  const paid = Math.max(0, summary.paid + patchedPaid);
  const total = summary.total + added.reduce((sum, debt) => sum + debt.amount, 0);
  const other = data.summary[payable ? "receivable" : "payable"].remaining;
  const net = payable ? other - remaining : remaining - other;

  function open(debt: DebtItem) {
    setSelectedId(debt.id);
    syncDebtParam(debt.id);
  }

  function close() {
    setSelectedId(null);
    syncDebtParam(null);
  }

  const tabMeta = (direction: DebtDirection) => {
    const value = direction === tab ? remaining : data.summary[direction].remaining;
    return value > 0 ? formatMoney(value, { locale, compact: true }) : undefined;
  };

  return (
    <div className="mx-auto grid max-w-2xl gap-6 lg:max-w-none lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
      <Tabs<DebtDirection>
        label={t("tabs.label")}
        value={tab}
        items={[
          { value: "payable", label: t("tabs.payable"), meta: tabMeta("payable"), href: "/debts?tab=payable" },
          { value: "receivable", label: t("tabs.receivable"), meta: tabMeta("receivable"), href: "/debts?tab=receivable" },
        ]}
        className="lg:col-span-2"
      />

      <section
        aria-labelledby="hutang-hero"
        className="grid gap-1.5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-2 lg:border-l lg:border-line lg:pl-8"
      >
        <p id="hutang-hero" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
          {t(payable ? "hero.payable" : "hero.receivable")}
        </p>
        <AmountText
          value={remaining}
          tone={remaining > 0 ? "debt" : "neutral"}
          className="block text-[38px] leading-[1.1] font-bold md:text-[44px]"
        />
        <p className="text-[13px] text-muted">
          {remaining > 0
            ? t("hero.detail", { count: summary.people, paid: money(paid), total: money(total) })
            : t(payable ? "hero.clearPayable" : "hero.clearReceivable")}
        </p>
        {total > 0 && remaining > 0 ? (
          <ProgressBar value={paid} max={total} tone="income" label={t("hero.progress")} className="mt-3" />
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3.5">
          <p className="grid min-w-0 text-[13px] text-muted">
            {t("hero.net")}
            <AmountText
              value={net}
              sign="always"
              tone={net < 0 ? "expense" : net > 0 ? "income" : "muted"}
              className="text-[15px] font-semibold"
            />
          </p>
          <Button
            size="sm"
            variant="secondary"
            aria-haspopup="dialog"
            onClick={() => catat.open("debt", { preset: { debtDirection: tab } })}
          >
            <Plus aria-hidden="true" />
            {t(payable ? "actions.addPayable" : "actions.addReceivable")}
          </Button>
        </div>
      </section>

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <SectionHeader
          title={t(payable ? "list.activePayable" : "list.activeReceivable")}
          meta={summary.activeCount + added.length ? t("list.count", { count: summary.activeCount + added.length }) : undefined}
        />
        {active.length ? (
          <ul className="divide-y divide-line" data-testid="debt-list">
            {active.map((debt) => (
              <li key={debt.id}>
                <DebtRow debt={debt} today={data.today} onOpen={() => open(debt)} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={HandCoins}
            title={t(payable ? "empty.payableTitle" : "empty.receivableTitle")}
            body={t(payable ? "empty.payableBody" : "empty.receivableBody")}
          />
        )}
        <Pagination
          page={data.active.page}
          totalPages={data.active.totalPages}
          pathname="/debts"
          query={{ tab }}
          className="mt-2 border-t border-line pt-3"
        />

        {summary.settledCount ? (
          <div className="mt-6 border-t border-line pt-2">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showSettled}
              onClick={() => setShowSettled((value) => !value)}
              className="-ml-3"
            >
              <ChevronDown aria-hidden="true" className={cn("transition-transform", showSettled && "rotate-180")} />
              {t("list.settled", { count: summary.settledCount })}
            </Button>
            {showSettled ? (
              <>
                <ul className="divide-y divide-line">
                  {settled.map((debt) => (
                    <li key={debt.id}>
                      <DebtRow debt={debt} today={data.today} onOpen={() => open(debt)} />
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={data.settled.page}
                  totalPages={data.settled.totalPages}
                  pathname="/debts"
                  param="settled"
                  query={{ tab, page: data.active.page > 1 ? String(data.active.page) : undefined }}
                  className="mt-2 border-t border-line pt-3"
                />
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <DebtSheet
        debt={selected}
        wallets={data.wallets}
        today={data.today}
        onClose={close}
        onPatch={pushPatch}
        onDelete={(debt) =>
          void remove({ kind: "debt", id: debt.id, key: `db:${debt.id}` }, `${debt.contact_name} · ${money(debt.amount)}`)
        }
      />
    </div>
  );
}

function DebtRow({ debt, today, onOpen }: { debt: DebtItem; today: string; onOpen: () => void }) {
  const t = useTranslations("hutang");
  const locale = toUiLocale(useLocale());
  const date = formatDateKey(debt.debt_date, locale, {
    day: "numeric",
    month: "short",
    ...(debt.debt_date.slice(0, 4) === today.slice(0, 4) ? {} : { year: "numeric" }),
  });
  const detail = [debt.reason || null, date].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="flex w-full items-start gap-3 py-3 text-left outline-none transition-colors hover:bg-surface-2/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    >
      <RowAvatar tone={debt.settled ? "neutral" : "debt"} label={debt.contact_name} />
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[14px] font-medium text-text">{debt.contact_name || "-"}</span>
          {debt.settled ? (
            <Badge tone="income">{t("list.paidBadge")}</Badge>
          ) : (
            <AmountText value={debt.remaining_amount} className="text-[14px] font-semibold" />
          )}
        </span>
        <span className="flex items-baseline justify-between gap-3 text-[12px] text-muted">
          <span className="truncate">{detail}</span>
          <span className="shrink-0 tabular-nums">
            {debt.settled
              ? formatMoney(debt.amount, { locale })
              : t("list.of", { total: formatMoney(debt.amount, { locale }) })}
          </span>
        </span>
        {!debt.settled && debt.paid_amount > 0 ? (
          <ProgressBar
            value={debt.paid_amount}
            max={Math.max(debt.amount, 1)}
            tone="income"
            size="sm"
            label={t("detail.progress", { name: debt.contact_name })}
            className="mt-1.5"
          />
        ) : null}
      </span>
    </button>
  );
}
