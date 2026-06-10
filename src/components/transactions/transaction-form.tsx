"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CircleDollarSign, CreditCard, Store } from "lucide-react";
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
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function TransactionForm({
  title,
  description,
  categories,
  type,
}: {
  title: string;
  description: string;
  categories: Category[];
  type: FinanceTransactionType;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const payload = {
      amount: values.amount,
      type,
      category_id: values.categoryId,
      category_label: category?.name ?? null,
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

    const { error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        ...payload,
      });

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
    });
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

      <div className="rounded-lg border border-border bg-background-strong p-5">
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
        </div>

        <div className="grid gap-4">
          <Field label="Catatan" error={form.formState.errors.reason?.message}>
            <Textarea placeholder="Contoh: makan siang, invoice freelance, belanja bulanan" {...form.register("reason")} />
          </Field>
          <Field label="Detail tambahan">
            <div className="space-y-4 rounded-lg border border-border bg-background-strong p-4">
              <div className="relative">
                <Store className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input className="pl-11" placeholder="Toko, klien, atau sumber dana" {...form.register("merchant")} />
              </div>
              <div className="rounded-md bg-accent-soft px-4 py-3 text-sm leading-7 text-muted">
                Isi kalau ingat. Detail kecil seperti metode bayar atau toko sering berguna saat kamu cek riwayat.
              </div>
            </div>
          </Field>
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Simpan {type === "income" ? "uang masuk" : "uang keluar"}
        </Button>
      </form>
    </Panel>
  );
}
