"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Copy, PiggyBank, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { BudgetEditSheet, type BudgetEditTarget } from "@/components/budget/budget-edit-sheet";
import { AmountText } from "@/components/ui/amount-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMonthLabel, formatMoney, toUiLocale } from "@/components/ui/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import type { BudgetBoard, BudgetCopyPlan, BudgetRow } from "@/lib/budget-plan";
import { haptic } from "@/lib/haptics";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type BudgetViewProps = {
  userId: string;
  month: string;
  previousMonth: string;
  isCurrentMonth: boolean;
  daysLeft: number | null;
  board: BudgetBoard;
  previous: Record<string, { limit: number; spent: number }>;
  copyPlan: BudgetCopyPlan;
  hasCategories: boolean;
  /** UI gallery: never write to Supabase. */
  demo?: boolean;
};

const sectionCard = "lg:rounded-sheet lg:border lg:border-line lg:bg-surface lg:p-5";

export function BudgetView(props: BudgetViewProps) {
  const { board, copyPlan, month, previousMonth, userId, demo = false } = props;
  const t = useTranslations("budget");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const [editing, setEditing] = React.useState<{ target: BudgetEditTarget | null; open: boolean; session: number }>({
    target: null,
    open: false,
    session: 0,
  });
  const [copying, setCopying] = React.useState(false);

  const monthLabel = formatMonthLabel(month, locale);
  const previousLabel = formatMonthLabel(previousMonth, locale).split(" ")[0];

  function openEditor(row: BudgetRow) {
    const previous = props.previous[row.categoryId];
    setEditing((current) => ({
      open: true,
      session: current.session + 1,
      target: {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        limit: row.limit,
        spent: row.spent,
        previousLimit: previous?.limit ?? 0,
        previousSpent: previous?.spent ?? 0,
      },
    }));
  }

  async function copyFromPrevious() {
    if (!copyPlan.rows.length) return;
    setCopying(true);
    if (!demo) {
      const { error } = await createBrowserSupabaseClient()
        .from("monthly_budgets")
        .upsert(
          copyPlan.rows.map((row) => ({ ...row, user_id: userId })),
          { onConflict: "user_id,category_id,month" },
        );
      if (error) {
        setCopying(false);
        toast.error(t("copyFailed"), { description: `Supabase upsert on "monthly_budgets" failed: ${error.message}` });
        return;
      }
    }
    haptic("success");
    toast.success(t("copied", { count: copyPlan.rows.length, month: previousLabel }));
    setCopying(false);
    router.refresh();
  }

  const hasBudgets = board.budgeted.length > 0;
  const copyCallout = copyPlan.rows.length ? (
    <div className="flex flex-col gap-3 rounded-sheet border border-dashed border-line-strong p-4 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 text-[13px] leading-5 text-muted">
        {hasBudgets
          ? t("copyMissing", { count: copyPlan.rows.length, month: previousLabel })
          : t("copyAll", { count: copyPlan.rows.length, month: previousLabel })}
      </p>
      <Button
        variant={hasBudgets ? "secondary" : "primary"}
        size="sm"
        onClick={() => void copyFromPrevious()}
        isLoading={copying}
        className="shrink-0"
      >
        <Copy aria-hidden="true" />
        {t("copyButton", { month: previousLabel })}
      </Button>
    </div>
  ) : null;

  return (
    <>
      <div className="mx-auto grid max-w-2xl gap-7 lg:max-w-none lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="grid min-w-0 gap-7 lg:gap-6">
          {hasBudgets ? (
            <BudgetSummary {...props} monthLabel={monthLabel} />
          ) : (
            <section className="rounded-sheet border border-line bg-surface">
              <EmptyState
                icon={PiggyBank}
                title={t("emptyTitle")}
                body={props.hasCategories ? t("emptyBody") : t("emptyNoCategories")}
                className="py-9"
              />
            </section>
          )}
          {copyCallout}
          {hasBudgets ? (
            <section aria-labelledby="budget-list-heading" className={cn("grid gap-2", sectionCard)}>
              <SectionHeader
                id="budget-list-heading"
                title={t("perCategory")}
                meta={t("categoryCount", { count: board.budgeted.length })}
              />
              <ul className="divide-y divide-line">
                {board.budgeted.map((row) => (
                  <li key={row.categoryId}>
                    <BudgetLine row={row} onEdit={() => openEditor(row)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-7 lg:gap-6">
          {board.unbudgetedWithSpending.length ? (
            <section aria-labelledby="budget-unset-heading" className={cn("grid gap-2", sectionCard)}>
              <SectionHeader
                id="budget-unset-heading"
                title={t("unbudgeted")}
                meta={<AmountText value={board.totals.unbudgetedSpent} tone="muted" />}
              />
              <p className="-mt-1 text-[12px] text-muted">{t("unbudgetedHint")}</p>
              <ul className="divide-y divide-line">
                {board.unbudgetedWithSpending.map((row) => (
                  <li key={row.categoryId}>
                    <UnsetLine row={row} onEdit={() => openEditor(row)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {board.idle.length ? (
            <IdleCategories rows={board.idle} onEdit={openEditor} defaultOpen={!hasBudgets} />
          ) : null}
        </div>
      </div>

      <BudgetEditSheet
        key={editing.session}
        target={editing.target}
        open={editing.open}
        onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
        month={month}
        monthLabel={monthLabel}
        userId={userId}
        demo={demo}
      />
    </>
  );
}

function BudgetSummary({
  board,
  isCurrentMonth,
  daysLeft,
  monthLabel,
}: BudgetViewProps & { monthLabel: string }) {
  const t = useTranslations("budget");
  const locale = toUiLocale(useLocale());
  const { totals } = board;
  const over = totals.remaining < 0;
  const money = (value: number) => formatMoney(value, { locale });

  return (
    <section aria-labelledby="budget-summary-label" className="rounded-sheet border border-line bg-surface p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <p
          id="budget-summary-label"
          className={cn(
            "text-[11px] font-semibold tracking-[0.08em] uppercase",
            over ? "text-expense" : "text-muted",
          )}
        >
          {over ? t("overTotalLabel") : t("remainingLabel", { month: monthLabel.split(" ")[0] })}
        </p>
        <div className="flex shrink-0 gap-1.5">
          {totals.overCount ? <Badge tone="expense">{t("badgeOver", { count: totals.overCount })}</Badge> : null}
          {totals.nearCount ? <Badge tone="debt">{t("badgeNear", { count: totals.nearCount })}</Badge> : null}
        </div>
      </div>
      <AmountText
        value={over ? -totals.remaining : totals.remaining}
        tone={over ? "expense" : "neutral"}
        className="mt-1.5 block text-[38px] leading-[1.1] font-bold md:text-[44px]"
      />
      <p className="mt-1.5 text-[13px] text-muted tabular-nums">
        {t("usedOf", { spent: money(totals.spent), limit: money(totals.limit), ratio: totals.ratio })}
      </p>
      <ProgressBar value={totals.spent} max={totals.limit} label={t("totalProgress")} className="mt-4" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3.5 text-[13px]">
        {isCurrentMonth && totals.perDay !== null && daysLeft ? (
          <p className="text-muted">
            {over ? (
              t("overHint")
            ) : (
              <>
                {t("perDayPrefix")}{" "}
                <AmountText value={totals.perDay} className="font-semibold text-text" />
                {t("perDaySuffix", { count: daysLeft })}
              </>
            )}
          </p>
        ) : (
          <p className="text-muted">{t("pastMonthHint")}</p>
        )}
        {totals.unbudgetedSpent > 0 ? (
          <p className="flex items-baseline gap-1.5 text-muted">
            {t("outsideBudget")}
            <AmountText value={totals.unbudgetedSpent} tone="expense" compact className="font-semibold" />
          </p>
        ) : null}
      </div>
    </section>
  );
}

const rowButton =
  "-mx-2 grid w-[calc(100%+1rem)] gap-2 rounded-control px-2 py-3.5 text-left outline-none transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-ring";

function BudgetLine({ row, onEdit }: { row: BudgetRow; onEdit: () => void }) {
  const t = useTranslations("budget");
  const locale = toUiLocale(useLocale());
  const money = (value: number) => formatMoney(value, { locale });

  return (
    <button type="button" onClick={onEdit} className={rowButton} aria-label={t("editLabel", { name: row.categoryName })}>
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[15px] font-medium text-text">{row.categoryName}</span>
        <span className="flex shrink-0 items-center gap-2">
          {row.status === "over" ? <Badge tone="expense">{t("statusOver")}</Badge> : null}
          {row.status === "warning" ? <Badge tone="debt">{t("statusNear")}</Badge> : null}
          <span
            className={cn(
              "text-[13px] font-semibold tabular-nums",
              row.status === "over" ? "text-expense" : row.status === "warning" ? "text-debt" : "text-muted",
            )}
          >
            {row.ratio}%
          </span>
        </span>
      </span>
      <ProgressBar value={row.spent} max={row.limit} label={t("rowProgress", { name: row.categoryName })} />
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px] text-muted tabular-nums">
        <span>{t("rowUsed", { spent: money(row.spent), limit: money(row.limit) })}</span>
        <span className={cn(row.remaining < 0 && "font-semibold text-expense")}>
          {row.remaining < 0
            ? t("rowOver", { amount: money(-row.remaining) })
            : row.perDay !== null
              ? t("rowLeftPerDay", { amount: money(row.remaining), perDay: formatMoney(row.perDay, { locale, compact: true }) })
              : t("rowLeft", { amount: money(row.remaining) })}
        </span>
      </span>
    </button>
  );
}

function UnsetLine({ row, onEdit }: { row: BudgetRow; onEdit: () => void }) {
  const t = useTranslations("budget");
  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(rowButton, "flex min-h-14 items-center gap-3 py-2")}
      aria-label={t("setLabel", { name: row.categoryName })}
    >
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-[14px] font-medium text-text">{row.categoryName}</span>
        <span className="text-[12px] text-muted">
          {t("spentThisMonth")} <AmountText value={row.spent} tone="expense" className="font-semibold" />
        </span>
      </span>
      <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-chip border border-line px-3 text-[13px] font-semibold text-text">
        <Plus className="size-4" aria-hidden="true" />
        {t("set")}
      </span>
    </button>
  );
}

function IdleCategories({
  rows,
  onEdit,
  defaultOpen,
}: {
  rows: BudgetRow[];
  onEdit: (row: BudgetRow) => void;
  defaultOpen: boolean;
}) {
  const t = useTranslations("budget");
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();

  return (
    <section className={cn("grid gap-1", sectionCard)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="-mx-2 flex min-h-11 items-center justify-between gap-3 rounded-control px-2 text-left outline-none hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="grid">
          <span className="text-[15px] font-semibold tracking-tight text-text">{t("otherCategories")}</span>
          <span className="text-[12px] text-muted">{t("otherCategoriesHint", { count: rows.length })}</span>
        </span>
        <ChevronDown
          className={cn("size-[18px] shrink-0 text-muted transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul id={id} className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.categoryId}>
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-control px-2 text-left outline-none transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={t("setLabel", { name: row.categoryName })}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-text">{row.categoryName}</span>
                <span className="text-[13px] font-medium text-muted">{t("set")}</span>
                <ChevronRight className="size-4 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
