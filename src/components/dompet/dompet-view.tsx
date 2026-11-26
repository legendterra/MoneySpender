"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRight, ChevronDown, Plus, Wallet as WalletIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { walletKindIcons, WalletSheet, type WalletSheetTarget } from "@/components/dompet/wallet-sheet";
import { useCatat } from "@/components/quick-add/catat-provider";
import { EntrySheet } from "@/components/riwayat/entry-sheet";
import { FlowAmount } from "@/components/riwayat/entry-visuals";
import { useDeleteWithUndo } from "@/components/riwayat/use-delete-with-undo";
import { AmountText } from "@/components/ui/amount-display";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateKey, formatMoney, toUiLocale } from "@/components/ui/format";
import { ListRow, RowAvatar } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import type { WalletsPageData } from "@/lib/data-wallets";
import { historyHref, type HistoryEntry } from "@/lib/history";
import type { TransferRow } from "@/lib/net-worth";
import { cn } from "@/lib/utils";

function transferEntry(transfer: TransferRow): HistoryEntry {
  return {
    key: `tf:${transfer.id}`,
    id: transfer.id,
    kind: "transfer",
    date: transfer.transfer_date,
    createdAt: null,
    amount: transfer.amount,
    flow: "move",
    note: transfer.note?.trim() || null,
    merchant: null,
    categoryId: null,
    categoryLabel: null,
    walletId: transfer.from_wallet_id,
    walletLabel: transfer.fromName,
    toWalletId: transfer.to_wallet_id,
    toWalletLabel: transfer.toName,
    debtId: null,
    debtDirection: null,
    contact: null,
    debtPaid: null,
    debtPaidAt: null,
  };
}

