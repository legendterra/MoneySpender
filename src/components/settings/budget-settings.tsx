"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Category, MonthlyBudget } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function BudgetSettings({
  categories,
  budgets,
  month,
  currencyCode,
}: {
  categories: Category[];
  budgets: MonthlyBudget[];
  month: string;
  currencyCode: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const expenseCategories = categories.filter((category) => category.type === "expense");
  const budgetMap = useMemo(
    () => new Map(budgets.map((budget) => [budget.category_id, budget.amount])),
    [budgets],
  );
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);

  async function saveBudgets(formData: FormData) {
    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      setIsSaving(false);
      return;
    }

    const rows = expenseCategories.map((category) => ({
      user_id: user.id,
      category_id: category.id,
      month,
      amount: Number(formData.get(category.id) ?? 0) || 0,
    }));

    const { error } = await supabase
      .from("monthly_budgets")
      .upsert(rows, { onConflict: "user_id,category_id,month" });

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Budget bulan ini tersimpan.");
    router.refresh();
  }

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Budget</p>
        <h2 className="text-2xl font-bold text-foreground">Batas aman bulan ini</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Set angka per kategori supaya pengeluaran punya pagar yang jelas, bukan cuma feeling.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-background-strong px-4 py-4">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Total budget {month}</p>
        <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalBudget, currencyCode)}</p>
      </div>
      <form action={saveBudgets} className="grid gap-3">
        {expenseCategories.length ? (
          expenseCategories.map((category) => (
            <label key={category.id} className="grid gap-2 rounded-2xl border border-border bg-background-strong p-4">
              <span className="text-sm font-semibold text-foreground">{category.name}</span>
              <Input
                name={category.id}
                type="number"
                min="0"
                step="1000"
                defaultValue={budgetMap.get(category.id) ?? 0}
              />
            </label>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm leading-7 text-muted">
            Buat kategori pengeluaran dulu, baru budget bisa diisi.
          </div>
        )}
        <Button type="submit" isLoading={isSaving} disabled={!expenseCategories.length}>
          Simpan budget
        </Button>
      </form>
    </Panel>
  );
}
