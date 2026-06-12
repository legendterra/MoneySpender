"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Panel } from "@/components/ui/panel";
import type { CategorySlice, GoalProgress, MonthlyPoint } from "@/lib/types";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

const COLORS = ["#4D84FF", "#82A5FF", "#A3C9FF", "#85B9E8", "#2451C8", "#6A93FF"];

function GoalBar({
  label,
  current,
  target,
  currencyCode,
}: {
  label: string;
  current: number;
  target: number;
  currencyCode: string;
}) {
  const ratio = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted">
            {formatCurrency(current, currencyCode)} / {formatCurrency(target, currencyCode)}
          </p>
        </div>
        <span className="text-sm font-bold text-accent-strong">{Math.round(ratio)}%</span>
      </div>
      <div className="h-3 rounded-full bg-accent-soft">
        <div
          className="h-3 rounded-full bg-accent"
          style={{
            width: `${ratio}%`,
            transition: "width 260ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

export function DashboardCharts({
  currencyCode,
  trendData,
  expenseBreakdown,
  goals,
}: {
  currencyCode: string;
  trendData: MonthlyPoint[];
  expenseBreakdown: CategorySlice[];
  goals: GoalProgress;
}) {
  // Check if there's any data in the trend chart
  const hasTrendData = trendData.some((d) => d.income > 0 || d.expense > 0);
  const hasExpenseData = expenseBreakdown.length > 0;
  const hasGoals = goals.currentMonthGoal > 0 || goals.currentYearGoal > 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted">Cashflow</p>
            <h2 className="text-2xl font-bold text-foreground">Uang masuk vs uang keluar</h2>
          </div>
          <p className="text-xs text-muted">6 bulan terakhir</p>
        </div>
        <div className="h-[300px]">
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4D84FF" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#4D84FF" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#E55A7D" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#E55A7D" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(99,128,193,0.12)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCompactCurrency(Number(value), currencyCode)}
                />
                <Tooltip
                  formatter={(value: unknown) => formatCurrency(Number(value ?? 0), currencyCode)}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid rgba(118, 151, 224, 0.18)",
                    background: "rgba(10, 16, 36, 0.92)",
                    color: "#F4F7FF",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#4D84FF"
                  fill="url(#incomeGradient)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#E55A7D"
                  fill="url(#expenseGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm font-semibold text-foreground">Grafik Cashflow</p>
              <p className="mt-2 text-center text-xs text-muted">
                Catat transaksi untuk melihat pola<br />uang masuk dan keluar setiap bulan
              </p>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-4">
        <Panel className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">Target nabung</p>
            <h2 className="text-2xl font-bold text-foreground">Sudah sejauh mana?</h2>
          </div>
          {hasGoals ? (
            <>
              <GoalBar
                label="Target bulan ini"
                current={goals.currentMonthSaved}
                target={goals.currentMonthGoal}
                currencyCode={currencyCode}
              />
              <GoalBar
                label="Target tahun ini"
                current={goals.currentYearSaved}
                target={goals.currentYearGoal}
                currencyCode={currencyCode}
              />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-sm text-muted">
                Atur target tabungan di Settings<br />untuk melihat progress
              </p>
            </div>
          )}
        </Panel>

        <Panel className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted">Belanja per kategori</p>
              <h2 className="text-2xl font-bold text-foreground">Yang paling banyak makan budget</h2>
            </div>
            <p className="text-xs text-muted">Bulan ini</p>
          </div>
          <div className="grid items-center gap-4 md:grid-cols-[1fr_0.9fr]">
            <div className="h-[220px]">
              {hasExpenseData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={84}
                      paddingAngle={4}
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown) =>
                        formatCurrency(Number(value ?? 0), currencyCode)
                      }
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid rgba(118, 151, 224, 0.18)",
                        background: "rgba(10, 16, 36, 0.92)",
                        color: "#F4F7FF",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
                  <p className="text-xs text-muted">
                    Catat pengeluaran untuk<br />melihat distribusi per kategori
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {expenseBreakdown.length ? (
                expenseBreakdown.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between gap-4 rounded-md bg-accent-soft/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-foreground">{entry.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-muted">
                      {formatCompactCurrency(entry.total, currencyCode)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted">
                  Belum ada pengeluaran bulan ini.
                </p>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