export function DompetView({ data }: { data: WalletsPageData }) {
  const t = useTranslations("dompet");
  const tr = useTranslations("riwayat");
  const locale = toUiLocale(useLocale());
  const catat = useCatat();
  const [sheet, setSheet] = React.useState<WalletSheetTarget | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);
  const [entry, setEntry] = React.useState<HistoryEntry | null>(null);
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(() => new Set());
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

  const { summary } = data;
  const active = data.wallets.filter((wallet) => !wallet.is_archived);
  const archived = data.wallets.filter((wallet) => wallet.is_archived);
  const transfers = data.transfers.filter((transfer) => !hidden.has(`tf:${transfer.id}`));
  const money = (value: number) => formatMoney(value, { locale });
  // Keep the sheet in sync with fresh server data after a save.
  const sheetTarget: WalletSheetTarget | null =
    sheet?.mode === "edit"
      ? { mode: "edit", wallet: data.wallets.find((wallet) => wallet.id === sheet.wallet.id) ?? sheet.wallet }
      : sheet;

  return (
    <div className="mx-auto grid max-w-2xl gap-8 lg:max-w-none lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="grid min-w-0 gap-8">
        <section aria-labelledby="networth-label" className="pt-1">
          <p id="networth-label" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
            {t("hero.netWorth")}
          </p>
          <AmountText
            value={summary.netWorth}
            tone={summary.netWorth < 0 ? "expense" : "neutral"}
            className="mt-1.5 block text-[38px] leading-[1.1] font-bold md:text-[44px]"
          />
          <p className="mt-1.5 text-[13px] text-muted">{t("hero.formula")}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3.5">
            <div className="grid min-w-0 gap-0.5">
              <dt className="truncate text-[12px] text-muted">{t("hero.wallets")}</dt>
              <dd>
                <AmountText value={summary.walletTotal} compact className="text-[15px] font-semibold" />
              </dd>
            </div>
            <div className="grid min-w-0 gap-0.5">
              <dt className="truncate text-[12px] text-muted">
                <Link href="/debts?tab=receivable" className="hover:text-text hover:underline">
                  {t("hero.receivable")}
                </Link>
              </dt>
              <dd>
                <AmountText value={summary.receivable} tone="income" compact sign="always" className="text-[15px] font-semibold" />
              </dd>
            </div>
            <div className="grid min-w-0 gap-0.5">
              <dt className="truncate text-[12px] text-muted">
                <Link href="/debts?tab=payable" className="hover:text-text hover:underline">
                  {t("hero.payable")}
                </Link>
              </dt>
              <dd>
                <AmountText value={-summary.payable} tone={summary.payable ? "expense" : "muted"} compact className="text-[15px] font-semibold" />
              </dd>
            </div>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              aria-haspopup="dialog"
              disabled={active.length < 2}
              onClick={() => catat.open("transfer")}
            >
              <ArrowLeftRight aria-hidden="true" />
              {t("actions.transfer")}
            </Button>
            <Button aria-haspopup="dialog" onClick={() => setSheet({ mode: "create" })}>
              <Plus aria-hidden="true" />
              {t("actions.add")}
            </Button>
          </div>
        </section>

        <section aria-labelledby="wallets-list">
          <SectionHeader
            id="wallets-list"
            title={t("list.title")}
            meta={active.length ? <AmountText value={summary.walletTotal} tone="muted" /> : undefined}
          />
          {active.length ? (
            <ul className="divide-y divide-line">
              {active.map((wallet) => (
                <li key={wallet.id}>
                  <ListRow
                    leading={<RowAvatar icon={walletKindIcons[wallet.kind] ?? WalletIcon} tone="neutral" />}
                    title={wallet.name}
                    subtitle={t(`kinds.${wallet.kind}`)}
                    trailing={
                      <AmountText value={wallet.balance} tone={wallet.balance < 0 ? "expense" : "neutral"} />
                    }
                    trailingSub={
                      wallet.balance !== wallet.opening_balance
                        ? t("list.opening", { amount: formatMoney(wallet.opening_balance, { locale, compact: true }) })
                        : undefined
                    }
                    onClick={() => setSheet({ mode: "edit", wallet })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={WalletIcon}
              title={t("empty.title")}
              body={t("empty.body")}
              action={
                <Button size="sm" onClick={() => setSheet({ mode: "create" })}>
                  <Plus aria-hidden="true" />
                  {t("actions.add")}
                </Button>
              }
              className="mt-1"
            />
          )}
          {summary.liquid !== summary.walletTotal ? (
            <p className="mt-2 text-[12px] text-muted">{t("list.liquid", { amount: money(summary.liquid) })}</p>
          ) : null}

          {archived.length ? (
            <div className="mt-3 border-t border-line pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((value) => !value)}
              >
                <ChevronDown aria-hidden="true" className={cn("transition-transform", showArchived && "rotate-180")} />
                {t("list.archived", { count: archived.length })}
              </Button>
              {showArchived ? (
                <>
                  <p className="text-[12px] text-muted">{t("list.archivedHint")}</p>
                  <ul className="divide-y divide-line">
                    {archived.map((wallet) => (
                      <li key={wallet.id}>
                        <ListRow
                          leading={<RowAvatar icon={walletKindIcons[wallet.kind] ?? WalletIcon} tone="neutral" className="opacity-60" />}
                          title={<span className="text-muted">{wallet.name}</span>}
                          subtitle={t(`kinds.${wallet.kind}`)}
                          trailing={<AmountText value={wallet.balance} tone="muted" />}
                          onClick={() => setSheet({ mode: "edit", wallet })}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section aria-labelledby="transfers-list" className="min-w-0 lg:border-l lg:border-line lg:pl-8">
        <SectionHeader
          id="transfers-list"
          title={t("transfers.title")}
          action={
            data.transferCount > transfers.length
              ? { label: tr("actions.seeAll"), href: historyHref({ type: "transfer", period: "all" }) }
              : undefined
          }
        />
        {transfers.length ? (
          <ul className="divide-y divide-line">
            {transfers.map((transfer) => (
              <li key={transfer.id}>
                <ListRow
                  leading={<RowAvatar icon={ArrowLeftRight} tone="transfer" />}
                  title={tr("rows.transfer", { from: transfer.fromName ?? "-", to: transfer.toName ?? "-" })}
                  subtitle={[
                    formatDateKey(transfer.transfer_date, locale, { day: "numeric", month: "short" }),
                    transfer.note?.trim() || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={<FlowAmount amount={transfer.amount} flow="move" />}
                  onClick={() => setEntry(transferEntry(transfer))}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-[13px] text-muted">{t("transfers.empty")}</p>
        )}
      </section>

      <WalletSheet target={sheetTarget} wallets={data.wallets} onClose={() => setSheet(null)} />
      <EntrySheet
        entry={entry}
        today={data.today}
        onClose={() => setEntry(null)}
        onDelete={(item, description) => void remove({ kind: item.kind, id: item.id, key: item.key }, description)}
      />
    </div>
  );
}
