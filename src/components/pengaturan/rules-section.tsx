"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { AmountInput } from "@/components/pengaturan/amount-input";
import { ConfirmSheet } from "@/components/pengaturan/confirm-sheet";
import { SettingsSection, writeError } from "@/components/pengaturan/section";
import { AmountText } from "@/components/ui/amount-display";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { TextChoice } from "@/components/flat/controls";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { isTempId, tempId } from "@/lib/list-change";
import {
  MAX_RULE_DAY,
  buildRecurringRow,
  buildTemplateRow,
  monthlyRecurringTotals,
  validateRuleDraft,
  type RuleDraft,
  type RuleIssue,
} from "@/lib/settings-rules";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { RECURRING_COLUMNS, TEMPLATE_COLUMNS, mapRecurring, mapTemplate } from "@/lib/finance-data";
import type { Category, RecurringTransaction, TransactionTemplate, TransactionType } from "@/lib/types";
import { useSyncedList } from "@/lib/use-synced-list";
import { cn } from "@/lib/utils";

type WalletOption = { id: string; name: string };
type Kind = "recurring" | "template";
type EditorState = { open: boolean; session: number; draft: RuleDraft; id: string | null };
type PageInfo = { page: number; totalPages: number; totalItems: number };

const emptyDraft = (kind: Kind): RuleDraft => ({
  type: "expense",
  amount: 0,
  label: "",
  categoryId: null,
  walletId: null,
  dayOfMonth: kind === "recurring" ? 1 : undefined,
  cadence: kind === "recurring" ? "monthly" : undefined,
  dayOfWeek: null,
  monthOfYear: null,
  endOfMonth: false,
  isActive: true,
});

const WEEKDAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function scheduleSummary(rule: RecurringTransaction, fallback: string) {
  if (rule.cadence === "weekly") {
    return `Tiap ${WEEKDAYS_ID[rule.day_of_week ?? 1] ?? "Senin"}`;
  }
  if (rule.cadence === "yearly") {
    const monthName = MONTHS_ID[(rule.month_of_year ?? 1) - 1] ?? "Jan";
    return `Tiap ${rule.end_of_month ? "akhir" : rule.day_of_month} ${monthName}`;
  }
  if (rule.end_of_month) return "Akhir bulan";
  return fallback;
}

function useEditor(kind: Kind) {
  const [state, setState] = React.useState<EditorState>({ open: false, session: 0, draft: emptyDraft(kind), id: null });
  return {
    state,
    open: (draft: RuleDraft, id: string | null) =>
      setState((current) => ({ open: true, session: current.session + 1, draft, id })),
    setOpen: (open: boolean) => setState((current) => ({ ...current, open })),
  };
}

const rowButton =
  "flex min-h-[64px] w-full items-center gap-3 py-2 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

const byDay = (a: RecurringTransaction, b: RecurringTransaction) => a.day_of_month - b.day_of_month;
const bySort = (a: TransactionTemplate, b: TransactionTemplate) => a.sort_order - b.sort_order;

