import { AllowanceHero, MonthHero, type AllowanceHeroProps } from "@/components/beranda/allowance-hero";
import { BudgetWatch, type BudgetWatchItem } from "@/components/beranda/budget-watch";
import { SavingsProgress } from "@/components/beranda/savings-progress";
import { TodayList, type TodayItem } from "@/components/beranda/today-list";
import { WalletStrip, type WalletChipData } from "@/components/beranda/wallet-strip";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

export type BerandaViewProps = {
  /** null when a past month is selected: the hero shows the month summary instead. */
  allowance: Omit<AllowanceHeroProps, "monthIncome" | "monthExpense" | "className"> | null;
  month: { label: string; income: number; expense: number };
  wallets: WalletChipData[];
  today: { items: TodayItem[]; spentTotal: number; total?: number; date?: string };
  budgets: BudgetWatchItem[];
  /** null or goal 0 hides the section. */
  savings: { saved: number; goal: number } | null;
};

export function BerandaView({ allowance, month, wallets, today, budgets, savings }: BerandaViewProps) {
  return (
    <div className="mx-auto grid max-w-2xl gap-8 lg:max-w-none lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="grid min-w-0 gap-8">
        {allowance ? (
          <AllowanceHero {...allowance} monthIncome={month.income} monthExpense={month.expense} />
        ) : (
          <MonthHero monthLabel={month.label} income={month.income} expense={month.expense} />
        )}
        <WalletStrip wallets={wallets} />
        <TodayList items={today.items} spentTotal={today.spentTotal} total={today.total} date={today.date} />
      </div>
      <div className="grid min-w-0 gap-8 lg:border-l lg:border-line lg:pl-8">
        {budgets.length ? <BudgetWatch budgets={budgets} /> : null}
        {savings && savings.goal > 0 ? <SavingsProgress saved={savings.saved} goal={savings.goal} /> : null}
      </div>
    </div>
  );
}

/** Loading skeleton with the same geometry as BerandaView. */
export function BerandaSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-2xl gap-8 lg:max-w-none lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start"
      aria-busy="true"
    >
      <div className="grid gap-8">
        <div className="grid gap-3 pt-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
          <div className="mt-2 flex justify-between border-t border-line pt-3.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <div className="flex gap-8 overflow-hidden">
          {[0, 1, 2].map((key) => (
            <div key={key} className="grid gap-1.5 py-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-20" />
          {[0, 1, 2].map((key) => (
            <SkeletonRow key={key} />
          ))}
        </div>
      </div>
      <div className="lg:border-l lg:border-line lg:pl-8">
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />
      </div>
    </div>
  );
}
