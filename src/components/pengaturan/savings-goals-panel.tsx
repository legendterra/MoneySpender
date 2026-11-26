"use client";

import * as React from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

import { AmountInput } from "@/components/pengaturan/amount-input";
import { AmountText } from "@/components/ui/amount-display";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { formatMoney, jakartaDateKey, toUiLocale } from "@/components/ui/format";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { computeSavingsGoalProgress, type SavingsGoalRecord } from "@/lib/savings-goals";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const COLUMNS = "id,name,target_amount,current_amount,target_date,wallet_id,is_archived";

/**
 * Multi-pocket savings goals (sinking funds) backed by public.savings_goals.
 * Flat rows separated by thin 1px dividers, no card boxes.
 */
export function SavingsGoalsPanel({ userId }: { userId: string }) {
  const locale = toUiLocale(useLocale());
  const isEn = locale === "en";
  const today = jakartaDateKey();

  const [goals, setGoals] = React.useState<SavingsGoalRecord[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavingsGoalRecord | null>(null);
  const [name, setName] = React.useState("");
  const [targetAmount, setTargetAmount] = React.useState(0);
  const [currentAmount, setCurrentAmount] = React.useState(0);
  const [targetDate, setTargetDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("savings_goals")
      .select(COLUMNS)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("created_at", { ascending: true });
    if (!error && data) {
      const typed = data as Array<Record<string, unknown>>;
      setGoals(
        typed.map((row) => ({
          id: String(row.id),
          name: String(row.name),
          target_amount: Number(row.target_amount ?? 0),
          current_amount: Number(row.current_amount ?? 0),
          target_date: row.target_date ? String(row.target_date) : null,
          wallet_id: row.wallet_id ? String(row.wallet_id) : null,
          is_archived: Boolean(row.is_archived),
        })),
      );
    }
    setLoaded(true);
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setName("");
    setTargetAmount(0);
    setCurrentAmount(0);
    setTargetDate("");
    setSheetOpen(true);
  }

  function openEdit(goal: SavingsGoalRecord) {
    setEditing(goal);
    setName(goal.name);
    setTargetAmount(Math.round(goal.target_amount));
    setCurrentAmount(Math.round(goal.current_amount));
    setTargetDate(goal.target_date ?? "");
    setSheetOpen(true);
  }

  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(isEn ? "Goal name is required." : "Nama kantong wajib diisi.");
      return;
    }
    if (targetAmount <= 0) {
      toast.error(isEn ? "Target amount must be above zero." : "Target nominal harus lebih dari 0.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const payload = {
        name: trimmed.slice(0, 60),
        target_amount: targetAmount,
        current_amount: Math.max(0, currentAmount),
        target_date: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : null,
      };
      const result = editing
        ? await supabase.from("savings_goals").update(payload).eq("id", editing.id).eq("user_id", userId)
        : await supabase.from("savings_goals").insert({ ...payload, user_id: userId });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(editing ? (isEn ? "Goal updated." : "Kantong diperbarui.") : isEn ? "Goal added." : "Kantong dibuat.");
      setSheetOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(goal: SavingsGoalRecord) {
    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("savings_goals").delete().eq("id", goal.id).eq("user_id", userId);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(isEn ? "Goal deleted." : "Kantong dihapus.");
      setSheetOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <h3 className="text-[15px] font-semibold text-text">
            {isEn ? "Savings pockets" : "Kantong tabungan"}
          </h3>
          <p className="text-[13px] text-muted">
            {isEn
              ? "Separate targets for emergency fund, travel, gadgets, or yearly bills."
              : "Pisahkan target dana darurat, liburan, gadget, atau kebutuhan tahunan."}
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={openNew}>
          <Plus aria-hidden="true" />
          {isEn ? "Add" : "Tambah"}
        </Button>
      </div>

      {loaded && goals.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {goals.map((goal) => {
            const p = computeSavingsGoalProgress(goal, today);
            return (
              <li key={goal.id}>
                <button
                  type="button"
                  onClick={() => openEdit(goal)}
                  className="grid w-full gap-1.5 py-3.5 text-left outline-none transition-colors hover:bg-surface-2/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-[14px] font-medium text-text">
                      <Target className="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted">
                      {p.percent}%
                    </span>
                  </span>
                  <ProgressBar
                    value={p.current}
                    max={p.target}
                    tone={p.reached ? "income" : "primary"}
                    size="sm"
                    label={p.name}
                  />
                  <span className="flex items-baseline justify-between gap-3 text-[12px] text-muted">
                    <span>
                      <AmountText value={p.current} className="font-semibold text-text" /> /{" "}
                      <AmountText value={p.target} tone="muted" />
                    </span>
                    {p.monthlyNeeded ? (
                      <span className="shrink-0 tabular-nums">
                        {formatMoney(p.monthlyNeeded, { locale, compact: true })}/{isEn ? "mo" : "bln"}
                      </span>
                    ) : p.reached ? (
                      <span className="font-semibold text-income">{isEn ? "Reached" : "Tercapai"}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : loaded ? (
        <p className="border-y border-line py-4 text-center text-[13px] text-muted">
          {isEn ? "No savings pockets yet." : "Belum ada kantong tabungan."}
        </p>
      ) : null}

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? (isEn ? "Edit savings pocket" : "Ubah kantong tabungan") : isEn ? "New savings pocket" : "Kantong tabungan baru"}
        size="sm"
        footer={
          <div className="flex gap-2">
            {editing ? (
              <Button type="button" variant="danger" disabled={saving} onClick={() => void remove(editing)}>
                <Trash2 aria-hidden="true" />
                {isEn ? "Delete" : "Hapus"}
              </Button>
            ) : null}
            <Button type="button" className="flex-1" isLoading={saving} onClick={() => void save()}>
              {isEn ? "Save" : "Simpan"}
            </Button>
          </div>
        }
      >
        <form onSubmit={(e) => void save(e)} className="grid gap-4 pt-1">
          <Field label={isEn ? "Pocket name" : "Nama kantong"}>
            <Input
              value={name}
              maxLength={60}
              placeholder={isEn ? "e.g. Emergency fund, Laptop" : "Mis. Dana Darurat, Beli Laptop"}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label={isEn ? "Target amount" : "Target nominal"}>
            <AmountInput value={targetAmount} onChange={setTargetAmount} />
          </Field>
          <Field label={isEn ? "Saved so far" : "Terkumpul saat ini"}>
            <AmountInput value={currentAmount} onChange={setCurrentAmount} />
          </Field>
          <Field label={isEn ? "Target date" : "Target tanggal"} optional={isEn ? "optional" : "opsional"}>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="[color-scheme:inherit]"
            />
          </Field>
        </form>
      </Sheet>
    </div>
  );
}
