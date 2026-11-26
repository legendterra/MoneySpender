"use client";

import Link from "next/link";
import { Copy, HandCoins, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useCatat } from "@/components/quick-add/catat-provider";
import { entryToCatat } from "@/components/riwayat/entry-catat";
import { AmountText } from "@/components/ui/amount-display";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateKey, toUiLocale } from "@/components/ui/format";
import { Sheet } from "@/components/ui/sheet";
import { describeEntry, type HistoryEntry } from "@/lib/history";
import { cn } from "@/lib/utils";

const toneFor = { in: "income", out: "expense", move: "transfer" } as const;

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[14px] font-medium break-words text-text">{value}</dd>
    </div>
  );
}

/** Detail of one Riwayat row with Ubah / Duplikat / Hapus. */
export function EntrySheet({
  entry,
  today,
  onClose,
  onDelete,
}: {
  entry: HistoryEntry | null;
  today: string;
  onClose: () => void;
  onDelete: (entry: HistoryEntry, description: string) => void;
}) {
  const t = useTranslations("riwayat");
  const locale = toUiLocale(useLocale());
  const catat = useCatat();

  const described = entry ? describeEntry(entry, t) : null;
  const kindLabel = entry
    ? entry.kind === "debt"
      ? t(entry.debtDirection === "receivable" ? "kinds.receivable" : "kinds.debt")
      : entry.kind === "debt_payment"
        ? t(entry.debtDirection === "receivable" ? "kinds.receivablePayment" : "kinds.debtPayment")
        : t(`kinds.${entry.kind}`)
    : "";
  const dateText = entry
    ? formatDateKey(entry.date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  function edit(duplicate: boolean) {
    if (!entry) return;
    const target = entryToCatat(entry, { duplicate, today });
    if (!target) return;
    onClose();
    catat.open(target.mode, target.options);
  }

  const canEdit = entry && entry.kind !== "debt_payment";
  const canDuplicate = entry && (entry.kind === "expense" || entry.kind === "income" || entry.kind === "transfer");
  const debtHref = entry?.debtId
    ? `/debts?tab=${entry.debtDirection === "receivable" ? "receivable" : "payable"}&debt=${entry.debtId}`
    : null;

  return (
    <Sheet
      open={Boolean(entry)}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
      title={described?.title ?? ""}
      description={kindLabel}
      size="sm"
      footer={
        entry ? (
          <div className="grid gap-2">
            <div className={cn("grid gap-2", canDuplicate ? "grid-cols-2" : "grid-cols-1")}>
              {canDuplicate ? (
                <Button variant="secondary" onClick={() => edit(true)}>
                  <Copy aria-hidden="true" />
                  {t("actions.duplicate")}
                </Button>
              ) : null}
              {canEdit ? (
                <Button onClick={() => edit(false)}>
                  <Pencil aria-hidden="true" />
                  {t("actions.edit")}
                </Button>
              ) : debtHref ? (
                <Link href={debtHref} onClick={onClose} className={buttonVariants({ variant: "primary" })}>
                  <HandCoins aria-hidden="true" />
                  {t("actions.openDebt")}
                </Link>
              ) : null}
            </div>
            <Button
              variant="ghost"
              className="text-expense hover:text-expense"
              onClick={() => {
                onClose();
                onDelete(entry, `${described?.title ?? ""} · ${dateText}`);
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("actions.delete")}
            </Button>
          </div>
        ) : null
      }
    >
      {entry ? (
        <div className="grid gap-4">
          <AmountText
            value={entry.flow === "out" ? -entry.amount : entry.amount}
            sign={entry.flow === "in" ? "always" : "auto"}
            tone={toneFor[entry.flow]}
            className="block text-[32px] leading-tight font-bold"
          />
          <dl className="divide-y divide-line border-y border-line">
            <DetailRow label={t("detail.date")} value={dateText} />
            {entry.kind === "transfer" ? (
              <>
                <DetailRow label={t("detail.from")} value={entry.walletLabel} />
                <DetailRow label={t("detail.to")} value={entry.toWalletLabel} />
              </>
            ) : (
              <DetailRow label={t("detail.wallet")} value={entry.walletLabel ?? t("detail.noWallet")} />
            )}
            {entry.kind === "expense" || entry.kind === "income" ? (
              <DetailRow label={t("detail.category")} value={entry.categoryLabel ?? t("rows.noCategory")} />
            ) : null}
            <DetailRow label={t("detail.contact")} value={entry.contact} />
            <DetailRow label={t("detail.merchant")} value={entry.merchant} />
            <DetailRow label={t("detail.note")} value={entry.note} />
          </dl>
          {entry.kind === "debt" && debtHref ? (
            <Link
              href={debtHref}
              onClick={onClose}
              className="justify-self-start text-[13px] font-semibold text-primary-ink hover:underline"
            >
              {t("actions.openDebt")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
