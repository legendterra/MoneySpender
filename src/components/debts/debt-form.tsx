"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CircleDollarSign, Landmark, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const debtSchema = z.object({
  amount: z.number().positive("Nominal harus lebih dari 0"),
  debtDate: z.string().min(1, "Tanggal wajib diisi"),
  sourceName: z.string().min(2, "Isi asal transaksi minimal 2 karakter"),
  lenderName: z.string().min(2, "Isi nama pemberi hutang minimal 2 karakter"),
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
  const defaultCategory = categories.find((category) => category.name.toLowerCase() === "utang") ?? categories[0];

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      amount: 0,
      debtDate: new Date().toISOString().slice(0, 10),
      sourceName: "",
      lenderName: "",
      reason: "",
    },
  });

  const liveAmount = useWatch({
    control: form.control,
    name: "amount",
  });

  const preview = useMemo(() => formatCurrency(Number(liveAmount) || 0), [liveAmount]);

  async function onSubmit(values: DebtFormValues) {
    setIsSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("debts").insert({
      user_id: user.id,
      amount: values.amount,
      debt_date: values.debtDate,
      source_name: values.sourceName,
      lender_name: values.lenderName,
      reason: values.reason,
      category_id: defaultCategory?.id ?? null,
      category_label: defaultCategory?.name ?? "Utang",
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Data hutang berhasil disimpan.");
    form.reset({
      amount: 0,
      debtDate: new Date().toISOString().slice(0, 10),
      sourceName: "",
      lenderName: "",
      reason: "",
    });
    router.refresh();
  }

  return (
    <Panel className="space-y-6" id="form">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-danger">Catatan hutang</p>
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        <p className="text-sm leading-7 text-muted">{description}</p>
      </div>

      <div className="rounded-[28px] border border-danger/20 bg-danger/8 p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-danger">Nominal hutang</p>
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
          <Field label="Tanggal" error={form.formState.errors.debtDate?.message}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input type="date" className="pl-11" {...form.register("debtDate")} />
            </div>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Dari mana" error={form.formState.errors.sourceName?.message}>
            <div className="relative">
              <Landmark className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input className="pl-11" placeholder="Contoh: Pinjol A / Teman / Koperasi" {...form.register("sourceName")} />
            </div>
          </Field>
          <Field label="Ke siapa" error={form.formState.errors.lenderName?.message}>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input className="pl-11" placeholder="Nama orang / lembaga" {...form.register("lenderName")} />
            </div>
          </Field>
        </div>

        <Field label="Alasan" error={form.formState.errors.reason?.message}>
          <Textarea
            placeholder="Tulis alasan singkat, biar nanti ingat konteksnya"
            {...form.register("reason")}
          />
        </Field>

        <div className="rounded-[24px] border border-danger/20 bg-danger/8 px-4 py-4 text-sm leading-7 text-danger">
          Catatan kecil: pastikan ada rencana bayar sebelum menambah hutang baru.
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} variant="danger">
          Simpan hutang
        </Button>
      </form>
    </Panel>
  );
}