export function RecurringSection({
  userId,
  items,
  active,
  categories,
  wallets,
  pageInfo,
}: {
  userId: string;
  items: RecurringTransaction[];
  /** All active rules (type + amount) for the monthly totals. */
  active: Array<{ type: TransactionType; amount: number; is_active: boolean }>;
  categories: Category[];
  wallets: WalletOption[];
  pageInfo: PageInfo;
}) {
  const t = useTranslations("pengaturan");
  const editor = useEditor("recurring");
  const { list, mutate } = useSyncedList(items, byDay);
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const totals = monthlyRecurringTotals(active);

  async function write(id: string | null, draft: RuleDraft) {
    const row = buildRecurringRow(draft, categories, wallets);
    const optimistic: RecurringTransaction = {
      id: id ?? tempId(),
      merchant: null,
      last_generated_month: list.find((rule) => rule.id === id)?.last_generated_month ?? null,
      ...row,
    };
    const supabase = createBrowserSupabaseClient();
    const error = await mutate({ type: "upsert", item: optimistic }, async () => {
      const result = id
        ? await supabase.from("recurring_transactions").update(row).eq("id", id).eq("user_id", userId).select(RECURRING_COLUMNS).single()
        : await supabase.from("recurring_transactions").insert({ ...row, user_id: userId }).select(RECURRING_COLUMNS).single();
      if (result.error) return { error: writeError(id ? "update" : "insert", "recurring_transactions", result.error) };
      return { item: mapRecurring(result.data as unknown as Record<string, unknown>) };
    });
    return error;
  }

  async function save(id: string | null, draft: RuleDraft) {
    editor.setOpen(false);
    const error = await write(id, draft);
    if (error) toast.error(t("saveFailed"), { description: error });
    else toast.success(t("ruleSaved"));
  }

  async function toggle(rule: RecurringTransaction, next: boolean) {
    const error = await mutate({ type: "upsert", item: { ...rule, is_active: next } }, async () => {
      const { error: updateError } = await createBrowserSupabaseClient()
        .from("recurring_transactions")
        .update({ is_active: next })
        .eq("id", rule.id)
        .eq("user_id", userId);
      return updateError ? { error: writeError("update", "recurring_transactions.is_active", updateError) } : {};
    });
    if (error) toast.error(t("saveFailed"), { description: error });
  }

  async function remove(id: string) {
    setConfirming(null);
    editor.setOpen(false);
    const error = await mutate({ type: "remove", id }, async () => {
      const { error: deleteError } = await createBrowserSupabaseClient()
        .from("recurring_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      return deleteError ? { error: writeError("delete", "recurring_transactions", deleteError) } : {};
    });
    if (error) toast.error(t("deleteFailedGeneric"), { description: error });
    else toast.success(t("ruleDeleted"));
  }

  return (
    <SettingsSection
      id="berulang"
      title={t("recurringTitle")}
      description={t("recurringBody")}
      action={
        <Button size="sm" variant="secondary" onClick={() => editor.open(emptyDraft("recurring"), null)}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      }
    >
      {list.length ? (
        <>
          <p className="pt-1 text-[12px] text-muted">
            {t("recurringTotals")} <AmountText value={totals.expense} tone="expense" className="font-semibold" />
            {totals.income ? (
              <>
                <span aria-hidden="true"> · </span>
                {t("recurringIncome")} <AmountText value={totals.income} tone="income" className="font-semibold" />
              </>
            ) : null}
          </p>
          <ul className="mt-3 divide-y divide-line border-y border-line" data-testid="recurring-list">
            {list.map((rule) => (
              <li key={rule.id} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isTempId(rule.id)}
                  className={cn(rowButton, "min-w-0 flex-1", !rule.is_active && "opacity-60")}
                  onClick={() =>
                    editor.open(
                      {
                        type: rule.type,
                        amount: rule.amount,
                        label: rule.reason,
                        categoryId: rule.category_id,
                        walletId: rule.wallet_id,
                        dayOfMonth: Math.min(MAX_RULE_DAY, Math.max(1, rule.day_of_month)),
                        cadence: rule.cadence ?? "monthly",
                        dayOfWeek: rule.day_of_week ?? 1,
                        monthOfYear: rule.month_of_year ?? 1,
                        endOfMonth: Boolean(rule.end_of_month),
                        isActive: rule.is_active,
                      },
                      rule.id,
                    )
                  }
                  aria-label={t("editRule", { name: rule.reason })}
                >
                  <span
                    aria-hidden="true"
                    className="w-8 shrink-0 text-center text-[17px] font-bold text-text tabular-nums"
                  >
                    {rule.day_of_month}
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-[14px] font-medium text-text">{rule.reason || t("untitled")}</span>
                    <span className="truncate text-[12px] text-muted">
                      {[scheduleSummary(rule, t("everyDay", { day: rule.day_of_month })), rule.category_label, rule.wallet_label]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <AmountText
                    value={rule.amount}
                    tone={rule.type === "income" ? "income" : "neutral"}
                    sign={rule.type === "income" ? "always" : "auto"}
                    className="shrink-0 text-[14px] font-semibold"
                  />
                </button>
                <Switch
                  checked={rule.is_active}
                  disabled={isTempId(rule.id)}
                  onCheckedChange={(next) => void toggle(rule, next)}
                  label={t("ruleActive", { name: rule.reason })}
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="py-5 text-center text-[13px] leading-5 text-muted">{t("recurringEmpty")}</p>
      )}
      <Pagination page={pageInfo.page} totalPages={pageInfo.totalPages} pathname="/settings/berulang" />
      <RuleSheet
        key={editor.state.session}
        kind="recurring"
        state={editor.state}
        onOpenChange={editor.setOpen}
        categories={categories}
        wallets={wallets}
        onSave={(draft) => void save(editor.state.id, draft)}
        onDelete={() => setConfirming(editor.state.id)}
      />
      <ConfirmSheet
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next) setConfirming(null);
        }}
        title={t("deleteRuleTitle")}
        body={<p>{t("deleteRuleBody")}</p>}
        confirmLabel={t("delete")}
        onConfirm={() => {
          if (confirming) void remove(confirming);
        }}
      />
    </SettingsSection>
  );
}

export function TemplatesSection({
  userId,
  items,
  categories,
  wallets,
  nextSortOrder,
  pageInfo,
}: {
  userId: string;
  items: TransactionTemplate[];
  categories: Category[];
  wallets: WalletOption[];
  nextSortOrder: number;
  pageInfo: PageInfo;
}) {
  const t = useTranslations("pengaturan");
  const editor = useEditor("template");
  const { list, mutate } = useSyncedList(items, bySort);
  const [confirming, setConfirming] = React.useState<string | null>(null);

  async function save(id: string | null, draft: RuleDraft) {
    editor.setOpen(false);
    const row = buildTemplateRow(draft, categories, wallets);
    const existing = list.find((template) => template.id === id);
    const optimistic: TransactionTemplate = { id: id ?? tempId(), sort_order: existing?.sort_order ?? nextSortOrder, ...row };
    const supabase = createBrowserSupabaseClient();
    const error = await mutate({ type: "upsert", item: optimistic }, async () => {
      const result = id
        ? await supabase.from("transaction_templates").update(row).eq("id", id).eq("user_id", userId).select(TEMPLATE_COLUMNS).single()
        : await supabase
            .from("transaction_templates")
            .insert({ ...row, user_id: userId, sort_order: nextSortOrder })
            .select(TEMPLATE_COLUMNS)
            .single();
      if (result.error) return { error: writeError(id ? "update" : "insert", "transaction_templates", result.error) };
      return { item: mapTemplate(result.data as unknown as Record<string, unknown>) };
    });
    if (error) toast.error(t("saveFailed"), { description: error });
    else toast.success(t("templateSaved"));
  }

  async function remove(id: string) {
    setConfirming(null);
    editor.setOpen(false);
    const error = await mutate({ type: "remove", id }, async () => {
      const { error: deleteError } = await createBrowserSupabaseClient()
        .from("transaction_templates")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      return deleteError ? { error: writeError("delete", "transaction_templates", deleteError) } : {};
    });
    if (error) toast.error(t("deleteFailedGeneric"), { description: error });
    else toast.success(t("templateDeleted"));
  }

  return (
    <SettingsSection
      id="template"
      title={t("templatesTitle")}
      description={t("templatesBody")}
      action={
        <Button size="sm" variant="secondary" onClick={() => editor.open(emptyDraft("template"), null)}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      }
    >
      {list.length ? (
        <ul className="divide-y divide-line border-y border-line" data-testid="template-list">
          {list.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                disabled={isTempId(template.id)}
                className={rowButton}
                onClick={() =>
                  editor.open(
                    {
                      type: template.type,
                      amount: template.amount,
                      label: template.label,
                      categoryId: template.category_id,
                      walletId: template.wallet_id,
                    },
                    template.id,
                  )
                }
                aria-label={t("editTemplate", { name: template.label })}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", template.type === "income" ? "bg-income" : "bg-expense")}
                />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-[14px] font-medium text-text">{template.label}</span>
                  <span className="truncate text-[12px] text-muted">
                    {[template.category_label, template.wallet_label].filter(Boolean).join(" · ") ||
                      (template.type === "income" ? t("typeIncome") : t("typeExpense"))}
                  </span>
                </span>
                <AmountText
                  value={template.amount}
                  tone={template.type === "income" ? "income" : "neutral"}
                  sign={template.type === "income" ? "always" : "auto"}
                  className="shrink-0 text-[14px] font-semibold"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-5 text-center text-[13px] leading-5 text-muted">{t("templatesEmpty")}</p>
      )}
      <Pagination page={pageInfo.page} totalPages={pageInfo.totalPages} pathname="/settings/template" />
      <RuleSheet
        key={editor.state.session}
        kind="template"
        state={editor.state}
        onOpenChange={editor.setOpen}
        categories={categories}
        wallets={wallets}
        onSave={(draft) => void save(editor.state.id, draft)}
        onDelete={() => setConfirming(editor.state.id)}
      />
      <ConfirmSheet
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next) setConfirming(null);
        }}
        title={t("deleteTemplateTitle")}
        body={<p>{t("deleteTemplateBody")}</p>}
        confirmLabel={t("delete")}
        onConfirm={() => {
          if (confirming) void remove(confirming);
        }}
      />
    </SettingsSection>
  );
}

