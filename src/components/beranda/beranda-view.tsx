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
  today: { items: TodayItem[]; spentTotal: number };
  budgets: BudgetWatchItem[];
  /** null or goal 0 hides the section. */
  savings: { saved: number; goal: number } | null;
};

const sectionCard = "lg:rounded-sheet lg:border lg:border-line lg:bg-surface lg:p-5";

export function BerandaView({ allowance, month, wallets, today, budgets, savings }: BerandaViewProps) {
  return (
    <div className="mx-auto grid max-w-2xl gap-7 lg:max-w-none lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="grid min-w-0 gap-7 lg:gap-6">
        {allowance ? (
          <AllowanceHero {...allowance} monthIncome={month.income} monthExpense={month.expense} />
        ) : (
          <MonthHero monthLabel={month.label} income={month.income} expense={month.expense} />
        )}
        <WalletStrip wallets={wallets} />
        <div className={sectionCard}>
          <TodayList items={today.items} spentTotal={today.spentTotal} />
        </div>
      </div>
      <div className="grid min-w-0 gap-7 lg:gap-6">
        {budgets.length ? (
          <div className={sectionCard}>
            <BudgetWatch budgets={budgets} />
          </div>
        ) : null}
        {savings && savings.goal > 0 ? (
          <div className={sectionCard}>
            <SavingsProgress saved={savings.saved} goal={savings.goal} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Loading skeleton with the same geometry as BerandaView. */
export function BerandaSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-2xl gap-7 lg:max-w-none lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6"
      aria-busy="true"
    >
      <div className="grid gap-7 lg:gap-6">
        <div className="grid gap-3 rounded-sheet border border-line bg-surface p-5 md:p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
          <div className="mt-2 flex justify-between border-t border-line pt-3.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-[68px] min-w-[8.5rem] rounded-control" />
          ))}
        </div>
        <div className={sectionCard}>
          <Skeleton className="mb-2 h-4 w-20" />
          {[0, 1, 2].map((key) => (
            <SkeletonRow key={key} />
          ))}
        </div>
      </div>
      <div className={sectionCard}>
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />
      </div>
    </div>
  );
}
