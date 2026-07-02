"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Category, TransactionRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function TransactionsList({
  title,
  records,
  currencyCode,
  categories = [],
}: {
  title: string;
  records: TransactionRecord[];
  currencyCode: string;
  categories?: Category[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleDelete(id: string) {
    const approved = window.confirm("Hapus transaksi ini?");

    if (!approved) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      return;
    }

    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Transaksi berhasil dihapus.");
    router.refresh();
  }

  function startEdit(record: TransactionRecord) {
    setEditingId(record.id);
  }

  async function handleUpdate(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    const categoryId = String(formData.get("categoryId") ?? "");
    const category = categories.find((item) => item.id === categoryId);
    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("transactions")
      .update({
        amount: Number(formData.get("amount") ?? 0),
        category_id: categoryId || null,
        category_label: category?.name ?? null,
        transaction_date: String(formData.get("transactionDate") ?? ""),
        reason: String(formData.get("reason") ?? ""),
        merchant: String(formData.get("merchant") ?? "") || null,
        payment_method: String(formData.get("paymentMethod") ?? "") || null,
      })
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Transaksi berhasil diperbarui.");
    setEditingId(null);
    router.refresh();
  }

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Catatan bulan ini</p>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3">
        {records.length ? (
          records.map((record) => (
            <div
              key={record.id}
              className="grid gap-3 rounded-lg border border-border bg-background-strong p-4"
            >
              {editingId === record.id ? (
                <form action={handleUpdate} className="grid gap-3">
                  <input type="hidden" name="id" value={record.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Nominal</span>
                      <Input name="amount" type="number" min="0" step="1" defaultValue={record.amount} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Kategori</span>
                      <Select name="categoryId" defaultValue={record.category_id ?? ""}>
                        <option value="">Tanpa kategori</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Tanggal</span>
                      <Input name="transactionDate" type="date" defaultValue={record.transaction_date} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Metode</span>
                      <Input name="paymentMethod" defaultValue={record.payment_method ?? ""} />
                    </label>
                  </div>
                  <div className="grid gap-3">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Catatan</span>
                      <Textarea name="reason" defaultValue={record.reason ?? ""} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Toko / sumber</span>
                      <Input name="merchant" defaultValue={record.merchant ?? ""} />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="submit" isLoading={isSaving}>
                      Simpan edit
                    </Button>
                    <Button size="sm" variant="secondary" type="button" onClick={() => setEditingId(null)}>
                      <X className="size-4" />
                      Batal
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">
                        {record.category_label || "Tanpa kategori"}
                      </p>
                      <p className="text-sm text-muted">{record.reason || "Tanpa catatan"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(record.amount, currencyCode)}
                      </p>
                      <Button variant="secondary" size="sm" onClick={() => startEdit(record)}>
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="size-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{formatDate(record.transaction_date)}</span>
                    {record.merchant ? <span>| {record.merchant}</span> : null}
                    {record.payment_method ? <span>| {record.payment_method}</span> : null}
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm leading-7 text-muted">
            Belum ada transaksi bulan ini.
          </div>
        )}
      </div>
    </Panel>
  );
}
