"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CircleDollarSign, CreditCard, Plus, Store, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { enqueueOfflineMutation } from "@/lib/offline-queue";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Category, FinanceTransactionType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const transactionSchema = z.object({
  amount: z.number().positive("Nominal harus lebih dari 0"),
  categoryId: z.string().uuid("Pilih kategori"),
  transactionDate: z.string().min(1, "Tanggal wajib diisi"),
  reason: z.string().min(2, "Isi alasan minimal 2 karakter"),
  merchant: z.string().optional(),
  paymentMethod: z.string().optional(),
  walletId: z.string().optional(),
  attachmentUrl: z.string().url("Link lampiran harus berupa URL").optional().or(z.literal("")),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type SplitRow = { id: string; categoryId: string; amount: string };

export function TransactionForm({
  title,
  description,
  categories,
  wallets,
  type,
}: {
  title: string;
  description: string;
  categories: Category[];
  wallets?: import("@/lib/types").Wallet[];
  type: FinanceTransactionType;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);

  const defaultCategoryId = categories[0]?.id ?? "";
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      categoryId: defaultCategoryId,
      transactionDate: new Date().toISOString().slice(0, 10),
      reason: "",
      merchant: "",
      paymentMethod: type === "income" ? "Transfer" : "QRIS",
      walletId: wallets?.[0]?.id ?? "",
      attachmentUrl: "",
    },
  });

  const liveAmount = useWatch({
    control: form.control,
    name: "amount",
  });
  const preview = useMemo(() => formatCurrency(Number(liveAmount) || 0), [liveAmount]);

  async function onSubmit(values: TransactionFormValues) {
    setIsSubmitting(true);
    const category = categories.find((item) => item.id === values.categoryId);
    const wallet = wallets?.find((item) => item.id === values.walletId);
    const payload = {
      amount: values.amount,
      type,
      category_id: values.categoryId,
      category_label: category?.name ?? null,
      wallet_id: values.walletId || null,
      wallet_label: wallet?.name ?? null,
      transaction_date: values.transactionDate,
      reason: values.reason,
      merchant: values.merchant || null,
      payment_method: values.paymentMethod || null,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOfflineMutation("transactions", payload);
      setIsSubmitting(false);
      toast.success("Disimpan offline. Nanti otomatis sync saat koneksi balik.");
      form.reset({
        amount: 0,
        categoryId: defaultCategoryId,
        transactionDate: new Date().toISOString().slice(0, 10),
        reason: "",
        merchant: "",
        paymentMethod: type === "income" ? "Transfer" : "QRIS",
        walletId: wallets?.[0]?.id ?? "",
        attachmentUrl: "",
      });
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir. Silakan masuk ulang.");
      setIsSubmitting(false);
      return;
    }

    const { data: insertedTransaction, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        ...payload,
      })
      .select("id")
      .single();

    if (!error && insertedTransaction?.id && receiptFile) {
      const extension = receiptFile.name.split(".").pop() ?? "file";
      const path = `${user.id}/receipts/${insertedTransaction.id}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, receiptFile, {
        upsert: false,
      });

      if (uploadError) {
        toast.error(`Transaksi tersimpan, tapi upload struk gagal: ${uploadError.message}`);
      } else {
        await supabase.from("transaction_attachments").insert({
          user_id: user.id,
          transaction_id: insertedTransaction.id,
          label: receiptFile.name,
          file_url: path,
        });
      }
    } else if (!error && values.attachmentUrl) {
      if (insertedTransaction?.id) {
        await supabase.from("transaction_attachments").insert({
          user_id: user.id,
          transaction_id: insertedTransaction.id,
          label: "Lampiran",
          file_url: values.attachmentUrl,
        });
      }
    }

    const validSplits = splitRows
      .map((row) => {
        const splitCategory = categories.find((category) => category.id === row.categoryId);
        return {
          user_id: user.id,
          transaction_id: insertedTransaction?.id,
          category_id: row.categoryId || null,
          category_label: splitCategory?.name ?? null,
          amount: Number(row.amount),
        };
      })
      .filter((row) => row.transaction_id && row.amount > 0);

    if (!error && validSplits.length) {
      await supabase.from("transaction_splits").insert(validSplits);
    }

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`${type === "income" ? "Pemasukan" : "Pengeluaran"} berhasil disimpan.`);
    form.reset({
      amount: 0,
      categoryId: defaultCategoryId,
      transactionDate: new Date().toISOString().slice(0, 10),
      reason: "",
      merchant: "",
      paymentMethod: type === "income" ? "Transfer" : "QRIS",
      walletId: wallets?.[0]?.id ?? "",
      attachmentUrl: "",
    });
    setReceiptFile(null);
    setSplitRows([]);
    router.refresh();
  }

  return (
    <Panel className="space-y-6" id="form">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent-strong">
          {type === "income" ? "Uang masuk" : "Uang keluar"}
        </p>
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        <p className="text-sm leading-7 text-muted">{description}</p>
      </div>

      <div className="rounded-[28px] border border-border bg-background-strong p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Nominal yang akan disimpan</p>
        <p className="mt-2 text-4xl font-bold text-foreground">{preview}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nominal" error={form.formState.errors.amount?.message}>
            <div className="relative">
              <CircleDollarSign className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                type="number"
                min="0"
                step="1000"
                className="pl-11"
                {...form.register("amount", { valueAsNumber: true })}
              />
            </div>
          </Field>
          <Field label="Kategori" error={form.formState.errors.categoryId?.message}>
            <Select {...form.register("categoryId")}>
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tanggal" error={form.formState.errors.transactionDate?.message}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input type="date" className="pl-11" {...form.register("transactionDate")} />
            </div>
          </Field>
          <Field label="Metode bayar / terima">
            <div className="relative">
              <CreditCard className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-11"
                placeholder="Contoh: Transfer, Tunai, QRIS"
                {...form.register("paymentMethod")}
              />
            </div>
          </Field>
          <Field label="Dompet / akun">
            <Select {...form.register("walletId")}>
              <option value="">Tanpa dompet</option>
              {(wallets ?? []).map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Catatan" error={form.formState.errors.reason?.message}>
            <Textarea placeholder="Contoh: makan siang, invoice freelance, belanja bulanan" {...form.register("reason")} />
          </Field>
          <Field label="Detail tambahan">
            <div className="space-y-4 rounded-[28px] border border-border bg-background-strong p-4">
              <div className="relative">
                <Store className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input className="pl-11" placeholder="Toko, klien, atau sumber dana" {...form.register("merchant")} />
              </div>
              <Input placeholder="Link struk / bukti transfer (opsional)" {...form.register("attachmentUrl")} />
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground">
                <Upload className="size-4 text-accent-strong" />
                <span className="min-w-0 flex-1 truncate">
                  {receiptFile ? receiptFile.name : "Upload struk / bukti transfer"}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-7 text-muted">
                Isi kalau ingat. Detail kecil seperti metode bayar atau toko sering berguna saat kamu cek riwayat.
              </div>
            </div>
          </Field>
        </div>

        <div className="rounded-[28px] border border-border bg-background-strong p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Split kategori</p>
              <p className="text-xs text-muted">Opsional, untuk satu transaksi yang isinya campuran beberapa kategori.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setSplitRows((rows) => [...rows, { id: crypto.randomUUID(), categoryId: "", amount: "" }])}
            >
              <Plus className="size-4" />
              Tambah split
            </Button>
          </div>
          {splitRows.length ? (
            <div className="mt-4 grid gap-3">
              {splitRows.map((row) => (
                <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_0.8fr_auto]">
                  <Select
                    value={row.categoryId}
                    onChange={(event) =>
                      setSplitRows((rows) => rows.map((item) => item.id === row.id ? { ...item, categoryId: event.target.value } : item))
                    }
                  >
                    <option value="">Pilih kategori split</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Nominal split"
                    value={row.amount}
                    onChange={(event) =>
                      setSplitRows((rows) => rows.map((item) => item.id === row.id ? { ...item, amount: event.target.value } : item))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSplitRows((rows) => rows.filter((item) => item.id !== row.id))}
                  >
                    <Trash2 className="size-4" />
                    Hapus
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Simpan {type === "income" ? "uang masuk" : "uang keluar"}
        </Button>
      </form>
    </Panel>
  );
}
