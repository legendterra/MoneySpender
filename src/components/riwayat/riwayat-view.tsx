"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, LoaderCircle, ReceiptText, Search, SearchX, Tag, Wallet, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CatatButton } from "@/components/quick-add/catat-button";
import { EntryAvatar, FlowAmount } from "@/components/riwayat/entry-visuals";
import { EntrySheet } from "@/components/riwayat/entry-sheet";
import { OptionSheet, type PickerOption } from "@/components/riwayat/option-sheet";
import { useDeleteWithUndo } from "@/components/riwayat/use-delete-with-undo";
import { AmountText } from "@/components/ui/amount-display";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { addDaysToKey, formatDateKey, formatMonthLabel, toUiLocale } from "@/components/ui/format";
import { IconButton } from "@/components/ui/icon-button";
import { inputClassName } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { Pagination } from "@/components/ui/pagination";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs } from "@/components/ui/tabs";
import type { HistoryPageData } from "@/lib/data-history";
import {
  HISTORY_TYPES,
  describeEntry,
  historyHref,
  historyQuery,
  type HistoryDay,
  type HistoryEntry,
  type HistoryPeriod,
  type HistoryQuery,
  type HistoryTypeFilter,
} from "@/lib/history";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;

type Picker = "wallet" | "category" | "period";

