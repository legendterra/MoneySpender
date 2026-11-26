"use client";

import * as React from "react";
import { ArrowLeft, Banknote, CircleCheck, CreditCard, Landmark, Pencil, Smartphone, Trash2, Wallet, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { useCatat } from "@/components/quick-add/catat-provider";
import { AmountDisplay, AmountText } from "@/components/ui/amount-display";
import { AmountKeypad } from "@/components/ui/amount-keypad";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { formatDateKey, formatMoney, toUiLocale } from "@/components/ui/format";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { paymentSuggestions, type DebtItem, type DebtPatch } from "@/lib/debt-board";
import { clampDebtPayment, recordDebtPayment } from "@/lib/debt-payments";
import { deleteEntry, restoreEntry } from "@/lib/history-mutations";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { WalletKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PayWallet = { id: string; name: string; kind: WalletKind; balance: number };

const walletIcons: Record<WalletKind, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
  card: CreditCard,
  other: Wallet,
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

type View = "detail" | "pay";

/** One debt: progress, payments, and Bayar sebagian / Lunasi / Ubah / Hapus. */
export function DebtSheet({
  debt,
  wallets,
  today,
  onClose,
  onDelete,
  onPatch,
}: {
  debt: DebtItem | null;
  wallets: PayWallet[];
  today: string;
  onClose: () => void;
  onDelete: (debt: DebtItem) => void;
  /** Shows a payment change at once (the list refreshes from the server afterwards). */
  onPatch: (patch: DebtPatch) => void;
}) {
  const t = useTranslations("hutang");
  const locale = toUiLocale(useLocale());
  const catat = useCatat();
  const [view, setView] = React.useState<View>("detail");
  const [amount, setAmount] = React.useState(0);
  const [walletId, setWalletId] = React.useState<string | null>(null);
  const [capped, setCapped] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [busyPayment, setBusyPayment] = React.useState<string | null>(null);
  const [dueDate, setDueDate] = React.useState<string>("");
  const [savingDue, setSavingDue] = React.useState(false);

  // Reset the pay form whenever another debt is opened.
  const [openedId, setOpenedId] = React.useState<string | null>(null);
  if ((debt?.id ?? null) !== openedId) {
    setOpenedId(debt?.id ?? null);
    setView("detail");
    setAmount(0);
    setCapped(false);
    setDueDate(debt?.due_date ?? "");
    setWalletId(debt?.wallet_id && wallets.some((w) => w.id === debt.wallet_id) ? debt.wallet_id : (wallets[0]?.id ?? null));
  }

  async function saveDueDate(nextDate: string) {
    if (!debt || savingDue) return;
    setDueDate(nextDate);
    setSavingDue(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const value = /^\d{4}-\d{2}-\d{2}$/.test(nextDate) ? nextDate : null;
      const { error } = await supabase
        .from("debts")
        .update({ due_date: value })
        .eq("id", debt.id)
        .eq("user_id", user.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(locale === "en" ? "Due date updated." : "Tanggal jatuh tempo disimpan.");
      catat.refresh();
    } finally {
      setSavingDue(false);
    }
  }

  const payable = debt?.direction !== "receivable";
  const money = (value: number) => formatMoney(value, { locale });
  const name = debt?.contact_name || "-";

  function startPay(full: boolean) {
    if (!debt) return;
    setAmount(full ? debt.remaining_amount : 0);
    setCapped(false);
    setView("pay");
  }

  function changeAmount(next: number) {
    if (!debt) return;
    setCapped(next > debt.remaining_amount);
    setAmount(Math.min(next, debt.remaining_amount));
  }

  async function savePayment() {
    if (!debt || saving) return;
    const value = clampDebtPayment(debt, amount);
    if (value <= 0) {
      toast.error(t("pay.needAmount"));
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error(t("errors.offline"));
      return;
    }
    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("errors.notSignedIn"));
        return;
      }
      const wallet = wallets.find((item) => item.id === walletId) ?? null;
      const debtId = debt.id;
      const result = await recordDebtPayment(supabase, {
        userId: user.id,
        debt,
        amount: value,
        walletId: wallet?.id ?? debt.wallet_id,
        walletLabel: wallet?.name ?? debt.wallet_label,
        paidDate: today,
      });
      const text = result.isPaid
        ? t(payable ? "pay.settledPayable" : "pay.settledReceivable", { name })
        : t(payable ? "pay.savedPayable" : "pay.savedReceivable", { amount: money(result.amount), name });
      toast.success(text, {
        duration: 7000,
        action: {
          label: t("undo"),
          onClick: async () => {
            try {
              await deleteEntry(supabase, user.id, { kind: "debt_payment", id: result.paymentId });
              toast.success(t("pay.undone"));
              onPatch({ debtId, paidDelta: -result.amount, removePaymentId: result.paymentId });
            } catch (error) {
              toast.error(t("errors.undo", { message: message(error) }));
            }
          },
        },
      });
      setView("detail");
      onPatch({
        debtId,
        paidDelta: result.amount,
        addPayment: {
          id: result.paymentId,
          debt_id: debtId,
          amount: result.amount,
          paid_date: today,
          note: null,
          wallet_id: wallet?.id ?? debt.wallet_id,
          wallet_label: wallet?.name ?? debt.wallet_label,
        },
      });
    } catch (error) {
      toast.error(t("errors.pay", { message: message(error) }));
    } finally {
      setSaving(false);
    }
  }

  async function removePayment(paymentId: string, label: string) {
    if (busyPayment || !debt) return;
    const debtId = debt.id;
    const removed = debt.payments.find((payment) => payment.id === paymentId);
    setBusyPayment(paymentId);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("errors.notSignedIn"));
        return;
      }
      const token = await deleteEntry(supabase, user.id, { kind: "debt_payment", id: paymentId });
      onPatch({ debtId, paidDelta: -(removed?.amount ?? 0), removePaymentId: paymentId });
      toast(t("payments.deleted"), {
        description: label,
        duration: 7000,
        action: {
          label: t("undo"),
          onClick: async () => {
            try {
              await restoreEntry(supabase, user.id, token);
              toast.success(t("payments.restored"));
              onPatch({ debtId, paidDelta: removed?.amount ?? 0, addPayment: removed });
            } catch (error) {
              toast.error(t("errors.undo", { message: message(error) }));
            }
          },
        },
      });
    } catch (error) {
      toast.error(t("errors.deletePayment", { message: message(error) }));
    } finally {
      setBusyPayment(null);
    }
  }

  function edit() {
    if (!debt) return;
    onClose();
    catat.open("debt", {
      preset: {
        amount: Math.round(debt.amount),
        contact: debt.contact_name,
        debtDirection: debt.direction,
        walletId: debt.wallet_id ?? undefined,
        walletLabel: debt.wallet_label ?? undefined,
        dateKey: debt.debt_date,
        note: debt.reason,
      },
      editing: { table: "debts", id: debt.id, debtPaid: debt.paid_amount, debtPaidAt: debt.paid_at },
    });
  }

  const dateText = (key: string) =>
    formatDateKey(key, locale, {
      day: "numeric",
      month: "short",
      ...(key.slice(0, 4) === today.slice(0, 4) ? {} : { year: "numeric" }),
    });

  const title = debt
    ? view === "pay"
      ? amount > 0 && amount === debt.remaining_amount
        ? t(payable ? "pay.titleSettlePayable" : "pay.titleSettleReceivable", { name })
        : t(payable ? "pay.titlePayable" : "pay.titleReceivable", { name })
      : name
    : "";
  const description = debt
    ? view === "pay"
      ? t("pay.remaining", { amount: money(debt.remaining_amount) })
      : t(payable ? "detail.payableSince" : "detail.receivableSince", { date: dateText(debt.debt_date) })
    : undefined;

  const footer = !debt ? null : view === "pay" ? (
    <div className="grid grid-cols-[auto_1fr] gap-2">
      <Button variant="secondary" onClick={() => setView("detail")} aria-label={t("pay.back")}>
        <ArrowLeft aria-hidden="true" />
        <span className="max-sm:sr-only">{t("pay.back")}</span>
      </Button>
      <Button onClick={() => void savePayment()} isLoading={saving} disabled={amount <= 0}>
        {t("pay.save")}
      </Button>
    </div>
  ) : debt.settled ? null : (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="secondary" onClick={() => startPay(false)}>
        {t(payable ? "actions.payPart" : "actions.receivePart")}
      </Button>
      <Button onClick={() => startPay(true)}>
        <CircleCheck aria-hidden="true" />
        {t("actions.settle")}
      </Button>
    </div>
  );

  return (
    <Sheet
      open={Boolean(debt)}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
      title={title}
      description={description}
      size="sm"
      footer={footer}
    >
      {debt && view === "detail" ? (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
              {debt.settled ? t("detail.settled") : t("detail.remaining")}
            </p>
            <AmountText
              value={debt.settled ? debt.amount : debt.remaining_amount}
              tone={debt.settled ? "muted" : "debt"}
              className="block text-[32px] leading-tight font-bold"
            />
            <p className="text-[13px] text-muted">
              {t("detail.paidOf", { paid: money(debt.paid_amount), total: money(debt.amount) })}
            </p>
            <ProgressBar
              value={debt.paid_amount}
              max={Math.max(debt.amount, 1)}
              tone="income"
              label={t("detail.progress", { name })}
              className="mt-1"
            />
          </div>

          <dl className="divide-y divide-line border-y border-line text-[14px]">
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-muted">{t(payable ? "detail.walletPayable" : "detail.walletReceivable")}</dt>
              <dd className="font-medium text-text">{debt.wallet_label ?? t("detail.noWallet")}</dd>
            </div>
            {!debt.settled ? (
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="shrink-0 text-[13px] text-muted">
                  <label htmlFor="debt-due-date">{locale === "en" ? "Due date" : "Jatuh tempo"}</label>
                </dt>
                <dd className="flex items-center gap-1.5">
                  <input
                    id="debt-due-date"
                    type="date"
                    value={dueDate}
                    disabled={savingDue}
                    onChange={(e) => void saveDueDate(e.target.value)}
                    className="min-h-9 rounded-chip border border-line bg-surface px-2.5 text-[13px] text-text [color-scheme:inherit]"
                  />
                  {dueDate ? (
                    <button
                      type="button"
                      disabled={savingDue}
                      onClick={() => void saveDueDate("")}
                      className="px-1.5 text-[12px] text-muted hover:text-text"
                    >
                      {locale === "en" ? "Clear" : "Hapus"}
                    </button>
                  ) : null}
                </dd>
              </div>
            ) : null}
            {debt.reason ? (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-[13px] text-muted">{t("detail.note")}</dt>
                <dd className="min-w-0 text-right font-medium break-words text-text">{debt.reason}</dd>
              </div>
            ) : null}
            {debt.settled && debt.paid_at ? (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-[13px] text-muted">{t("detail.settledOn")}</dt>
                <dd className="font-medium text-income">{dateText(debt.paid_at.slice(0, 10))}</dd>
              </div>
            ) : null}
          </dl>

          <section aria-labelledby="debt-payments" className="grid gap-1">
            <h3 id="debt-payments" className="text-[13px] font-semibold text-text">
              {t("payments.title")}
            </h3>
            {debt.payments.length ? (
              <ul className="divide-y divide-line">
                {debt.payments.map((payment) => {
                  const label = `${money(payment.amount)} · ${dateText(payment.paid_date)}`;
                  return (
                    <li key={payment.id} className="flex min-h-12 items-center gap-3">
                      <div className="grid min-w-0 flex-1">
                        <span className="text-[14px] font-medium text-text">{dateText(payment.paid_date)}</span>
                        <span className="truncate text-[12px] text-muted">
                          {payment.wallet_label ?? debt.wallet_label ?? t("detail.noWallet")}
                          {payment.note ? ` · ${payment.note}` : ""}
                        </span>
                      </div>
                      <AmountText value={payment.amount} tone={payable ? "expense" : "income"} className="text-[14px] font-semibold" />
                      <IconButton
                        label={t("payments.delete", { label })}
                        size="sm"
                        disabled={busyPayment === payment.id}
                        onClick={() => void removePayment(payment.id, label)}
                        className="-mr-1.5"
                      >
                        <Trash2 aria-hidden="true" />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-2 text-[13px] text-muted">{t("payments.empty")}</p>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={edit}>
              <Pencil aria-hidden="true" />
              {t("actions.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-expense hover:text-expense"
              onClick={() => {
                onClose();
                onDelete(debt);
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("actions.delete")}
            </Button>
          </div>
        </div>
      ) : null}

      {debt && view === "pay" ? (
        <div className="grid gap-3.5">
          <AmountDisplay value={amount} placeholder label={t("pay.amount")} className="mt-1 min-h-[54px]" />
          <p
            role="status"
            className={cn("-mt-1 text-center text-[12px]", capped ? "font-medium text-debt" : "text-muted")}
          >
            {capped
              ? t("pay.capped", { amount: money(debt.remaining_amount) })
              : t("pay.max", { amount: money(debt.remaining_amount) })}
          </p>
          <ChipGroup label={t("pay.quick")}>
            {paymentSuggestions(debt.remaining_amount).map((value, index) => (
              <Chip variant="choice" key={value} selected={amount === value} onClick={() => changeAmount(value)}>
                {index === 0 ? t("pay.all") : t("pay.half")}
                <span className="ml-1 text-muted tabular-nums">{formatMoney(value, { locale, compact: true })}</span>
              </Chip>
            ))}
          </ChipGroup>
          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-muted">
              {t(payable ? "pay.fromWallet" : "pay.toWallet")}
            </p>
            {wallets.length ? (
              <ChipGroup label={t(payable ? "pay.fromWallet" : "pay.toWallet")} scroll className="md:-mx-6 md:px-6">
                {wallets.map((wallet) => {
                  const Icon = walletIcons[wallet.kind] ?? Wallet;
                  return (
                    <Chip variant="choice"
                      key={wallet.id}
                      icon={Icon}
                      selected={walletId === wallet.id}
                      onClick={() => setWalletId(wallet.id)}
                    >
                      {wallet.name}
                    </Chip>
                  );
                })}
              </ChipGroup>
            ) : (
              <p className="text-[13px] text-muted">{t("pay.noWallets")}</p>
            )}
          </div>
          <AmountKeypad
            value={amount}
            onChange={changeAmount}
            onSubmit={() => void savePayment()}
            captureKeyboard
            disabled={saving}
          />
        </div>
      ) : null}
    </Sheet>
  );
}
