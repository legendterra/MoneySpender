"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CircleDollarSign, Landmark, UserRound, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { enqueueOfflineMutation } from "@/lib/offline-queue";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const debtSchema = z.object({
  direction: z.enum(["payable", "receivable"]),
  amount: z.number().positive("Nominal harus lebih dari 0"),
  debtDate: z.string().min(1, "Tanggal wajib diisi"),
  sourceName: z.string().min(2, "Isi sumber minimal 2 karakter"),
  contactName: z.string().min(2, "Isi nama minimal 2 karakter"),
  reason: z.string().min(4, "Isi alasan minimal 4 karakter"),
});

type DebtFormValues = z.infer<typeof debtSchema>;

export function DebtForm({
  title,
  description,
  categories,
}: {
  title: string;
  description: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultCategory =
    categories.find((c) => c.name.toLowerCase() === "utang") ?? categories[0];

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      direction: "payable",
      amount: 0,
      debtDate: new Date().toISOString().slice(0, 10),
      sourceName: "",
      contactName: "",
      reason: "",
    },
  });

  const [liveAmount, liveDirection] = useWatch({
    control: form.control,
    name: ["amount", "direction"],
  });

  const preview = useMemo(() => formatCurrency(Number(liveAmount) || 0), [liveAmount]);
  const isPayable = liveDirection === "payable";

  function resetForm() {
    form.reset({
      direction: "payable",
      amount: 0,
      debtDate: new Date().toISOString().slice(0, 10),
      sourceName: "",
      contactName: "",
      reason: "",
    });
  }

  async function onSubmit(values: DebtFormValues) {
    setIsSubmitting(true);
    const payload = {
      amount: values.amount,
      debt_date: values.debtDate,
      source_name: values.sourceName,
      contact_name: values.contactName,
      // keep backward compat field for old schema rows
      lender_name: values.direction === "payable" ? values.contactName : "-",
      reason: values.reason,
      direction: values.direction,
      category_id: defaultCategory?.id ?? null,
      category_label: defaultCategory?.name ?? "Utang",
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOfflineMutation("debts", payload);
      setIsSubmitting(false);
      toast.success("Disimpan offline. Nanti otomatis sync saat koneksi balik.");
      resetForm();
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("debts").insert({ user_id: user.id, ...payload });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isPayable ? "Hutang berhasil disimpan." : "Piutang berhasil disimpan.");
    resetForm();
    router.refresh();
  }

  return (
    <Panel className="space-y-6" id="form">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-danger">
          Catatan hutang &amp; piutang
        </p>
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        <p className="text-sm leading-7 text-muted">{description}</p>
      </div>

      {/* Direction toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => form.setValue("direction", "payable")}
          className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
            isPayable
              ? "border-danger bg-danger/10 text-danger"
              : "border-border bg-background-strong text-muted hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="size-4" />
          Hutang (kamu berhutang)
        </button>
        <button
          type="button"
          onClick={() => form.setValue("direction", "receivable")}
          className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
            !isPayable
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-background-strong text-muted hover:text-foreground"
          }`}
        >
          <ArrowDownLeft className="size-4" />
          Piutang (orang berhutang ke kamu)
        </button>
      </div>

      {/* Nominal preview */}
      <div
        className={`rounded-lg border p-5 ${
          isPayable
            ? "border-danger/20 bg-danger/8"
            : "border-accent/20 bg-accent-soft"
        }`}
      >
        <p className={`text-xs uppercase tracking-[0.22em] ${isPayable ? "text-danger" : "text-accent"}`}>
          {isPayable ? "Nominal hutang" : "Nominal piutang"}
        </p>
        <p className="mt-2 text-4xl font-bold text-foreground">{preview}</p>
        <p className="mt-2 text-xs text-muted">
          {isPayable
            ? "Uang yang kamu pinjam dan harus dikembalikan"
            : "Uang yang kamu pinjamkan dan akan kamu terima kembali"}
        </p>
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
          <Field label="Tanggal" error={form.formState.errors.debtDate?.message}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input type="date" className="pl-11" {...form.register("debtDate")} />
            </div>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={isPayable ? "Nama pemberi hutang" : "Nama peminjam"}
            error={form.formState.errors.contactName?.message}
          >
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-11"
                placeholder={isPayable ? "Nama orang / lembaga yang kamu hutangi" : "Siapa yang pinjam uangmu?"}
                {...form.register("contactName")}
              />
            </div>
          </Field>
          <Field
            label="Asal / Platform"
            error={form.formState.errors.sourceName?.message}
          >
            <div className="relative">
              <Landmark className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-11"
                placeholder="Contoh: Transfer BCA, Koperasi, Teman"
                {...form.register("sourceName")}
              />
            </div>
          </Field>
        </div>

        <Field label="Alasan / Keterangan" error={form.formState.errors.reason?.message}>
          <Textarea
            placeholder="Tulis alasan singkat, biar nanti ingat konteksnya"
            {...form.register("reason")}
          />
        </Field>

        {isPayable && (
          <div className="rounded-lg border border-danger/20 bg-danger/8 px-4 py-4 text-sm leading-7 text-danger">
            Pastikan ada rencana bayar sebelum menambah hutang baru. Hutang yang tercatat akan mengurangi Net Worth kamu.
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          variant={isPayable ? "danger" : "primary"}
        >
          Simpan {isPayable ? "hutang" : "piutang"}
        </Button>
      </form>
    </Panel>
  );
}