export function RiwayatView({ data }: { data: HistoryPageData }) {
  const t = useTranslations("riwayat");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  const { params } = data;
  const currentMonth = data.today.slice(0, 7);

  const [query, setQuery] = React.useState(params.q);
  const [picker, setPicker] = React.useState<Picker | null>(null);
  const [selected, setSelected] = React.useState<HistoryEntry | null>(null);
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(() => new Set());

  // Last search sent to the server, so the debounce does not resend it.
  const requestedQuery = React.useRef(params.q);
  const navigate = React.useCallback(
    (next: HistoryQuery) => {
      if (next.q !== undefined) requestedQuery.current = next.q.trim();
      const href = historyHref(
        {
          month: params.month,
          period: params.period,
          type: params.type,
          walletId: params.walletId,
          categoryId: params.categoryId,
          q: params.q,
          ...next,
        },
        currentMonth,
      );
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [params, currentMonth, router],
  );

  // Search as you type, debounced; the server filters the whole period.
  React.useEffect(() => {
    if (query.trim() === params.q || query.trim() === requestedQuery.current) return;
    const timer = window.setTimeout(() => navigate({ q: query }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, params.q, navigate]);

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

  const walletName = data.wallets.find((wallet) => wallet.id === params.walletId)?.name ?? null;
  const categoryName = data.categories.find((category) => category.id === params.categoryId)?.name ?? null;
  const year = params.month.slice(0, 4);
  const monthLabel = formatMonthLabel(params.month, locale);
  const periodLabel =
    params.period === "year"
      ? t("periodChip.year", { year })
      : params.period === "all"
        ? t("periodChip.all")
        : monthLabel;
  const filtered = Boolean(params.type || params.walletId || params.categoryId || params.q || params.period !== "month");

  function reset() {
    setQuery("");
    navigate({ type: null, walletId: null, categoryId: null, q: "", period: "month" });
  }

  const walletOptions: PickerOption[] = [
    { value: null, label: t("allWallets") },
    ...data.wallets
      .filter((wallet) => !wallet.is_archived)
      .map((wallet) => ({ value: wallet.id, label: wallet.name })),
    ...data.wallets
      .filter((wallet) => wallet.is_archived)
      .map((wallet) => ({ value: wallet.id, label: wallet.name, hint: t("archived") })),
  ];
  const categoryOptions: PickerOption[] = [
    { value: null, label: t("allCategories") },
    ...data.categories
      .filter((category) => category.type === "expense")
      .map((category) => ({ value: category.id, label: category.name, group: t("expenseCategories") })),
    ...data.categories
      .filter((category) => category.type === "income")
      .map((category) => ({ value: category.id, label: category.name, group: t("incomeCategories") })),
  ];
  const periodOptions: PickerOption[] = (["month", "year", "all"] as const).map((value) => ({
    value,
    label: t(`periodOptions.${value}`),
    hint: value === "month" ? monthLabel : value === "year" ? year : undefined,
  }));

  const days = data.days
    .map((day) => ({ ...day, entries: day.entries.filter((entry) => !hidden.has(entry.key)) }))
    .filter((day) => day.entries.length);

  return (
    <div className="mx-auto grid max-w-2xl gap-5 lg:max-w-none lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="grid min-w-0 gap-4">
        <div className="grid gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              enterKeyHint="search"
              aria-label={t("searchLabel")}
              placeholder={t("searchPlaceholder")}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (query.trim() !== params.q) navigate({ q: query });
                }
              }}
              className={cn(
                inputClassName,
                "pr-12 pl-10 [&::-webkit-search-cancel-button]:appearance-none",
              )}
            />
            <span className="absolute top-1/2 right-1 -translate-y-1/2">
              {pending ? (
                <span className="grid size-11 place-items-center text-muted" role="status" aria-label={t("loading")}>
                  <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
                </span>
              ) : query ? (
                <IconButton
                  label={t("clearSearch")}
                  onClick={() => {
                    setQuery("");
                    navigate({ q: "" });
                  }}
                >
                  <X aria-hidden="true" />
                </IconButton>
              ) : null}
            </span>
          </div>

          <Tabs<"all" | HistoryTypeFilter>
            label={t("typesLabel")}
            value={params.type ?? "all"}
            onChange={(value) => navigate({ type: value === "all" ? null : value })}
            items={[
              { value: "all", label: t("types.all") },
              ...HISTORY_TYPES.map((type) => ({ value: type, label: t(`types.${type}`) })),
            ]}
            className="-mx-4 gap-5 px-4 md:-mx-6 md:px-6 lg:mx-0 lg:px-0"
          />

          <ChipGroup label={t("filtersLabel")} scroll className="-my-1 gap-3 md:-mx-6 md:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
            <Chip
              selected={params.walletId ? true : undefined}
              icon={Wallet}
              chevron
              aria-haspopup="dialog"
              onClick={() => setPicker("wallet")}
            >
              {walletName ?? t("wallet")}
            </Chip>
            <Chip
              selected={params.categoryId ? true : undefined}
              icon={Tag}
              chevron
              aria-haspopup="dialog"
              onClick={() => setPicker("category")}
            >
              {categoryName ?? t("category")}
            </Chip>
            <Chip
              selected={params.period !== "month" ? true : undefined}
              icon={CalendarRange}
              chevron
              aria-haspopup="dialog"
              onClick={() => setPicker("period")}
            >
              <span className="capitalize">{params.period === "month" ? t("period") : periodLabel}</span>
            </Chip>
            {filtered ? (
              <Chip icon={X} onClick={reset} className="text-primary-ink">
                {t("reset")}
              </Chip>
            ) : null}
          </ChipGroup>

          <SummaryLine data={data} />
        </div>

        <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending || undefined}>
          {days.length ? (
            <div className="grid gap-6">
              {days.map((day) => (
                <DayGroup key={day.date} day={day} today={data.today} onSelect={setSelected} />
              ))}
            </div>
          ) : !params.q && !params.type && !params.walletId && !params.categoryId ? (
            <EmptyState
              icon={ReceiptText}
              title={t("emptyTitle")}
              body={t("emptyBody")}
              action={<CatatButton size="sm">{t("emptyAction")}</CatatButton>}
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title={t("noMatchTitle")}
              body={t("noMatchBody")}
              action={
                <Button size="sm" variant="secondary" onClick={reset}>
                  {t("reset")}
                </Button>
              }
            />
          )}

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            pathname={pathname}
            query={historyQuery({ ...params, page: undefined }, currentMonth)}
            className="mt-6 border-t border-line pt-3"
          />
          {data.totalPages > 1 ? (
            <p className="mt-1 text-center text-[12px] text-muted tabular-nums">
              {t("pageInfo", {
                from: (data.page - 1) * data.pageSize + 1,
                to: Math.min(data.total, data.page * data.pageSize),
                total: data.total,
              })}
            </p>
          ) : null}
        </div>
      </div>

      <aside
        className="hidden lg:sticky lg:top-24 lg:grid lg:border-l lg:border-line lg:pl-6"
        aria-label={t("summaryTitle")}
      >
        <SummaryPanel data={data} periodLabel={periodLabel} />
      </aside>

      <EntrySheet
        entry={selected}
        today={data.today}
        onClose={() => setSelected(null)}
        onDelete={(entry, description) => void remove({ kind: entry.kind, id: entry.id, key: entry.key }, description)}
      />
      <OptionSheet
        open={picker === "wallet"}
        onOpenChange={(open) => setPicker(open ? "wallet" : null)}
        title={t("wallet")}
        options={walletOptions}
        value={params.walletId}
        onSelect={(walletId) => navigate({ walletId })}
      />
      <OptionSheet
        open={picker === "category"}
        onOpenChange={(open) => setPicker(open ? "category" : null)}
        title={t("category")}
        options={categoryOptions}
        value={params.categoryId}
        onSelect={(categoryId) => navigate({ categoryId })}
        searchLabel={data.categories.length > 8 ? t("searchCategory") : undefined}
      />
      <OptionSheet
        open={picker === "period"}
        onOpenChange={(open) => setPicker(open ? "period" : null)}
        title={t("period")}
        options={periodOptions}
        value={params.period}
        onSelect={(period) => navigate({ period: (period ?? "month") as HistoryPeriod })}
      />
    </div>
  );
}

