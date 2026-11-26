"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Banknote,
  CalendarDays,
  Check,
  ClipboardPaste,
  CreditCard,
  Landmark,
  NotebookPen,
  Plus,
  Receipt,
  Search,
  Smartphone,
  Store,
  UserRound,
  Wallet as WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { AmountField } from "@/components/dompet/amount-field";
import {
  buildCatatPayload,
  buildCatatUpdate,
  buildTransferFeePayload,
  sortCategoriesByUsage,
  validateDraft,
  type CatatDraft,
  type CatatIssue,
  type CatatPayload,
  type DebtDirectionChoice,
} from "@/components/quick-add/build-payload";
import { parseBankNotification } from "@/lib/quick-capture";
import {
  editableModes,
  type CatatCategory,
  type CatatData,
  type CatatEditing,
  type CatatMode,
  type CatatPanel,
  type CatatPreset,
  type CatatTemplate,
  type CatatWallet,
} from "@/components/quick-add/types";
import { AmountDisplay } from "@/components/ui/amount-display";
import { AmountKeypad } from "@/components/ui/amount-keypad";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import {
  addDaysToKey,
  formatDateKey,
  formatMoney,
  jakartaDateKey,
  toUiLocale,
} from "@/components/ui/format";
import { IconButton } from "@/components/ui/icon-button";
import { inputClassName } from "@/components/ui/input";
import { SegmentedControl, type SegmentTone } from "@/components/ui/segmented-control";
import { useRowClamp } from "@/components/ui/use-row-clamp";
import { enqueueOfflineMutation } from "@/lib/offline-queue";
import {
  HISTORY_DEBT_COLUMNS,
  HISTORY_TRANSACTION_COLUMNS,
  HISTORY_TRANSFER_COLUMNS,
} from "@/lib/finance-data";
import { rowToEntry, type HistoryEntry } from "@/lib/history";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SavedTable = CatatPayload["table"];

/** Columns read back after a save, so the row can be shown before the refresh lands. */
const SAVED_COLUMNS: Record<SavedTable, string> = {
  transactions: HISTORY_TRANSACTION_COLUMNS,
  wallet_transfers: HISTORY_TRANSFER_COLUMNS,
  debts: HISTORY_DEBT_COLUMNS,
};

const WALLET_STORAGE_KEY = "moneyspender.catat.wallet.v1";
// Candidates rendered before the two-row clamp hides what does not fit.
const VISIBLE_CATEGORIES = 10;

type Panel = CatatPanel;

export const MODE_TONE: Record<CatatMode, SegmentTone> = {
  expense: "expense",
  income: "income",
  transfer: "transfer",
  debt: "debt",
};

const walletIcons: Record<CatatWallet["kind"], LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
  card: CreditCard,
  other: WalletIcon,
};

type CategoryPick = { id: string | null; label: string };

export type { CatatPreset };

function readStoredWallet(wallets: CatatWallet[], preferred?: string) {
  if (preferred && wallets.some((wallet) => wallet.id === preferred)) return preferred;
  if (typeof window === "undefined") return wallets[0]?.id ?? null;
  try {
    const stored = window.localStorage.getItem(WALLET_STORAGE_KEY);
    if (stored && wallets.some((wallet) => wallet.id === stored)) return stored;
  } catch {
    // Storage blocked: fall back to the first wallet.
  }
  return wallets[0]?.id ?? null;
}

function rememberWallet(walletId: string | null) {
  if (!walletId) return;
  try {
    window.localStorage.setItem(WALLET_STORAGE_KEY, walletId);
  } catch {
    // Ignore storage errors.
  }
}

