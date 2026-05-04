"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Category, FinanceTransactionType, RecurringTransaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function RecurringSettings({
  categories,
  recurringTransactions,
  currencyCode,
}: {
  categories: Category[];
  recurringTransactions: RecurringTransaction[];
  currencyCode: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<FinanceTransactionType>("expense");
  const [isSaving, setIsSaving] = useState(false);
  const visibleCategories = categories.filter((category) => category.type === type);

  async function addRecurring(formData: FormData) {
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

    const categoryId = String(formData.get("categoryId") ?? "");
    const category = categories.find((item) => item.id === categoryId);
    const { error } = await supabase.from("recurring_transactions").insert({
      user_id: user.id,
      type,
      category_id: categoryId || null,
      category_label: category?.name ?? null,
      amount: Number(formData.get("amount") ?? 0),
      reason: String(formData.get("reason") ?? ""),
      merchant: String(formData.get("merchant") ?? "") || null,
      payment_method: String(formData.get("paymentMethod") ?? "") || null,
      day_of_month: Number(formData.get("dayOfMonth") ?? 1),
      is_active: true,
    });

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Template transaksi berulang tersimpan.");
    router.refresh();
  }

  async function deleteRecurring(id: string) {
    const approved = window.confirm("Hapus template transaksi berulang ini?");

    if (!approved) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Template dihapus.");
    router.refresh();
  }

  async function applyRecurring(item: RecurringTransaction) {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      return;
    }

    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), item.day_of_month);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: item.type,
      category_id: item.category_id,
      category_label: item.category_label,
      amount: item.amount,
      reason: item.reason,
      merchant: item.merchant,
      payment_method: item.payment_method,
      transaction_date: date.toISOString().slice(0, 10),
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Template sudah masuk ke transaksi bulan ini.");
    router.refresh();
  }

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Recurring</p>
        <h2 className="text-2xl font-bold text-foreground">Template transaksi rutin</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Simpan pola gaji, subscription, atau tagihan tetap biar bulan depan tinggal dijalankan.
        </p>
      </div>

      <form action={addRecurring} className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Select value={type} onChange={(event) => setType(event.target.value as FinanceTransactionType)}>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </Select>
          <Select name="categoryId" defaultValue="">
            <option value="">Pilih kategori</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Input name="amount" type="number" min="1" step="1000" placeholder="Nominal" required />
          <Input name="dayOfMonth" type="number" min="1" max="28" defaultValue="1" placeholder="Tanggal tiap bulan" />
          <Input name="reason" placeholder="Catatan, contoh: Spotify / Gaji" required />
          <Input name="paymentMethod" placeholder="Metode, contoh: QRIS / Transfer" />
          <Input name="merchant" placeholder="Toko, klien, atau sumber" className="md:col-span-2" />
        </div>
        <Button type="submit" isLoading={isSaving}>
          Simpan template
        </Button>
      </form>

      <div className="grid gap-3">
        {recurringTransactions.length ? (
          recurringTransactions.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background-strong p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{item.reason}</p>
                <p className="mt-1 text-xs text-muted">
                  {item.category_label ?? "Tanpa kategori"} | tanggal {item.day_of_month} |{" "}
                  {formatCurrency(item.amount, currencyCode)}
                  {item.last_generated_month ? ` | terakhir otomatis ${item.last_generated_month}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => void applyRecurring(item)}>
                  Jalankan
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void deleteRecurring(item.id)}>
                  <Trash2 className="size-4" />
                  Hapus
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm leading-7 text-muted">
            Belum ada template rutin.
          </div>
        )}
      </div>
    </Panel>
  );
}
