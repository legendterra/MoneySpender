"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { TransactionRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function TransactionsList({
  title,
  records,
  currencyCode,
}: {
  title: string;
  records: TransactionRecord[];
  currencyCode: string;
}) {
  const router = useRouter();

  async function handleDelete(id: string) {
    const approved = window.confirm("Hapus transaksi ini?");

    if (!approved) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Transaksi berhasil dihapus.");
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
              className="grid gap-3 rounded-[26px] border border-border bg-background-strong p-4"
            >
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
            </div>
          ))
        ) : (
          <div className="rounded-[26px] border border-dashed border-border px-4 py-8 text-sm leading-7 text-muted">
            Belum ada transaksi bulan ini.
          </div>
        )}
      </div>
    </Panel>
  );
}
