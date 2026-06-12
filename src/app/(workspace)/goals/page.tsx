import Link from "next/link";
import { getDashboardData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";
import { Target, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color = "var(--accent)",
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = circ * ratio;
  const cx = size / 2;

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* track */}
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      {/* progress */}
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

function GoalCard({
  label,
  current,
  goal,
  currency,
}: {
  label: string;
  current: number;
  goal: number;
  currency: string;
}) {
  const ratio = goal > 0 ? Math.min(current / goal, 1) : 0;
  const percent = Math.round(ratio * 100);
  const remaining = Math.max(0, goal - current);
  const isOver = current > goal;
  const color = isOver
    ? "var(--success)"
    : ratio >= 0.8
      ? "var(--accent)"
      : ratio >= 0.5
        ? "var(--warning)"
        : "var(--danger)";

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-background-strong p-6 text-center">
      {/* Ring */}
      <div className="relative">
        <ProgressRing value={current} max={goal} color={color} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-foreground">{percent}%</span>
          <span className="text-xs text-muted">{label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="w-full space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Saat ini</span>
          <span className={cn("font-semibold", isOver ? "text-success" : "text-foreground")}>
            {formatCurrency(current, currency)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Target</span>
          <span className="font-semibold text-foreground">{formatCurrency(goal, currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Sisa</span>
          <span className={cn("font-semibold", isOver ? "text-success" : "text-muted")}>
            {isOver ? "✅ Terlampaui" : formatCurrency(remaining, currency)}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="w-full">
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(ratio * 100, 100)}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

function MonthTrendItem({
  label,
  amount,
  goal,
  currency,
}: {
  label: string;
  amount: number;
  goal: number;
  currency: string;
}) {
  const diff = amount - goal;
  const ratio = goal > 0 ? amount / goal : 0;

  let Icon = Minus;
  let iconColor = "text-muted";
  let label_ = "On track";
  let barColor = "bg-success";

  if (diff > 0 && ratio > 1.1) {
    Icon = TrendingUp;
    iconColor = "text-danger";
    label_ = `Plus ${formatCurrency(diff, currency)}`;
    barColor = "bg-danger";
  } else if (diff > 0) {
    Icon = TrendingUp;
    iconColor = "text-warning";
    label_ = `Above target`;
    barColor = "bg-warning";
  } else if (diff < 0) {
    Icon = TrendingDown;
    iconColor = "text-success";
    label_ = `Below target`;
    barColor = "bg-success";
  }

  const barRatio = Math.min(ratio, 1.2);

  return (
    <div className="flex items-center gap-4 py-3">
      <span className="w-16 text-xs text-muted">{label}</span>
      <div className="flex flex-1 items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${(barRatio / 1.2) * 100}%` }}
          />
        </div>
        <span className={cn("flex items-center gap-1 text-xs font-semibold", iconColor)}>
          <Icon className="size-3" />
          {label_}
        </span>
      </div>
    </div>
  );
}

export default async function GoalsPage() {
  const data = await getDashboardData();
  const currency = data.profile.currency_code ?? "IDR";
  const goals = data.goalProgress;

  const monthlyRatio = goals.currentMonthGoal > 0
    ? (data.summary.balance / goals.currentMonthGoal) * 100
    : 0;
  const yearlyRatio = goals.currentYearGoal > 0
    ? (goals.currentYearSaved / goals.currentYearGoal) * 100
    : 0;

  const monthlyStatus =
    monthlyRatio >= 100 ? "🎉 Target bulanan tercapai!" :
    monthlyRatio >= 80 ? "⚡ Hampir tercapai, sisa sedikit lagi!" :
    monthlyRatio >= 50 ? "📊 Sudah setengah jalan" :
    "💪 Mulai semangat, bulan masih panjang!";

  const yearlyStatus =
    yearlyRatio >= 100 ? "🎊 Target tahunan tercapai!" :
    yearlyRatio >= 50 ? "📆 Setengah tahun, setengah jalan!" :
    "🗓️ Masih awal, konsisten aja dulu";

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Target & Tabungan"
        title="Cek progress tabunganmu"
        description="Pantau seberapa dekat kamu dengan target bulanan dan tahunan."
        right={
          <Link href="/settings" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Edit target <ArrowRight className="size-3" />
          </Link>
        }
      />

      {/* Status banner */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <Target className="size-5 text-accent" />
          <div>
            <p className="text-sm font-semibold text-foreground">Status target bulan ini</p>
            <p className="text-sm text-muted">{monthlyStatus}</p>
          </div>
        </div>
      </div>

      {/* Goal cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GoalCard
          label="Bulanan"
          current={data.summary.balance}
          goal={goals.currentMonthGoal}
          currency={currency}
        />
        <GoalCard
          label="Tahunan"
          current={goals.currentYearSaved}
          goal={goals.currentYearGoal}
          currency={currency}
        />
      </div>

      {/* Stats summary */}
      <Panel className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted">Ringkasan</p>
          <h3 className="text-xl font-bold text-foreground">Statistik tabungan</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background-strong px-4 py-3">
            <p className="text-xs text-muted">Net bulan ini</p>
            <p className={cn(
              "text-lg font-bold",
              data.summary.balance >= 0 ? "text-success" : "text-danger"
            )}>
              {formatCurrency(data.summary.balance, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background-strong px-4 py-3">
            <p className="text-xs text-muted">Total tabungan tahun ini</p>
            <p className={cn(
              "text-lg font-bold",
              goals.currentYearSaved >= 0 ? "text-success" : "text-danger"
            )}>
              {formatCurrency(goals.currentYearSaved, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background-strong px-4 py-3">
            <p className="text-xs text-muted">Sisa target tahunan</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(Math.max(0, goals.currentYearGoal - goals.currentYearSaved), currency)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted">
          {yearlyStatus}
        </p>
      </Panel>

      {/* Tips */}
      <Panel className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-muted">Tips</p>
          <h3 className="text-xl font-bold text-foreground">Rekomendasi buatmu</h3>
        </div>
        <ul className="space-y-2 text-sm text-muted">
          {data.summary.balance < 0 && (
            <li className="flex gap-2">
              <span className="text-danger font-bold">•</span>
              Pengeluaran bulan ini sudah melebihi pemasukan. Cek kategori terbesar di Dashboard.
            </li>
          )}
          {goals.currentMonthGoal > 0 && monthlyRatio < 0.5 && (
            <li className="flex gap-2">
              <span className="text-warning font-bold">•</span>
              Target bulanan belum separuh. Coba tambah pemasukan atau kurangi pengeluaran discretionary.
            </li>
          )}
          {goals.currentYearGoal > 0 && yearlyRatio < 0.3 && (
            <li className="flex gap-2">
              <span className="text-muted font-bold">•</span>
              Target tahunan baru {Math.round(yearlyRatio)}%. Konsisten tiap bulan sangat membantu.
            </li>
          )}
          {data.summary.savingsRate > 20 && (
            <li className="flex gap-2">
              <span className="text-success font-bold">•</span>
              Savings rate {data.summary.savingsRate}% — luar biasa. Pertimbangkan investasikan sebagian.
            </li>
          )}
          {data.summary.savingsRate <= 0 && (
            <li className="flex gap-2">
              <span className="text-danger font-bold">•</span>
              Savings rate 0% atau negatif. Prioritas:收支平衡 dulu, baru mulai nabung.
            </li>
          )}
          {data.wallets.length > 0 && (
            <li className="flex gap-2">
              <span className="text-accent font-bold">•</span>
              Saldo likuid total: {formatCurrency(data.wallets.reduce((s, w) => s + w.balance, 0), currency)}
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}