function dayTitle(date: string, today: string, locale: "id" | "en", t: (key: string) => string) {
  if (date === today) return t("today");
  if (date === addDaysToKey(today, -1)) return t("yesterday");
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return formatDateKey(date, locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function DayGroup({
  day,
  today,
  onSelect,
}: {
  day: HistoryDay;
  today: string;
  onSelect: (entry: HistoryEntry) => void;
}) {
  const t = useTranslations("riwayat");
  const locale = toUiLocale(useLocale());
  const headingId = `day-${day.date}`;

  return (
    <section aria-labelledby={headingId} className="grid gap-0.5">
      <SectionHeader
        id={headingId}
        as="h3"
        title={dayTitle(day.date, today, locale, t)}
        meta={
          day.expense || day.income ? (
            <span className="flex items-baseline gap-2.5">
              {day.income ? <AmountText value={day.income} tone="income" sign="always" /> : null}
              {day.expense ? <AmountText value={-day.expense} tone="muted" /> : null}
            </span>
          ) : undefined
        }
      />
      <ul className="divide-y divide-line">
        {day.entries.map((entry) => {
          const { title, subtitle } = describeEntry(entry, t);
          return (
            <li key={entry.key}>
              <ListRow
                leading={<EntryAvatar entry={entry} label={title} />}
                title={title}
                subtitle={subtitle || undefined}
                trailing={<FlowAmount amount={entry.amount} flow={entry.flow} />}
                onClick={() => onSelect(entry)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SummaryLine({ data }: { data: HistoryPageData }) {
  const t = useTranslations("riwayat");
  const { summary } = data;
  if (!data.total) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] text-muted lg:hidden">
      <span>{t("summary", { count: data.total })}</span>
      {summary?.expense ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-baseline gap-1">
            {t("summaryExpense")}
            <AmountText value={summary.expense} tone="expense" className="font-semibold" />
          </span>
        </>
      ) : null}
      {summary?.income ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-baseline gap-1">
            {t("summaryIncome")}
            <AmountText value={summary.income} tone="income" className="font-semibold" />
          </span>
        </>
      ) : null}
    </p>
  );
}

function SummaryPanel({ data, periodLabel }: { data: HistoryPageData; periodLabel: string }) {
  const t = useTranslations("riwayat");
  const { summary } = data;
  const head = (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{t("summaryTitle")}</p>
      <p className="mt-1 text-[15px] font-semibold text-text capitalize">{periodLabel}</p>
      <p className="mt-0.5 text-[13px] text-muted">{t("summary", { count: data.total })}</p>
    </div>
  );
  if (!summary) {
    return (
      <section className="grid gap-3">
        {head}
        <p className="text-[13px] leading-5 text-muted">{t("summaryAllTime")}</p>
      </section>
    );
  }
  const net = summary.income - summary.expense;
  const max = summary.topCategories[0]?.total ?? 0;

  return (
    <section className="grid gap-4">
      {head}
      <dl className="grid gap-2.5 border-t border-line pt-4 text-[14px]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">{t("summaryIncome")}</dt>
          <dd>
            <AmountText value={summary.income} tone="income" className="font-semibold" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">{t("summaryExpense")}</dt>
          <dd>
            <AmountText value={summary.expense} tone="expense" className="font-semibold" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
          <dt className="font-medium text-text">{t("summaryNet")}</dt>
          <dd>
            <AmountText value={net} sign="always" tone={net < 0 ? "expense" : "neutral"} className="font-bold" />
          </dd>
        </div>
      </dl>
      {summary.topCategories.length ? (
        <div className="grid gap-3 border-t border-line pt-4">
          <p className="text-[13px] font-semibold text-text">{t("topCategories")}</p>
          <ul className="grid gap-3">
            {summary.topCategories.map((category) => {
              const label = category.label ?? t("rows.noCategory");
              return (
                <li key={label} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate text-text">{label}</span>
                    <AmountText value={category.total} tone="muted" className="font-medium" />
                  </div>
                  <ProgressBar value={category.total} max={max} tone="expense" size="sm" label={label} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
