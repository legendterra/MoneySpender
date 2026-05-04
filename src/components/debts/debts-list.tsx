"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DebtRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type ModalStep = "prompt" | "confirm";
type EditingDebt = DebtRecord | null;

export function DebtsList({
  title,
  records,
  currencyCode,
}: {
  title: string;
  records: DebtRecord[];
  currencyCode: string;
}) {
  const router = useRouter();
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [step, setStep] = useState<ModalStep>("prompt");
  const [countdown, setCountdown] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [editingDebt, setEditingDebt] = useState<EditingDebt>(null);

  useEffect(() => {
    if (!selectedDebt || step !== "confirm" || countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [selectedDebt, step, countdown]);

  function openModal(debt: DebtRecord) {
    setSelectedDebt(debt);
    setStep("prompt");
    setCountdown(10);
    setPaymentAmount("");
  }

  function closeModal() {
    setSelectedDebt(null);
    setStep("prompt");
    setCountdown(10);
    setPaymentAmount("");
  }

  async function markAsPaid() {
    if (!selectedDebt) {
      return;
    }

    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("debts")
      .update({
        paid_amount: selectedDebt.amount,
        is_paid: true,
        paid_at: new Date().toISOString(),
      })
      .eq("id", selectedDebt.id);

    if (!error && user) {
      await supabase.from("debt_payments").insert({
        user_id: user.id,
        debt_id: selectedDebt.id,
        amount: selectedDebt.remaining_amount,
        paid_date: new Date().toISOString().slice(0, 10),
        note: "Pelunasan",
      });
    }

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Hutang ditandai sudah dibayar.");
    closeModal();
    router.refresh();
  }

  async function savePartialPayment() {
    if (!selectedDebt) {
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Isi nominal bayar yang valid.");
      return;
    }

    const nextPaidAmount = Math.min(selectedDebt.amount, selectedDebt.paid_amount + amount);
    const isPaid = nextPaidAmount >= selectedDebt.amount;

    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("debts")
      .update({
        paid_amount: nextPaidAmount,
        is_paid: isPaid,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .eq("id", selectedDebt.id);

    if (!error && user) {
      await supabase.from("debt_payments").insert({
        user_id: user.id,
        debt_id: selectedDebt.id,
        amount,
        paid_date: new Date().toISOString().slice(0, 10),
        note: "Bayar sebagian",
      });
    }

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isPaid ? "Hutang sudah lunas." : "Pembayaran sebagian tersimpan.");
    closeModal();
    router.refresh();
  }

  async function updateDebt(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    const amount = Number(formData.get("amount") ?? 0);
    const paidAmount = Number(formData.get("paidAmount") ?? 0);
    const isPaid = paidAmount >= amount;

    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("debts")
      .update({
        amount,
        paid_amount: Math.min(amount, Math.max(0, paidAmount)),
        debt_date: String(formData.get("debtDate") ?? ""),
        source_name: String(formData.get("sourceName") ?? ""),
        lender_name: String(formData.get("lenderName") ?? ""),
        reason: String(formData.get("reason") ?? ""),
        is_paid: isPaid,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Hutang berhasil diedit.");
    setEditingDebt(null);
    router.refresh();
  }

  return (
    <>
      <Panel className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">Daftar hutang</p>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          </div>
          <p className="text-xs text-muted">Tidak ada tombol hapus. Kalau sudah selesai, tandai lunas.</p>
        </div>
        <div className="space-y-3">
          {records.length ? (
            records.map((record) => (
              <div
                key={record.id}
                className="grid gap-3 rounded-[26px] border border-border bg-background-strong p-4"
              >
                {editingDebt?.id === record.id ? (
                  <form action={updateDebt} className="grid gap-3">
                    <input type="hidden" name="id" value={record.id} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input name="amount" type="number" min="1" step="1000" defaultValue={record.amount} />
                      <Input name="paidAmount" type="number" min="0" step="1000" defaultValue={record.paid_amount} />
                      <Input name="debtDate" type="date" defaultValue={record.debt_date} />
                      <Input name="sourceName" defaultValue={record.source_name} />
                      <Input name="lenderName" defaultValue={record.lender_name} />
                      <Input name="reason" defaultValue={record.reason} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" type="submit" isLoading={isSaving}>Simpan edit</Button>
                      <Button size="sm" type="button" variant="secondary" onClick={() => setEditingDebt(null)}>Batal</Button>
                    </div>
                  </form>
                ) : (
                  <>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted">Nominal</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(record.amount, currencyCode)}
                    </p>
                    {record.paid_amount > 0 ? (
                      <p className="text-xs text-muted">
                        Sudah dibayar {formatCurrency(record.paid_amount, currencyCode)}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted">Siapa</p>
                    <p className="text-sm font-semibold text-foreground">{record.lender_name}</p>
                    <p className="text-xs text-muted">Dari {record.source_name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted">Tanggal</p>
                    <p className="text-sm font-semibold text-foreground">{formatDate(record.debt_date)}</p>
                  </div>
                  <div className="flex items-center justify-start md:justify-end">
                    {record.is_paid ? (
                      <span className="rounded-full border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                        Sudah dibayar
                      </span>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => openModal(record)}>
                        Bayar
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingDebt(record)}>
                    Edit hutang
                  </Button>
                </div>
                {record.payments?.length ? (
                  <div className="rounded-2xl border border-border bg-background px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Riwayat cicilan</p>
                    <div className="mt-2 grid gap-2">
                      {record.payments.map((payment) => (
                        <p key={payment.id} className="text-xs text-muted">
                          {formatDate(payment.paid_date)} | {formatCurrency(payment.amount, currencyCode)}
                          {payment.note ? ` | ${payment.note}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="text-sm leading-7 text-muted">{record.reason}</p>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-[26px] border border-dashed border-border px-4 py-8 text-sm leading-7 text-muted">
              Belum ada hutang bulan ini.
            </div>
          )}
        </div>
      </Panel>

      {selectedDebt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="glass-panel w-full max-w-lg rounded-[30px] p-6">
            {step === "prompt" ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-5 text-danger" />
                  <div>
                    <p className="text-sm font-semibold text-danger">Cek dulu</p>
                    <h3 className="text-2xl font-bold text-foreground">Hutang ini sudah dibayar?</h3>
                  </div>
                </div>
                <p className="text-sm leading-7 text-muted">
                  Sisa {formatCurrency(selectedDebt.remaining_amount, currencyCode)} dari total{" "}
                  {formatCurrency(selectedDebt.amount, currencyCode)} untuk {selectedDebt.lender_name}.
                </p>
                <div className="grid gap-2 rounded-[24px] border border-border bg-background-strong p-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    Bayar sebagian
                  </label>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Contoh: 50000"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => void savePartialPayment()}
                      isLoading={isSaving}
                    >
                      Simpan bayar
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" onClick={closeModal}>
                    Belum
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setStep("confirm");
                      setCountdown(10);
                    }}
                  >
                    Ya, lanjut
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Clock3 className="size-5 text-danger" />
                  <div>
                    <p className="text-sm font-semibold text-danger">Satu kali lagi</p>
                    <h3 className="text-2xl font-bold text-foreground">Yakin sudah lunas?</h3>
                  </div>
                </div>
                <p className="text-sm leading-7 text-muted">
                  Tombol final baru aktif setelah hitungan selesai, biar tidak kepencet.
                </p>
                <div className="rounded-[24px] border border-danger/20 bg-danger/8 px-4 py-4 text-sm text-danger">
                  Countdown: <span className="font-bold">{countdown}</span> detik
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" onClick={closeModal}>
                    Batal
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => void markAsPaid()}
                    disabled={countdown > 0}
                    isLoading={isSaving}
                  >
                    <CheckCircle2 className="size-4" />
                    Ya, tandai lunas
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
