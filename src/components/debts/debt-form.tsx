"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  UserRound,
  Wallet,
} from "lucide-react";
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
import type { Category, Wallet as WalletType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

// Platform / asal preset — user bisa pilih atau ketik manual lewat "Lainnya"
const SOURCE_PRESETS = [
  "BCA", "Mandiri", "BRI", "BNI", "CIMB Niaga", "Danamon",
  "GoPay", "OVO", "Dana", "ShopeePay",
  "Transfer Bank", "Tunai",
] as const;

const debtSchema = z.object({
  direction:   z.enum(["payable", "receivable"]),
  amount:      z.number().positive("Nominal harus lebih dari 0"),
  debtDate:    z.string().min(1, "Tanggal wajib diisi"),
  walletId:    z.string().min(1, "Pilih dompet yang terpengaruh"),
  contactName: z.string().min(2, "Isi nama minimal 2 karakter"),
  sourcePreset: z.string(),              // "Lainnya" → tampilkan input manual
  sourceCustom: z.string().optional(),  // input manual jika preset = "Lainnya"
  reason:      z.string().min(4, "Isi alasan minimal 4 karakter"),
});

type DebtFormValues = z.infer<typeof debtSchema>;

export function DebtForm({
  title,
  description,
  categories,
  wallets,
}: {
  title: string;
  description: string;
  categories: Category[];
  wallets: WalletType[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCategory =
    categories.find((c) => c.name.toLowerCase() === "utang") ?? categories[0];

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      direction:    "payable",
      amount:       0,
      debtDate:     new Date().toISOString().slice(0, 10),
      walletId:     wallets[0]?.id ?? "",
      contactName:  "",
      sourcePreset: wallets[0]?.name ?? "Lainnya",
      sourceCustom: "",
      reason:       "",
    },
  });

  const [liveAmount, liveDirection, liveWalletId, liveSourcePreset] = useWatch({
    control: form.control,
    name: ["amount", "direction", "walletId", "sourcePreset"],
  });

  const isPayable    = liveDirection === "payable";
  const isOtherSource = liveSourcePreset === "Lainnya";
  const preview      = useMemo(() => formatCurrency(Number(liveAmount) || 0), [liveAmount]);
  const selectedWallet = wallets.find((w) => w.id === liveWalletId);

  function resetForm() {
    form.reset({
      direction:    "payable",
      amount:       0,
      debtDate:     new Date().toISOString().slice(0, 10),
      walletId:     wallets[0]?.id ?? "",
      contactName:  "",
      sourcePreset: wallets[0]?.name ?? "Lainnya",
      sourceCustom: "",
      reason:       "",
    });
  }

  async function onSubmit(values: DebtFormValues) {
    setIsSubmitting(true);

    const sourceName = values.sourcePreset === "Lainnya"
      ? (values.sourceCustom?.trim() || "Lainnya")
      : values.sourcePreset;

    const wallet = wallets.find((w) => w.id === values.walletId);

    const payload = {
      direction:      values.direction,
      amount:         values.amount,
      debt_date:      values.debtDate,
      wallet_id:      values.walletId || null,
      wallet_label:   wallet?.name ?? null,
      contact_name:   values.contactName,
      source_name:    sourceName,
      reason:         values.reason,
      category_id:    defaultCategory?.id ?? null,
      category_label: defaultCategory?.name ?? "Utang",
      // backward compat
      lender_name:    values.direction === "payable" ? values.contactName : "-",
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOfflineMutation("debts", payload);
      setIsSubmitting(false);
      toast.success("Disimpan offline. Nanti sync otomatis.");
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

    toast.success(
      isPayable
        ? `Hutang dari ${values.contactName} tersimpan. Dompet ${wallet?.name ?? ""} +${formatCurrency(values.amount)}.`
        : `Piutang ke ${values.contactName} tersimpan. Dompet ${wallet?.name ?? ""} −${formatCurrency(values.amount)}.`,
    );
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
          Hutang
          <span className="hidden text-xs font-normal sm:inline">(kamu yang bayar)</span>
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
          Piutang
          <span className="hidden text-xs font-normal sm:inline">(orang lain yang bayar)</span>
        </button>
      </div>

      {/* Penjelasan efek ke wallet */}
      <div className={`rounded-lg border p-4 text-sm leading-7 ${
        isPayable ? "border-danger/20 bg-danger/8" : "border-accent/20 bg-accent-soft"
      }`}>
        <p className={`font-semibold ${isPayable ? "text-danger" : "text-accent"}`}>
          {isPayable
            ? "Kamu berhutang → uang masuk ke dompetmu"
            : "Kamu memberi pinjaman → uang keluar dari dompetmu"}
        </p>
        <p className="mt-1 text-muted">
          {isPayable
            ? `Contoh: pinjam Rp ${formatCurrency(Number(liveAmount) || 2000000)} dari seseorang → masuk ke ${selectedWallet?.name ?? "dompet pilihanmu"}. Net Worth tidak berubah (aset + liabilitas sama-sama naik).`
            : `Contoh: kasih pinjam Rp ${formatCurrency(Number(liveAmount) || 500000)} ke seseorang dari ${selectedWallet?.name ?? "dompet pilihanmu"}. Net Worth tidak berubah (aset pindah bentuk).`}
        </p>
      </div>

      {/* Nominal preview */}
      <div className={`rounded-lg border p-5 ${
        isPayable ? "border-danger/20 bg-danger/8" : "border-accent/20 bg-accent-soft"
      }`}>
        <p className={`text-xs uppercase tracking-[0.22em] ${isPayable ? "text-danger" : "text-accent"}`}>
          Nominal {isPayable ? "hutang" : "piutang"}
        </p>
        <p className="mt-2 text-4xl font-bold text-foreground">{preview}</p>
        {selectedWallet && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Wallet className="size-3.5" />
            {isPayable ? "Masuk ke" : "Keluar dari"}{" "}
            <span className={isPayable ? "text-danger" : "text-accent"}>{selectedWallet.name}</span>
          </p>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {/* Row 1: nominal + tanggal */}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nominal" error={form.formState.errors.amount?.message}>
            <div className="relative">
              <CircleDollarSign className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                type="number" min="0" step="1" className="pl-11"
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

        {/* Row 2: dompet yang terpengaruh */}
        <Field
          label={isPayable ? "Dompet penerima (uang masuk)" : "Dompet sumber (uang keluar)"}
          error={form.formState.errors.walletId?.message}
        >
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Select className="pl-11" {...form.register("walletId")}>
              <option value="">Pilih dompet</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.kind})
                </option>
              ))}
            </Select>
          </div>
        </Field>

        {/* Row 3: nama kontak + source */}
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={isPayable ? "Nama pemberi hutang" : "Nama peminjam"}
            error={form.formState.errors.contactName?.message}
          >
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-11"
                placeholder={isPayable ? "Siapa yang kamu hutangi?" : "Siapa yang meminjam uangmu?"}
                {...form.register("contactName")}
              />
            </div>
          </Field>

          {/* Source: dropdown preset + cascade input jika "Lainnya" */}
          <Field
            label={isPayable ? "Asal / Platform pemberi" : "Via / Platform pengiriman"}
            error={form.formState.errors.sourcePreset?.message}
          >
            <div className="relative">
              <Landmark className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Select className="pl-11" {...form.register("sourcePreset")}>
                {wallets.map((w) => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
                <optgroup label="─ Platform umum ─">
                  {SOURCE_PRESETS.filter(
                    (s) => !wallets.some((w) => w.name.toLowerCase() === s.toLowerCase()),
                  ).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
                <option value="Lainnya">Lainnya (ketik manual)</option>
              </Select>
            </div>
          </Field>
        </div>

        {/* Cascade: input manual jika "Lainnya" dipilih */}
        {isOtherSource && (
          <Field label="Ketik nama platform / asal" error={form.formState.errors.sourceCustom?.message}>
            <div className="relative">
              <Landmark className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-11"
                placeholder="Contoh: Koperasi Kantor, Pinjol X, Arisan"
                {...form.register("sourceCustom")}
                autoFocus
              />
            </div>
          </Field>
        )}

        {/* Alasan */}
        <Field label="Alasan / Keterangan" error={form.formState.errors.reason?.message}>
          <Textarea
            placeholder="Tulis alasan singkat supaya nanti ingat konteksnya"
            {...form.register("reason")}
          />
        </Field>

        {/* Warning no wallets */}
        {wallets.length === 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-7 text-warning">
            Belum ada dompet. Tambahkan di{" "}
            <a href="/settings" className="font-semibold underline">Settings</a>{" "}
            supaya hutang/piutang bisa terkait dengan saldo.
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