function RuleSheet({
  kind,
  state,
  onOpenChange,
  categories,
  wallets,
  onSave,
  onDelete,
}: {
  kind: Kind;
  state: EditorState;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  wallets: WalletOption[];
  onSave: (draft: RuleDraft) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("pengaturan");
  const [draft, setDraft] = React.useState<RuleDraft>(state.draft);
  const [issue, setIssue] = React.useState<RuleIssue | null>(null);
  const editing = state.id !== null;
  const typeCategories = categories
    .filter((category) => category.type === draft.type)
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
  const amountId = React.useId();

  function patch(next: Partial<RuleDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setIssue(null);
  }

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    const problem = validateRuleDraft(draft, kind);
    if (problem) {
      setIssue(problem);
      return;
    }
    onSave(draft);
  }

  const title =
    kind === "recurring"
      ? editing
        ? t("editRuleTitle")
        : t("newRuleTitle")
      : editing
        ? t("editTemplateTitle")
        : t("newTemplateTitle");

  return (
    <Sheet
      open={state.open}
      onOpenChange={onOpenChange}
      title={title}
      description={kind === "recurring" ? t("ruleSheetHint") : t("templateSheetHint")}
      size="md"
      footer={
        <div className="flex gap-2">
          {editing ? (
            <Button variant="danger" onClick={onDelete}>
              {t("delete")}
            </Button>
          ) : null}
          <Button className="flex-1" onClick={() => submit()}>
            {t("save")}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="grid gap-4 pt-1">
        <TextChoice
          label={t("ruleType")}
          value={draft.type}
          onChange={(type: TransactionType) => patch({ type, categoryId: null })}
          options={[
            { value: "expense", label: t("typeExpense"), tone: "expense" },
            { value: "income", label: t("typeIncome"), tone: "income" },
          ]}
        />
        <div className="grid gap-1.5">
          <label htmlFor={amountId} className="text-[13px] font-semibold text-text">
            {t("amountLabel")}
          </label>
          <AmountInput id={amountId} value={draft.amount} onChange={(amount) => patch({ amount })} invalid={issue === "amount"} />
          {issue === "amount" ? (
            <span role="alert" className="text-xs font-medium text-expense">
              {t("amountRequired")}
            </span>
          ) : null}
        </div>
        <Field
          label={kind === "recurring" ? t("ruleNoteLabel") : t("templateLabel")}
          error={issue === "label" ? t("labelRequired") : undefined}
        >
          <Input
            value={draft.label}
            onChange={(event) => patch({ label: event.target.value })}
            maxLength={60}
            placeholder={kind === "recurring" ? t("ruleNotePlaceholder") : t("templatePlaceholder")}
            aria-invalid={issue === "label" || undefined}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("categoryLabel")} optional={t("optional")}>
            <Select value={draft.categoryId ?? ""} onChange={(event) => patch({ categoryId: event.target.value || null })}>
              <option value="">{t("noCategory")}</option>
              {typeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("walletLabel")} optional={t("optional")}>
            <Select value={draft.walletId ?? ""} onChange={(event) => patch({ walletId: event.target.value || null })}>
              <option value="">{t("noWallet")}</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {kind === "recurring" ? (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              <Field label="Siklus">
                <Select
                  value={draft.endOfMonth ? "eom" : (draft.cadence ?? "monthly")}
                  onChange={(event) => {
                    const val = event.target.value;
                    if (val === "eom") {
                      patch({ cadence: "monthly", endOfMonth: true, dayOfMonth: 28 });
                    } else if (val === "weekly") {
                      patch({ cadence: "weekly", endOfMonth: false, dayOfWeek: draft.dayOfWeek ?? 1 });
                    } else if (val === "yearly") {
                      patch({ cadence: "yearly", endOfMonth: false, monthOfYear: draft.monthOfYear ?? 1 });
                    } else {
                      patch({ cadence: "monthly", endOfMonth: false });
                    }
                  }}
                >
                  <option value="monthly">Bulanan (tanggal 1–28)</option>
                  <option value="eom">Akhir bulan (28/30/31)</option>
                  <option value="weekly">Mingguan</option>
                  <option value="yearly">Tahunan</option>
                </Select>
              </Field>
              {draft.cadence === "weekly" ? (
                <Field label="Hari">
                  <Select
                    value={String(draft.dayOfWeek ?? 1)}
                    onChange={(event) => patch({ dayOfWeek: Number(event.target.value) })}
                  >
                    {WEEKDAYS_ID.map((dayName, idx) => (
                      <option key={dayName} value={idx}>
                        Tiap {dayName}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : draft.endOfMonth ? (
                <Field label={t("dayLabel")}>
                  <Input value="Otomatis di hari terakhir bulan" disabled />
                </Field>
              ) : (
                <Field label={t("dayLabel")} hint={t("dayHint")} error={issue === "day" ? t("dayInvalid") : undefined}>
                  <Select value={String(draft.dayOfMonth ?? 1)} onChange={(event) => patch({ dayOfMonth: Number(event.target.value) })}>
                    {Array.from({ length: MAX_RULE_DAY }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={day}>
                        {t("everyDay", { day })}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
            {draft.cadence === "yearly" ? (
              <Field label="Bulan">
                <Select
                  value={String(draft.monthOfYear ?? 1)}
                  onChange={(event) => patch({ monthOfYear: Number(event.target.value) })}
                >
                  {MONTHS_ID.map((mName, idx) => (
                    <option key={mName} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <div className="grid gap-1.5">
              <span className="text-[13px] font-semibold text-text">{t("activeLabel")}</span>
              <div className="flex min-h-12 items-center justify-between gap-3">
                <span className="text-[14px] text-muted">{draft.isActive ? t("activeOn") : t("activeOff")}</span>
                <Switch checked={draft.isActive ?? true} onCheckedChange={(isActive) => patch({ isActive })} label={t("activeLabel")} />
              </div>
            </div>
          </div>
        ) : null}
        {editing && kind === "recurring" ? <p className="text-[12px] text-muted">{t("ruleEditNote")}</p> : null}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Sheet>
  );
}
