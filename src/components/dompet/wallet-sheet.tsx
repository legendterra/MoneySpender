"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveRestore,
  Archive,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Landmark,
  ReceiptText,
  Scale,
  Smartphone,
  Wallet as WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { AmountField } from "@/components/dompet/amount-field";
import { useCatat } from "@/components/quick-add/catat-provider";
import { AmountText } from "@/components/ui/amount-display";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { formatMoney, jakartaDateKey, toUiLocale } from "@/components/ui/format";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { historyHref } from "@/lib/history";
import { buildReconcileTransaction } from "@/lib/reconcile";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isUniqueViolation } from "@/lib/supabase/query";
import type { Wallet, WalletKind } from "@/lib/types";

export const WALLET_KINDS: WalletKind[] = ["cash", "bank", "ewallet", "card", "other"];

export const walletKindIcons: Record<WalletKind, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
  card: CreditCard,
  other: WalletIcon,
};

export type WalletSheetTarget = { mode: "create" } | { mode: "edit"; wallet: Wallet };

const NAME_MAX = 40;
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function currentUser() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Add or edit a wallet (name, kind, opening balance) and archive / unarchive it. */
export function WalletSheet({
  target,
  wallets,
  onClose,
}: {
  target: WalletSheetTarget | null;
  wallets: Wallet[];
  onClose: () => void;
}) {
  const t = useTranslations("dompet");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const catat = useCatat();
  const nameRef = React.useRef<HTMLInputElement>(null);

  const editing = target?.mode === "edit" ? target.wallet : null;
  const targetKey = target ? (editing ? editing.id : "new") : null;
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<WalletKind>("cash");
  const [opening, setOpening] = React.useState(0);
  const [attempted, setAttempted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [reconciling, setReconciling] = React.useState(false);
  const [actualBalance, setActualBalance] = React.useState(0);
  const [savingReconcile, setSavingReconcile] = React.useState(false);

  // Load the form whenever another wallet (or "new") is opened.
  if (targetKey !== loadedKey) {
    setLoadedKey(targetKey);
    setName(editing?.name ?? "");
    setKind(editing?.kind ?? "cash");
    setOpening(editing ? Math.round(editing.opening_balance) : 0);
    setActualBalance(editing ? Math.round(editing.balance) : 0);
    setReconciling(false);
    setAttempted(false);
  }

  const trimmed = name.trim();
  const duplicate = wallets.some(
    (wallet) => wallet.id !== editing?.id && wallet.name.trim().toLocaleLowerCase("id") === trimmed.toLocaleLowerCase("id"),
  );
  const nameError = !trimmed ? t("form.nameRequired") : duplicate ? t("form.nameTaken") : null;
  const negative = opening < 0;

  async function save() {
    setAttempted(true);
    if (nameError || saving) {
      nameRef.current?.focus();
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error(t("errors.offline"));
      return;
    }
    setSaving(true);
    try {
      const { supabase, user } = await currentUser();
      if (!user) {
        toast.error(t("errors.notSignedIn"));
        return;
      }
      const values = { name: trimmed.slice(0, NAME_MAX), kind, opening_balance: opening };
      const result = editing
        ? await supabase.from("wallets").update(values).eq("id", editing.id).eq("user_id", user.id)
        : await supabase.from("wallets").insert({ ...values, user_id: user.id, color: null });
      if (result.error) {
        toast.error(
          isUniqueViolation(result.error)
            ? t("form.nameTaken")
            : t("errors.save", { table: "wallets", message: result.error.message }),
        );
        return;
      }
      toast.success(editing ? t("form.updated", { name: values.name }) : t("form.created", { name: values.name }));
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(t("errors.save", { table: "wallets", message: message(error) }));
    } finally {
      setSaving(false);
    }
  }

  async function saveReconcile() {
    if (!editing || savingReconcile) return;
    const isEn = locale === "en";
    const built = buildReconcileTransaction({
      wallet: editing,
      actualBalance,
      dateKey: jakartaDateKey(),
      categoryLabel: isEn ? "Balance Adjustment" : "Penyesuaian Saldo",
      reason: isEn ? `Reconcile ${editing.name}` : `Penyesuaian saldo ${editing.name}`,
    });
    if (!built) {
      toast(isEn ? "Balance already matches." : "Saldo sudah sesuai.");
      setReconciling(false);
      return;
    }
    setSavingReconcile(true);
    try {
      const { supabase, user } = await currentUser();
      if (!user) {
        toast.error(t("errors.notSignedIn"));
        return;
      }
      const { error } = await supabase.from("transactions").insert({ user_id: user.id, ...built.payload });
      if (error) {
        toast.error(t("errors.save", { table: "transactions", message: error.message }));
        return;
      }
      toast.success(
        isEn
          ? `Adjusted by ${formatMoney(built.delta, { locale, sign: "always" })}`
          : `Saldo disesuaikan ${formatMoney(built.delta, { locale, sign: "always" })}`,
      );
      setReconciling(false);
      onClose();
      router.refresh();
    } finally {
      setSavingReconcile(false);
    }
  }

  async function setArchived(wallet: Wallet, archived: boolean, withUndo = true) {
    try {
      const { supabase, user } = await currentUser();
      if (!user) {
        toast.error(t("errors.notSignedIn"));
        return;
      }
      const { error } = await supabase
        .from("wallets")
        .update({ is_archived: archived })
        .eq("id", wallet.id)
        .eq("user_id", user.id);
      if (error) {
        toast.error(t("errors.save", { table: "wallets", message: error.message }));
        return;
      }
      router.refresh();
      const text = archived ? t("archive.done", { name: wallet.name }) : t("archive.restored", { name: wallet.name });
      if (!withUndo) {
        toast.success(text);
        return;
      }
      toast(text, {
        duration: 7000,
        action: { label: t("undo"), onClick: () => void setArchived(wallet, !archived, false) },
      });
    } catch (error) {
      toast.error(t("errors.save", { table: "wallets", message: message(error) }));
    }
  }

  const footer = (
    <div className="grid gap-2">
      <Button size="lg" fullWidth isLoading={saving} onClick={() => void save()}>
        {editing ? t("form.saveChanges") : t("form.create")}
      </Button>
      {editing ? (
        <Button
          variant="ghost"
          className={editing.is_archived ? undefined : "text-expense hover:text-expense"}
          onClick={() => {
            onClose();
            void setArchived(editing, !editing.is_archived);
          }}
        >
          {editing.is_archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
          {editing.is_archived ? t("archive.unarchive") : t("archive.archive")}
        </Button>
      ) : null}
    </div>
  );

  return (
    <Sheet
      open={Boolean(target)}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
      title={editing ? editing.name : t("form.titleNew")}
      description={editing ? (editing.is_archived ? t("archive.archivedHint") : t(`kinds.${editing.kind}`)) : undefined}
      size="sm"
      footer={footer}
      initialFocusRef={editing ? undefined : nameRef}
    >
      <div className="grid gap-4">
        {editing ? (
          <div className="grid gap-3 rounded-control border border-line bg-surface-2/50 p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-muted">{t("form.currentBalance")}</span>
              <AmountText
                value={editing.balance}
                tone={editing.balance < 0 ? "expense" : "neutral"}
                className="text-[17px] font-bold"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {!editing.is_archived ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onClose();
                      catat.open("transfer", { preset: { walletId: editing.id } });
                    }}
                  >
                    <ArrowLeftRight aria-hidden="true" />
                    {t("actions.transferFrom")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setActualBalance(Math.round(editing.balance));
                      setReconciling((v) => !v);
                    }}
                  >
                    <Scale aria-hidden="true" />
                    {locale === "en" ? "Reconcile" : "Sesuaikan saldo"}
                  </Button>
                </>
              ) : null}
              <Link
                href={historyHref({ walletId: editing.id })}
                onClick={onClose}
                className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-[13px] font-semibold text-primary-ink outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ReceiptText className="size-[18px]" aria-hidden="true" />
                {t("actions.history")}
              </Link>
            </div>
            {reconciling ? (
              <div className="grid gap-2.5 border-t border-line pt-3">
                <label htmlFor="wallet-reconcile" className="text-[12px] font-semibold text-text">
                  {locale === "en" ? "Real balance right now" : "Saldo asli sekarang"}
                </label>
                <AmountField id="wallet-reconcile" value={actualBalance} onChange={setActualBalance} />
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-muted">
                    {locale === "en" ? "Difference:" : "Selisih:"}{" "}
                    <strong className="tabular-nums text-text">
                      {formatMoney(actualBalance - Math.round(editing.balance), { locale, sign: "always" })}
                    </strong>
                  </span>
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setReconciling(false)}>
                      {locale === "en" ? "Cancel" : "Batal"}
                    </Button>
                    <Button type="button" size="sm" isLoading={savingReconcile} onClick={() => void saveReconcile()}>
                      {locale === "en" ? "Apply" : "Terapkan"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <Field label={t("form.name")} error={attempted && nameError ? nameError : undefined}>
          <Input
            ref={nameRef}
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            enterKeyHint="next"
            placeholder={t("form.namePlaceholder")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("wallet-opening")?.focus();
              }
            }}
            aria-invalid={attempted && nameError ? true : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <div className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-text">{t("form.kind")}</span>
          <ChipGroup label={t("form.kind")}>
            {WALLET_KINDS.map((value) => (
              <Chip variant="choice"
                key={value}
                icon={walletKindIcons[value]}
                selected={kind === value}
                onClick={() => {
                  setKind(value);
                  if (value !== "card" && opening < 0) setOpening(-opening);
                }}
              >
                {t(`kinds.${value}`)}
              </Chip>
            ))}
          </ChipGroup>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="wallet-opening" className="text-[13px] font-semibold text-text">
            {t("form.opening")}
          </label>
          <AmountField
            id="wallet-opening"
            value={opening}
            negative={negative}
            onChange={setOpening}
            enterKeyHint="done"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              }
            }}
            aria-describedby="wallet-opening-hint"
          />
          {kind === "card" ? (
            <ChipGroup label={t("form.cardSign")}>
              <Chip variant="choice" selected={!negative} onClick={() => setOpening(Math.abs(opening))}>
                {t("form.positive")}
              </Chip>
              <Chip variant="choice" selected={negative} onClick={() => setOpening(-Math.abs(opening))}>
                {t("form.negative")}
              </Chip>
            </ChipGroup>
          ) : null}
          <p id="wallet-opening-hint" className="text-[12px] leading-5 text-muted">
            {editing
              ? t("form.openingHintEdit", { amount: formatMoney(editing.balance - editing.opening_balance, { locale, sign: "always" }) })
              : t("form.openingHint")}
          </p>
        </div>
      </div>
    </Sheet>
  );
}
