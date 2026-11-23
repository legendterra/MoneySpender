"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { BudgetEditSheet, type BudgetEditTarget } from "@/components/budget/budget-edit-sheet";
import { Eyebrow } from "@/components/flat/layout";
import { AmountText } from "@/components/ui/amount-display";
import { Button } from "@/components/ui/button";
import { formatMonthLabel, formatMoney, toUiLocale } from "@/components/ui/format";
import { Pagination } from "@/components/ui/pagination";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  adjustTotals,
  withLimit,
  type BudgetCopyPlan,
  type BudgetGroup,
  type BudgetListRow,
  type BudgetTotals,
} from "@/lib/budget-plan";
import { haptic } from "@/lib/haptics";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSyncedList } from "@/lib/use-synced-list";
import { cn } from "@/lib/utils";

export type BudgetViewProps = {
  userId: string;
  month: string;
  previousMonth: string;
  isCurrentMonth: boolean;
  daysLeft: number | null;
  totals: BudgetTotals;
  hasBudgets: boolean;
  rows: BudgetListRow[];
  page: number;
  totalPages: number;
  totalItems: number;
  previous: Record<string, { limit: number; spent: number }>;
  copyPlan: BudgetCopyPlan;
  hasCategories: boolean;
  /** Month param to keep in pager links (absent = current month). */
  monthParam?: string;
};

type Editing = { target: BudgetEditTarget | null; open: boolean; session: number };