/** All state and actions of the Catat sheet. Shared by the sheet and gallery previews. */
export function useCatatForm({
  data,
  initialMode,
  demo = false,
  preset,
  editing = null,
  onSaved,
  onRecorded,
}: {
  data: CatatData;
  initialMode: CatatMode;
  demo?: boolean;
  preset?: CatatPreset;
  /** Update this row instead of inserting a new one. */
  editing?: CatatEditing | null;
  onSaved?: () => void;
  /** After a successful save: the saved row as a Riwayat entry (optimistic lists). */
  onRecorded?: (entry: HistoryEntry | null, options: { isNew: boolean }) => void;
}) {
  const t = useTranslations("catat");
  const tr = useTranslations("riwayat");
  const locale = toUiLocale(useLocale());
  const { templates, contacts } = data;
  // An edited row may point at an archived wallet; keep it selectable so saving
  // does not silently detach the row from it.
  const wallets = React.useMemo(() => {
    if (!editing) return data.wallets;
    const extra: CatatWallet[] = [];
    for (const [id, name] of [
      [preset?.walletId, preset?.walletLabel],
      [preset?.toWalletId, preset?.toWalletLabel],
    ] as const) {
      if (id && !data.wallets.some((wallet) => wallet.id === id) && !extra.some((wallet) => wallet.id === id)) {
        extra.push({ id, name: name ?? "-", kind: "other" });
      }
    }
    return extra.length ? [...data.wallets, ...extra] : data.wallets;
  }, [data.wallets, editing, preset?.walletId, preset?.walletLabel, preset?.toWalletId, preset?.toWalletLabel]);
  const allowedModes = editableModes(editing);

  const [mode, setMode] = React.useState<CatatMode>(initialMode);
  const [amount, setAmount] = React.useState(preset?.amount ?? 0);
  const [picks, setPicks] = React.useState<Record<"expense" | "income", CategoryPick | null>>(() => {
    const presetCategory = data.categories.find((item) => item.id === preset?.categoryId);
    if (!presetCategory && preset?.categoryLabel && (initialMode === "expense" || initialMode === "income")) {
      // Label-only category (imported or created offline).
      return {
        expense: initialMode === "expense" ? { id: null, label: preset.categoryLabel } : null,
        income: initialMode === "income" ? { id: null, label: preset.categoryLabel } : null,
      };
    }
    return {
      expense:
        presetCategory?.type === "expense" ? { id: presetCategory.id, label: presetCategory.name } : null,
      income:
        presetCategory?.type === "income" ? { id: presetCategory.id, label: presetCategory.name } : null,
    };
  });
  const [walletId, setWalletId] = React.useState<string | null>(() =>
    readStoredWallet(wallets, preset?.walletId),
  );
  const [toWalletId, setToWalletId] = React.useState<string | null>(() => {
    if (preset?.toWalletId && wallets.some((wallet) => wallet.id === preset.toWalletId)) return preset.toWalletId;
    const from = readStoredWallet(wallets, preset?.walletId);
    return wallets.find((wallet) => wallet.id !== from)?.id ?? null;
  });
  const [dateKey, setDateKey] = React.useState(() =>
    preset?.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(preset.dateKey) ? preset.dateKey : jakartaDateKey(),
  );
  const [note, setNote] = React.useState(preset?.note ?? "");
  const [merchant, setMerchant] = React.useState(preset?.merchant ?? "");
  const [transferFee, setTransferFee] = React.useState(preset?.transferFee ?? 0);
  const [pasteText, setPasteText] = React.useState("");
  const [debtDirection, setDebtDirection] = React.useState<DebtDirectionChoice>(
    preset?.debtDirection ?? "payable",
  );
  const [contact, setContact] = React.useState(preset?.contact ?? "");
  const [panel, setPanel] = React.useState<Panel>(preset?.panel ?? "keypad");
  const [query, setQuery] = React.useState("");
  const [extraCategories, setExtraCategories] = React.useState<CatatCategory[]>([]);
  const [attempted, setAttempted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const categoryType = mode === "income" ? "income" : "expense";
  const categories = React.useMemo(
    () => sortCategoriesByUsage([...data.categories, ...extraCategories], categoryType),
    [data.categories, extraCategories, categoryType],
  );
  const pick = mode === "expense" || mode === "income" ? picks[mode] : null;

  const draft: CatatDraft = {
    mode,
    amount,
    categoryId: pick?.id ?? null,
    categoryLabel: pick?.label ?? null,
    walletId,
    toWalletId,
    dateKey,
    note,
    merchant,
    transferFee,
    debtDirection,
    contact,
  };
  const issue: CatatIssue | null = validateDraft(draft, wallets.length, { minAmount: editing?.debtPaid ?? 0 });

  function selectCategory(next: CategoryPick | null) {
    if (mode !== "expense" && mode !== "income") return;
    setPicks((current) => ({ ...current, [mode]: next }));
  }

  function applyTemplate(template: CatatTemplate) {
    setMode(template.type);
    setAmount(Math.round(template.amount));
    setPicks((current) => ({
      ...current,
      [template.type]: template.categoryId || template.categoryLabel
        ? { id: template.categoryId, label: template.categoryLabel ?? "" }
        : null,
    }));
    if (template.walletId && wallets.some((wallet) => wallet.id === template.walletId)) {
      setWalletId(template.walletId);
    }
    if (!note) setNote(template.label);
  }

  function swapWallets() {
    setWalletId(toWalletId);
    setToWalletId(walletId);
  }

  function chooseFromWallet(id: string) {
    if (id === toWalletId) setToWalletId(walletId);
    setWalletId(id);
  }

  function chooseToWallet(id: string) {
    if (id === walletId) setWalletId(toWalletId);
    setToWalletId(id);
  }

  async function createCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const type = categoryType;
    if (demo) {
      const local: CatatCategory = { id: `local-${trimmed}`, name: trimmed, type, color: null };
      setExtraCategories((current) => [...current, local]);
      selectCategory({ id: local.id, label: local.name });
      setPanel("keypad");
      setQuery("");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      selectCategory({ id: null, label: trimmed });
      toast(t("offlineCategory"));
      setPanel("keypad");
      setQuery("");
      return;
    }
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("notSignedIn"));
        return;
      }
      const { data: row, error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name: trimmed, type, color: null })
        .select("id,name,type,color")
        .single();
      if (error || !row) {
        toast.error(t("failed", { table: "categories", message: error?.message ?? "-" }));
        return;
      }
      const created = row as CatatCategory;
      setExtraCategories((current) => [...current, created]);
      selectCategory({ id: created.id, label: created.name });
      toast.success(t("categoryCreated", { name: created.name }));
      setPanel("keypad");
      setQuery("");
    } catch (error) {
      toast.error(
        t("failed", { table: "categories", message: error instanceof Error ? error.message : String(error) }),
      );
    }
  }

  function successMessage() {
    const money = formatMoney(amount, { locale });
    if (mode === "expense") return t("savedExpense", { amount: money });
    if (mode === "income") return t("savedIncome", { amount: money });
    if (mode === "transfer") return t("savedTransfer", { amount: money });
    return debtDirection === "payable"
      ? t("savedPayable", { amount: money, name: contact.trim() })
      : t("savedReceivable", { amount: money, name: contact.trim() });
  }

  function savedEntry(table: SavedTable, row: unknown) {
    if (!row || typeof row !== "object") return null;
    const names = new Map(wallets.map((wallet) => [wallet.id, wallet.name]));
    return rowToEntry(table, row as Record<string, unknown>, names);
  }

  async function save() {
    if (saving) return;
    setAttempted(true);
    if (issue) {
      if (issue === "contact") setPanel("contact");
      return;
    }
    const { table, payload } = editing
      ? buildCatatUpdate(draft, categories, wallets, editing)
      : buildCatatPayload(draft, categories, wallets);

    if (demo) {
      toast.success(editing ? tr("edit.saved") : successMessage(), { description: t("demoSaved") });
      onSaved?.();
      return;
    }

    if (editing) {
      await saveEdit(table, payload);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (table === "wallet_transfers") {
        toast.error(t("offlineTransfer"));
        return;
      }
      enqueueOfflineMutation(table, payload);
      rememberWallet(walletId);
      toast(t("queued"));
      onSaved?.();
      return;
    }

    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("notSignedIn"));
        return;
      }
      const { data: saved, error } = await supabase
        .from(table)
        .insert({ user_id: user.id, ...payload })
        .select(SAVED_COLUMNS[table])
        .single();
      if (error) {
        toast.error(t("failed", { table, message: error.message }));
        return;
      }
      // Optional paired admin fee expense when transferring between wallets/e-wallets.
      const feeRow = buildTransferFeePayload(draft, wallets, {
        categoryLabel: locale === "en" ? "Admin Fee" : "Biaya Admin",
      });
      if (feeRow) {
        const { error: feeErr } = await supabase
          .from(feeRow.table)
          .insert({ user_id: user.id, ...feeRow.payload });
        if (feeErr) {
          toast.error(t("failed", { table: feeRow.table, message: feeErr.message }));
        }
      }
      rememberWallet(walletId);
      toast.success(successMessage());
      onSaved?.();
      onRecorded?.(savedEntry(table, saved), { isNew: true });
    } catch (error) {
      toast.error(t("failed", { table, message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(table: SavedTable, payload: Record<string, unknown>) {
    if (!editing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error(tr("edit.offline"));
      return;
    }
    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("notSignedIn"));
        return;
      }
      const { data: saved, error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", editing.id)
        .eq("user_id", user.id)
        .select(SAVED_COLUMNS[table])
        .single();
      if (error) {
        toast.error(tr("edit.failed", { table, message: error.message }));
        return;
      }
      rememberWallet(walletId);
      toast.success(tr("edit.saved"));
      onSaved?.();
      onRecorded?.(savedEntry(table, saved), { isNew: false });
    } catch (error) {
      toast.error(tr("edit.failed", { table, message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setSaving(false);
    }
  }

  return {
    t,
    tr,
    locale,
    data,
    editing,
    allowedModes,
    mode,
    setMode,
    amount,
    setAmount,
    categories,
    pick,
    selectCategory,
    applyTemplate,
    templates: editing ? [] : templates.filter((template) => template.type === mode),
    walletId,
    setWalletId,
    toWalletId,
    chooseFromWallet,
    chooseToWallet,
    swapWallets,
    wallets,
    dateKey,
    setDateKey,
    note,
    setNote,
    merchant,
    setMerchant,
    merchants: data.merchants ?? [],
    transferFee,
    setTransferFee,
    pasteText,
    setPasteText,
    applyQuickCapture(raw: string) {
      const parsed = parseBankNotification(raw);
      if (!parsed) {
        toast.error(locale === "en" ? "Could not detect an amount from that text." : "Nominal tidak terdeteksi dari teks tersebut.");
        return;
      }
      setMode(parsed.mode);
      setAmount(parsed.amount);
      if (parsed.merchant) setMerchant(parsed.merchant);
      if (parsed.note) setNote(parsed.note);
      setPasteText("");
      setPanel("keypad");
      toast.success(locale === "en" ? "Notification parsed." : "Teks mutasi berhasil dibaca.");
    },
    debtDirection,
    setDebtDirection,
    contact,
    setContact,
    contacts,
    panel,
    setPanel,
    query,
    setQuery,
    createCategory,
    issue,
    attempted,
    saving,
    save,
  };
}

export type CatatFormState = ReturnType<typeof useCatatForm>;

export function CatatModeSwitch({ form, layoutId }: { form: CatatFormState; layoutId?: string }) {
  const { t } = form;
  if (form.allowedModes.length === 1) {
    return (
      <p className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight text-text">
        {form.mode === "transfer" ? form.tr("edit.titleTransfer") : form.tr("edit.titleDebt")}
      </p>
    );
  }
  return (
    <SegmentedControl<CatatMode>
      label={t("modeLabel")}
      layoutId={layoutId}
      value={form.mode}
      onChange={(next) => {
        form.setMode(next);
        if (
          form.panel === "category" ||
          form.panel === "toWallet" ||
          form.panel === "contact" ||
          form.panel === "fee" ||
          form.panel === "merchant" ||
          form.panel === "paste"
        ) {
          form.setPanel("keypad");
        }
      }}
      options={form.allowedModes.map((value) => ({
        value,
        label: t(`modes.${value}`),
        tone: MODE_TONE[value],
      }))}
    />
  );
}

function walletName(form: CatatFormState, id: string | null) {
  return form.wallets.find((wallet) => wallet.id === id)?.name ?? form.t("noWallet");
}

function walletIcon(form: CatatFormState, id: string | null) {
  const kind = form.wallets.find((wallet) => wallet.id === id)?.kind;
  return kind ? walletIcons[kind] : WalletIcon;
}

function dateLabel(form: CatatFormState) {
  const today = jakartaDateKey();
  if (form.dateKey === today) return form.t("today");
  if (form.dateKey === addDaysToKey(today, -1)) return form.t("yesterday");
  return formatDateKey(form.dateKey, form.locale, { weekday: "short", day: "numeric", month: "short" });
}

function togglePanel(form: CatatFormState, panel: Panel) {
  form.setPanel(form.panel === panel ? "keypad" : panel);
}

/** Body of the Catat sheet: amount, mode-specific choices, meta chips, keypad or picker. */
export function CatatBody({
  form,
  layoutId,
  captureKeyboard = true,
}: {
  form: CatatFormState;
  layoutId?: string;
  /** Listen to the physical keyboard (off for static gallery previews). */
  captureKeyboard?: boolean;
}) {
  const { t, mode } = form;

  return (
    <div className="grid gap-3.5">
      <AmountDisplay
        value={form.amount}
        placeholder
        label={t("amount")}
        className="mt-1 min-h-[54px]"
      />

      {mode === "expense" || mode === "income" ? <CategoryChips form={form} /> : null}
      {mode === "transfer" ? <TransferWallets form={form} /> : null}
      {mode === "debt" && form.editing && (form.editing.debtPaid ?? 0) > 0 ? (
        <p className="rounded-control border border-line bg-surface-2/50 px-3.5 py-2.5 text-[13px] text-muted">
          <span className="font-semibold text-debt">
            {form.debtDirection === "payable" ? t("debtPayable") : t("debtReceivable")}
          </span>
          <span aria-hidden="true"> · </span>
          {form.tr("edit.directionLocked")}
        </p>
      ) : mode === "debt" ? (
        <SegmentedControl<DebtDirectionChoice>
          size="sm"
          label={t("debtDirectionLabel")}
          layoutId={layoutId ? `${layoutId}-debt` : undefined}
          value={form.debtDirection}
          onChange={form.setDebtDirection}
          options={[
            { value: "payable", label: t("debtPayable"), tone: "debt" },
            { value: "receivable", label: t("debtReceivable"), tone: "debt" },
          ]}
        />
      ) : null}

      <MetaChips form={form} />

      <div
        className="h-[232px]"
        onKeyDown={(event) => {
          if (event.key === "Escape" && form.panel !== "keypad") {
            event.preventDefault();
            event.stopPropagation();
            form.setPanel("keypad");
          }
        }}
      >
        {form.panel === "keypad" ? (
          <AmountKeypad
            value={form.amount}
            onChange={form.setAmount}
            onSubmit={() => void form.save()}
            captureKeyboard={captureKeyboard}
            disabled={form.saving}
          />
        ) : (
          <PickerPanel form={form} />
        )}
      </div>
    </div>
  );
}

function CategoryChips({ form }: { form: CatatFormState }) {
  const { t } = form;
  const groupRef = React.useRef<HTMLDivElement>(null);
  useRowClamp(groupRef, 2);
  const pick = form.pick;
  const visible: CategoryPick[] = form.categories
    .slice(0, VISIBLE_CATEGORIES)
    .map((category) => ({ id: category.id, label: category.name }));
  const pickVisible =
    !pick || visible.some((item) => (pick.id ? item.id === pick.id : item.label === pick.label));
  if (pick && !pickVisible) {
    if (visible.length >= VISIBLE_CATEGORIES) visible.pop();
    visible.unshift(pick);
  }

  return (
    <div className="grid gap-2.5">
      {form.templates.length ? (
        <ChipGroup label={t("templates")} scroll className="md:-mx-6 md:px-6">
          {form.templates.map((template) => (
            <Chip key={template.id} variant="dashed" onClick={() => form.applyTemplate(template)}>
              {template.label}
              <span className="ml-1 text-muted tabular-nums">
                {formatMoney(template.amount, { locale: form.locale, compact: true })}
              </span>
            </Chip>
          ))}
        </ChipGroup>
      ) : null}
      <ChipGroup ref={groupRef} label={t("categories")}>
        {visible.map((category) => {
          const selected = Boolean(
            form.pick && (category.id ? form.pick.id === category.id : form.pick.label === category.label),
          );
          return (
            <Chip variant="choice"
              key={category.id ?? `label-${category.label}`}
              data-keep={selected ? "" : undefined}
              selected={selected}
              onClick={() => form.selectCategory(selected ? null : category)}
            >
              {category.label}
            </Chip>
          );
        })}
        <Chip
          data-pin=""
          variant="dashed"
          icon={Plus}
          aria-expanded={form.panel === "category"}
          onClick={() => togglePanel(form, "category")}
        >
          {t("moreCategories")}
        </Chip>
      </ChipGroup>
    </div>
  );
}

function TransferWallets({ form }: { form: CatatFormState }) {
  const { t } = form;
  const FromIcon = walletIcon(form, form.walletId);
  const ToIcon = walletIcon(form, form.toWalletId);
  return (
    <div className="flex items-center gap-2">
      <Chip
        variant="meta"
        icon={FromIcon}
        chevron
        className="h-11 min-w-0 flex-1 shrink justify-start"
        aria-expanded={form.panel === "wallet"}
        onClick={() => togglePanel(form, "wallet")}
      >
        {t("fromWallet", { name: walletName(form, form.walletId) })}
      </Chip>
      <IconButton
        label={t("swapWallets")}
        size="sm"
        variant="secondary"
        onClick={form.swapWallets}
        disabled={form.wallets.length < 2}
      >
        <ArrowLeftRight aria-hidden="true" />
      </IconButton>
      <Chip
        variant="meta"
        icon={ToIcon}
        chevron
        className="h-11 min-w-0 flex-1 shrink justify-start"
        aria-expanded={form.panel === "toWallet"}
        onClick={() => togglePanel(form, "toWallet")}
      >
        {t("toWallet", { name: walletName(form, form.toWalletId) })}
      </Chip>
    </div>
  );
}

function MetaChips({ form }: { form: CatatFormState }) {
  const { t, mode } = form;
  const Icon = walletIcon(form, form.walletId);
  const name = walletName(form, form.walletId);
  const walletText =
    mode === "debt"
      ? form.debtDirection === "payable"
        ? t("debtPayableWallet", { name })
        : t("debtReceivableWallet", { name })
      : name;

  return (
    <ChipGroup label={t("details")}>
      {mode === "debt" ? (
        <Chip
          variant="meta"
          icon={UserRound}
          chevron
          aria-expanded={form.panel === "contact"}
          onClick={() => togglePanel(form, "contact")}
          className={cn(form.attempted && form.issue === "contact" && "border-expense")}
        >
          {form.contact.trim() || t("contact")}
        </Chip>
      ) : null}
      {mode !== "transfer" ? (
        <Chip
          variant="meta"
          icon={Icon}
          chevron
          aria-expanded={form.panel === "wallet"}
          onClick={() => togglePanel(form, "wallet")}
        >
          {walletText}
        </Chip>
      ) : null}
      <Chip
        variant="meta"
        icon={CalendarDays}
        chevron
        aria-expanded={form.panel === "date"}
        onClick={() => togglePanel(form, "date")}
      >
        {dateLabel(form)}
      </Chip>
      <Chip
        variant="meta"
        icon={NotebookPen}
        aria-expanded={form.panel === "note"}
        onClick={() => togglePanel(form, "note")}
        className="max-w-[12rem]"
      >
        {form.note.trim() || t("addNote")}
      </Chip>
      {mode === "expense" || mode === "income" ? (
        <Chip
          variant="meta"
          icon={Store}
          aria-expanded={form.panel === "merchant"}
          onClick={() => togglePanel(form, "merchant")}
          className="max-w-[12rem]"
        >
          {form.merchant.trim() || (form.locale === "en" ? "Place" : "Tempat")}
        </Chip>
      ) : null}
      {mode === "transfer" && !form.editing ? (
        <Chip
          variant="meta"
          icon={Receipt}
          aria-expanded={form.panel === "fee"}
          onClick={() => togglePanel(form, "fee")}
        >
          {form.transferFee > 0
            ? `${form.locale === "en" ? "Fee" : "Admin"} ${formatMoney(form.transferFee, { locale: form.locale, compact: true })}`
            : form.locale === "en"
              ? "Admin fee"
              : "Biaya admin"}
        </Chip>
      ) : null}
      {(mode === "expense" || mode === "income") && !form.editing ? (
        <Chip
          variant="meta"
          icon={ClipboardPaste}
          aria-expanded={form.panel === "paste"}
          onClick={() => togglePanel(form, "paste")}
        >
          {form.locale === "en" ? "Paste SMS/QRIS" : "Tempel mutasi"}
        </Chip>
      ) : null}
    </ChipGroup>
  );
}

function PanelFrame({
  form,
  title,
  children,
}: {
  form: CatatFormState;
  title: string;
  children: React.ReactNode;
}) {
  const ui = useTranslations("ui");
  return (
    <div className="flex h-full flex-col rounded-control border border-line bg-surface-2/50">
      <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-line pl-3.5 pr-1">
        <p className="text-[13px] font-semibold text-text">{title}</p>
        <Button size="sm" variant="ghost" className="text-primary-ink" onClick={() => form.setPanel("keypad")}>
          {ui("done")}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
    </div>
  );
}

function WalletOptions({
  form,
  selectedId,
  disabledId,
  onSelect,
}: {
  form: CatatFormState;
  selectedId: string | null;
  disabledId?: string | null;
  onSelect: (id: string) => void;
}) {
  if (!form.wallets.length) {
    return <p className="px-1 py-2 text-[13px] text-muted">{form.t("hintNoWallets")}</p>;
  }
  return (
    <div role="radiogroup" aria-label={form.t("pickWallet")} className="grid gap-1">
      {form.wallets.map((wallet) => {
        const Icon = walletIcons[wallet.kind];
        const selected = wallet.id === selectedId;
        const disabled = wallet.id === disabledId;
        return (
          <button
            key={wallet.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => {
              onSelect(wallet.id);
              form.setPanel("keypad");
            }}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-chip px-2.5 text-left text-[14px] font-medium text-text outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40",
              selected && "bg-primary-soft",
            )}
          >
            <Icon className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{wallet.name}</span>
            {selected ? <Check className="size-[18px] text-primary-ink" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function PickerPanel({ form }: { form: CatatFormState }) {
  const { t } = form;

  if (form.panel === "wallet") {
    return (
      <PanelFrame form={form} title={form.mode === "transfer" ? t("pickFromWallet") : t("pickWallet")}>
        <WalletOptions
          form={form}
          selectedId={form.walletId}
          onSelect={form.mode === "transfer" ? form.chooseFromWallet : form.setWalletId}
        />
      </PanelFrame>
    );
  }

  if (form.panel === "toWallet") {
    return (
      <PanelFrame form={form} title={t("pickToWallet")}>
        <WalletOptions form={form} selectedId={form.toWalletId} onSelect={form.chooseToWallet} />
      </PanelFrame>
    );
  }

  if (form.panel === "date") {
    const today = jakartaDateKey();
    const quick = [0, 1, 2, 3].map((offset) => addDaysToKey(today, -offset));
    return (
      <PanelFrame form={form} title={t("pickDate")}>
        <div className="grid gap-3">
          <ChipGroup label={t("pickDate")}>
            {quick.map((key, index) => (
              <Chip variant="choice"
                key={key}
                selected={form.dateKey === key}
                onClick={() => {
                  form.setDateKey(key);
                  form.setPanel("keypad");
                }}
              >
                {index === 0
                  ? t("today")
                  : index === 1
                    ? t("yesterday")
                    : formatDateKey(key, form.locale, { weekday: "short", day: "numeric", month: "short" })}
              </Chip>
            ))}
          </ChipGroup>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium text-muted">{t("otherDate")}</span>
            <input
              type="date"
              value={form.dateKey}
              max={today}
              onChange={(event) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) form.setDateKey(event.target.value);
              }}
              className={cn(inputClassName, "min-h-11 [color-scheme:inherit]")}
            />
          </label>
        </div>
      </PanelFrame>
    );
  }

  if (form.panel === "note") {
    return (
      <PanelFrame form={form} title={t("note")}>
        <input
          autoFocus
          type="text"
          value={form.note}
          maxLength={140}
          enterKeyHint="done"
          aria-label={t("note")}
          placeholder={t("notePlaceholder")}
          onChange={(event) => form.setNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              form.setPanel("keypad");
            }
          }}
          className={inputClassName}
        />
      </PanelFrame>
    );
  }

  if (form.panel === "merchant") {
    const queryText = form.merchant.trim().toLowerCase();
    const suggestions = form.merchants
      .filter((name) => !queryText || name.toLowerCase().includes(queryText))
      .slice(0, 8);
    const isEn = form.locale === "en";
    return (
      <PanelFrame form={form} title={isEn ? "Place / Merchant" : "Tempat / Toko"}>
        <div className="grid gap-3">
          <input
            autoFocus
            type="text"
            value={form.merchant}
            maxLength={80}
            enterKeyHint="done"
            aria-label={isEn ? "Place or merchant" : "Tempat atau toko"}
            placeholder={isEn ? "e.g. Kopi Kenangan, Indomaret" : "Mis. Kopi Kenangan, Indomaret"}
            onChange={(event) => form.setMerchant(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                form.setPanel("keypad");
              }
            }}
            className={inputClassName}
          />
          {suggestions.length ? (
            <ChipGroup label={isEn ? "Recent places" : "Tempat terakhir"}>
              {suggestions.map((name) => (
                <Chip
                  key={name}
                  variant="choice"
                  selected={form.merchant.trim() === name}
                  onClick={() => {
                    form.setMerchant(name);
                    form.setPanel("keypad");
                  }}
                >
                  {name}
                </Chip>
              ))}
            </ChipGroup>
          ) : null}
        </div>
      </PanelFrame>
    );
  }

  if (form.panel === "fee") {
    const isEn = form.locale === "en";
    return (
      <PanelFrame form={form} title={isEn ? "Transfer admin fee" : "Biaya admin transfer"}>
        <div className="grid gap-3">
          <AmountField value={form.transferFee} onChange={form.setTransferFee} />
          <ChipGroup label={isEn ? "Common fees" : "Biaya umum"}>
            {[0, 1000, 2500, 6500].map((fee) => (
              <Chip
                key={fee}
                variant="choice"
                selected={form.transferFee === fee}
                onClick={() => {
                  form.setTransferFee(fee);
                  form.setPanel("keypad");
                }}
              >
                {fee === 0 ? (isEn ? "Free" : "Gratis") : formatMoney(fee, { locale: form.locale })}
              </Chip>
            ))}
          </ChipGroup>
          <p className="text-[12px] text-muted">
            {isEn
              ? "Recorded as a separate admin fee expense from the sender wallet."
              : "Dicatat otomatis sebagai pengeluaran Biaya Admin dari dompet pengirim."}
          </p>
        </div>
      </PanelFrame>
    );
  }

  if (form.panel === "paste") {
    const isEn = form.locale === "en";
    return (
      <PanelFrame form={form} title={isEn ? "Paste bank / QRIS notification" : "Tempel teks mutasi / QRIS"}>
        <div className="grid gap-2.5">
          <textarea
            autoFocus
            rows={3}
            value={form.pasteText}
            onChange={(event) => form.setPasteText(event.target.value)}
            placeholder={
              isEn
                ? "Paste BCA, Mandiri, GoPay, or QRIS notification text..."
                : "Tempel notif BCA, Livin, BRImo, GoPay, atau QRIS..."
            }
            className={cn(inputClassName, "min-h-[84px] py-2 text-[13px]")}
          />
          <Button
            type="button"
            size="sm"
            disabled={!form.pasteText.trim()}
            onClick={() => form.applyQuickCapture(form.pasteText)}
          >
            {isEn ? "Parse & fill" : "Baca otomatis"}
          </Button>
        </div>
      </PanelFrame>
    );
  }

  if (form.panel === "contact") {
    const queryText = form.contact.trim().toLowerCase();
    const suggestions = form.contacts
      .filter((name) => !queryText || name.toLowerCase().includes(queryText))
      .slice(0, 8);
    return (
      <PanelFrame form={form} title={t("contactLabel")}>
        <div className="grid gap-3">
          <input
            autoFocus
            type="text"
            value={form.contact}
            maxLength={80}
            enterKeyHint="done"
            aria-label={t("contactLabel")}
            aria-invalid={form.attempted && form.issue === "contact" ? true : undefined}
            placeholder={t("contactPlaceholder")}
            onChange={(event) => form.setContact(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                form.setPanel("keypad");
              }
            }}
            className={inputClassName}
          />
          {suggestions.length ? (
            <div className="grid gap-2">
              <p className="text-[12px] font-medium text-muted">{t("recentContacts")}</p>
              <ChipGroup label={t("recentContacts")}>
                {suggestions.map((name) => (
                  <Chip variant="choice"
                    key={name}
                    selected={form.contact.trim() === name}
                    onClick={() => {
                      form.setContact(name);
                      form.setPanel("keypad");
                    }}
                  >
                    {name}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          ) : null}
        </div>
      </PanelFrame>
    );
  }

  // Category search / create.
  const queryText = form.query.trim();
  const lower = queryText.toLowerCase();
  const matches = form.categories.filter((category) => !lower || category.name.toLowerCase().includes(lower));
  const exact = form.categories.some((category) => category.name.toLowerCase() === lower);
  return (
    <PanelFrame form={form} title={t("pickCategory")}>
      <div className="grid gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={form.query}
            aria-label={t("searchCategory")}
            placeholder={t("searchCategory")}
            onChange={(event) => form.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (matches.length === 1) {
                  form.selectCategory({ id: matches[0].id, label: matches[0].name });
                  form.setPanel("keypad");
                  form.setQuery("");
                } else if (queryText && !exact) {
                  void form.createCategory(queryText);
                }
              }
            }}
            className={cn(inputClassName, "min-h-11 pl-9")}
          />
        </div>
        <ChipGroup label={t("categories")}>
          {matches.map((category) => (
            <Chip variant="choice"
              key={category.id}
              selected={form.pick?.id === category.id}
              onClick={() => {
                form.selectCategory({ id: category.id, label: category.name });
                form.setPanel("keypad");
                form.setQuery("");
              }}
            >
              {category.name}
            </Chip>
          ))}
          {queryText && !exact ? (
            <Chip variant="dashed" icon={Plus} onClick={() => void form.createCategory(queryText)}>
              {t("createCategory", { name: queryText })}
            </Chip>
          ) : null}
        </ChipGroup>
        {!matches.length && !queryText ? (
          <p className="text-[13px] text-muted">{t("noCategoryMatch")}</p>
        ) : null}
      </div>
    </PanelFrame>
  );
}

/** Pinned footer: validation hint + Save. */
export function CatatFooter({ form }: { form: CatatFormState }) {
  const { t } = form;
  const hint =
    form.attempted && form.issue
      ? form.issue === "amount"
        ? t("hintAmount")
        : form.issue === "wallets"
          ? t("hintWallets")
          : form.issue === "belowPaid"
            ? form.tr("edit.belowPaid", {
                amount: formatMoney(form.editing?.debtPaid ?? 0, { locale: form.locale }),
              })
            : t("hintContact")
      : form.mode === "transfer" && form.wallets.length < 2
        ? t("hintWallets")
        : !form.wallets.length
          ? t("hintNoWallets")
          : null;

  return (
    <div className="grid gap-2">
      {hint ? (
        <p role="status" className={cn("text-center text-[12px]", form.attempted && form.issue ? "text-expense" : "text-muted")}>
          {hint}
        </p>
      ) : null}
      <Button size="lg" fullWidth isLoading={form.saving} onClick={() => void form.save()} type="button">
        {form.editing ? form.tr("edit.save") : t("save")}
      </Button>
    </div>
  );
}