export function BudgetView(props: BudgetViewProps) {
  const { copyPlan, month, previousMonth, userId, daysLeft } = props;
  const t = useTranslations("budget");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const { list, mutate } = useSyncedList(props.rows);
  const [editing, setEditing] = React.useState<Editing>({ target: null, open: false, session: 0 });
  const [copying, startCopy] = React.useTransition();

  const monthLabel = formatMonthLabel(month, locale);
  const monthName = monthLabel.split(" ")[0];
  const previousLabel = formatMonthLabel(previousMonth, locale).split(" ")[0];
  const totals = adjustTotals(props.totals, props.rows, list, daysLeft);
  const hasBudgets = props.hasBudgets || list.some((row) => row.limit > 0);

  function openEditor(row: BudgetListRow) {
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

  async function setLimit(categoryId: string, amount: number) {
    const row = list.find((item) => item.id === categoryId);
    if (!row) return;
    setEditing((current) => ({ ...current, open: false }));
    const supabase = createBrowserSupabaseClient();
    const error = await mutate({ type: "upsert", item: withLimit(row, amount, daysLeft) }, async () => {
      const { error: writeError } =
        amount > 0
          ? await supabase
              .from("monthly_budgets")
              .upsert({ user_id: userId, category_id: categoryId, month, amount }, { onConflict: "user_id,category_id,month" })
          : await supabase
              .from("monthly_budgets")
              .delete()
              .eq("user_id", userId)
              .eq("category_id", categoryId)
              .eq("month", month);
      if (!writeError) return {};
      const operation = amount > 0 ? "upsert" : "delete";
      return {
        error: `Supabase ${operation} on "monthly_budgets" (category_id ${categoryId}, month ${month}) failed: ${writeError.message}`,
      };
    });
    if (error) {
      toast.error(amount > 0 ? t("saveFailed") : t("removeFailed"), { description: error });
      return;
    }
    haptic("success");
    toast.success(
      amount > 0
        ? t("saved", { name: row.categoryName, amount: formatMoney(amount, { locale }) })
        : t("removed", { name: row.categoryName }),
    );
  }

  function copyFromPrevious() {
    if (!copyPlan.rows.length) return;
    startCopy(async () => {
      const { error } = await createBrowserSupabaseClient()
        .from("monthly_budgets")
        .upsert(
          copyPlan.rows.map((row) => ({ ...row, user_id: userId })),
          { onConflict: "user_id,category_id,month" },
        );
      if (error) {
        toast.error(t("copyFailed"), {
          description: `Supabase upsert on "monthly_budgets" (month ${month}) failed: ${error.message}`,
        });
        return;
      }
      haptic("success");
      toast.success(t("copied", { count: copyPlan.rows.length, month: previousLabel }));
      router.refresh();
    });
  }

  return (
    <>
      <div className="mx-auto grid max-w-2xl gap-9 lg:max-w-5xl lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
        <div className="grid min-w-0 gap-6 lg:sticky lg:top-24">
          {hasBudgets ? (
            <Summary totals={totals} monthName={monthName} isCurrentMonth={props.isCurrentMonth} daysLeft={daysLeft} />
          ) : (
            <div className="grid gap-2 pt-1">
              <h2 className="text-[22px] leading-tight font-bold tracking-tight text-text">{t("emptyTitle")}</h2>
              <p className="max-w-prose text-[14px] leading-6 text-muted">
                {props.hasCategories ? t("emptyBody") : t("emptyNoCategories")}
              </p>
            </div>
          )}
          {copyPlan.rows.length ? (
            <div className="grid gap-3 border-t border-line pt-5">
              <p className="text-[13px] leading-5 text-muted">
                {hasBudgets
                  ? t("copyMissing", { count: copyPlan.rows.length, month: previousLabel })
                  : t("copyAll", { count: copyPlan.rows.length, month: previousLabel })}
              </p>
              <Button
                variant={hasBudgets ? "secondary" : "primary"}
                size="sm"
                onClick={copyFromPrevious}
                isLoading={copying}
                className="justify-self-start"
              >
                <Copy aria-hidden="true" />
                {t("copyButton", { month: previousLabel })}
              </Button>
            </div>
          ) : null}
        </div>

        <section aria-labelledby="budget-list-heading" className="grid min-w-0 content-start gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="budget-list-heading" className="text-[17px] font-semibold tracking-tight text-text">
              {t("perCategory")}
            </h2>
            <span className="text-[13px] text-muted tabular-nums">{t("categoryCount", { count: props.totalItems })}</span>
          </div>
          <ul className="mt-2" data-testid="budget-list">
            {list.map((row, index) => (
              <React.Fragment key={row.id}>
                {index === 0 || list[index - 1].group !== row.group ? (
                  <GroupLabel group={row.group} first={index === 0} />
                ) : null}
                <li className="border-b border-line">
                  {row.limit > 0 ? (
                    <BudgetLine row={row} onEdit={() => openEditor(row)} />
                  ) : (
                    <UnsetLine row={row} onEdit={() => openEditor(row)} />
                  )}
                </li>
              </React.Fragment>
            ))}
          </ul>
          <Pagination page={props.page} totalPages={props.totalPages} pathname="/budget" query={{ month: props.monthParam }} />
        </section>
      </div>

      <BudgetEditSheet
        key={editing.session}
        target={editing.target}
        open={editing.open}
        onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
        monthLabel={monthLabel}
        onSave={(amount) => {
          if (editing.target) void setLimit(editing.target.categoryId, amount);
        }}
        onRemove={() => {
          if (editing.target) void setLimit(editing.target.categoryId, 0);
        }}
      />
    </>
  );
}

function GroupLabel({ group, first }: { group: BudgetGroup; first: boolean }) {
  const t = useTranslations("budget");
  if (group === "budgeted") return null;
  return (
    <li
      aria-hidden="true"
      className={cn(
        "border-b border-line pb-2 text-[12px] font-semibold tracking-[0.06em] text-muted uppercase",
        first ? "pt-1" : "pt-7",
      )}
    >
      {group === "unbudgeted" ? t("unbudgeted") : t("otherCategories")}
    </li>
  );
}

function Summary({
  totals,
  monthName,
  isCurrentMonth,
  daysLeft,
}: {
  totals: BudgetTotals;
  monthName: string;
  isCurrentMonth: boolean;
  daysLeft: number | null;
}) {
  const t = useTranslations("budget");
  const locale = toUiLocale(useLocale());
  const over = totals.remaining < 0;
  const money = (value: number) => formatMoney(value, { locale });

  return (
    <section aria-labelledby="budget-summary-label" className="grid gap-1.5">
      <Eyebrow id="budget-summary-label" className={over ? "text-expense" : undefined}>
        {over ? t("overTotalLabel") : t("remainingLabel", { month: monthName })}
      </Eyebrow>
      <AmountText
        value={over ? -totals.remaining : totals.remaining}
        tone={over ? "expense" : "neutral"}
        className="block text-[40px] leading-[1.08] font-bold tracking-tight md:text-[46px]"
      />
      <p className="text-[13px] text-muted tabular-nums">
        {t("usedOf", { spent: money(totals.spent), limit: money(totals.limit), ratio: totals.ratio })}
      </p>
      <ProgressBar value={totals.spent} max={totals.limit} label={t("totalProgress")} className="mt-3" />
      <div className="mt-3 grid gap-1 text-[13px] leading-5">
        {isCurrentMonth && totals.perDay !== null && daysLeft ? (
          <p className="text-muted">
            {over ? (
              t("overHint")
            ) : (
              <>
                {t("perDayPrefix")} <AmountText value={totals.perDay} className="font-semibold text-text" />
                {t("perDaySuffix", { count: daysLeft })}
              </>
            )}
          </p>
        ) : (
          <p className="text-muted">{t("pastMonthHint")}</p>
        )}
        {totals.overCount || totals.nearCount ? (
          <p className="font-medium">
            {totals.overCount ? <span className="text-expense">{t("badgeOver", { count: totals.overCount })}</span> : null}
            {totals.overCount && totals.nearCount ? <span className="text-muted"> · </span> : null}
            {totals.nearCount ? <span className="text-debt">{t("badgeNear", { count: totals.nearCount })}</span> : null}
          </p>
        ) : null}
        {totals.unbudgetedSpent > 0 ? (
          <p className="text-muted">
            {t("outsideBudget")} <AmountText value={totals.unbudgetedSpent} tone="expense" className="font-semibold" />
          </p>
        ) : null}
      </div>
    </section>
  );
}

const rowButton =
  "grid w-full gap-2 py-3.5 text-left outline-none transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-70";

function BudgetLine({ row, onEdit }: { row: BudgetListRow; onEdit: () => void }) {
  const t = useTranslations("budget");
  const locale = toUiLocale(useLocale());
  const money = (value: number) => formatMoney(value, { locale });
  const tone = row.status === "over" ? "text-expense" : row.status === "warning" ? "text-debt" : "text-muted";
  const statusLabel = row.status === "over" ? t("statusOver") : row.status === "warning" ? t("statusNear") : null;

  return (
    <button type="button" onClick={onEdit} className={rowButton} aria-label={t("editLabel", { name: row.categoryName })}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[15px] font-medium text-text">{row.categoryName}</span>
        <span className={cn("shrink-0 text-[13px] font-semibold tabular-nums", tone)}>
          {statusLabel ? `${statusLabel} · ` : ""}
          {row.ratio}%
        </span>
      </span>
      <ProgressBar value={row.spent} max={row.limit} label={t("rowProgress", { name: row.categoryName })} />
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px] text-muted tabular-nums">
        <span>{t("rowUsed", { spent: money(row.spent), limit: money(row.limit) })}</span>
        <span className={cn(row.remaining < 0 && "font-semibold text-expense")}>
          {row.remaining < 0
            ? t("rowOver", { amount: money(-row.remaining) })
            : row.perDay !== null
              ? t("rowLeftPerDay", {
                  amount: money(row.remaining),
                  perDay: formatMoney(row.perDay, { locale, compact: true }),
                })
              : t("rowLeft", { amount: money(row.remaining) })}
        </span>
      </span>
    </button>
  );
}

function UnsetLine({ row, onEdit }: { row: BudgetListRow; onEdit: () => void }) {
  const t = useTranslations("budget");
  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(rowButton, "flex min-h-14 items-center gap-3 py-2.5")}
      aria-label={t("setLabel", { name: row.categoryName })}
    >
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-[15px] text-text">{row.categoryName}</span>
        {row.spent > 0 ? (
          <span className="text-[12px] text-muted">
            {t("spentThisMonth")} <AmountText value={row.spent} tone="expense" className="font-semibold" />
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-[14px] font-semibold text-primary-ink">{t("set")}</span>
    </button>
  );
}
