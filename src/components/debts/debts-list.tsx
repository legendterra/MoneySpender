"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { clampDebtPayment, recordDebtPayment } from "@/lib/debt-payments";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DebtRecord, Wallet } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type ModalStep = "prompt" | "confirm";

export function DebtsList({
  title,
  records,
  currencyCode,
  wallets = [],
}: {
  title: string;
  records: DebtRecord[];
  currencyCode: string;
  wallets?: Wallet[];
}) {
  const router = useRouter();
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [step, setStep] = useState<ModalStep>("prompt");
  const [countdown, setCountdown] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentWalletId, setPaymentWalletId] = useState("");
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);

  useEffect(() => {
    if (!selectedDebt || step !== "confirm" || countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [selectedDebt, step, countdown]);

  function openModal(debt: DebtRecord) {
    setSelectedDebt(debt);
    setStep("prompt");
    setCountdown(10);
    setPaymentAmount("");
    setPaymentWalletId(debt.wallet_id ?? wallets[0]?.id ?? "");
  }

  function closeModal() {
    setSelectedDebt(null);
    setStep("prompt");
    setCountdown(10);
    setPaymentAmount("");
  }

  async function pay(requested: number, note: string) {
    if (!selectedDebt) return;
    const amount = clampDebtPayment(selectedDebt, requested);
    if (amount <= 0) { toast.error("Isi nominal yang valid."); return; }

    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); toast.error("Sesi login berakhir."); return; }

    const wallet = wallets.find((w) => w.id === paymentWalletId);
    try {
      const result = await recordDebtPayment(supabase, {
        userId: user.id,
        debt: selectedDebt,
        amount,
        walletId: wallet?.id ?? selectedDebt.wallet_id,
        walletLabel: wallet?.name ?? selectedDebt.wallet_label,
        note,
      });
      if (amount < requested) {
        toast.info(`Nominal disesuaikan ke sisa ${formatCurrency(amount, currencyCode)}.`);
      }
      toast.success(
        result.isPaid
          ? selectedDebt.direction === "payable" ? "Hutang ditandai lunas." : "Piutang ditandai lunas/diterima."
          : "Pembayaran sebagian tersimpan.",
      );
      closeModal();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pembayaran gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function markAsPaid() {
    if (!selectedDebt) return;
    await pay(selectedDebt.remaining_amount, "Pelunasan penuh");
  }

  async function savePartialPayment() {
    await pay(Number(paymentAmount), "Bayar sebagian");
  }

  async function updateDebt(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    const amount = Number(formData.get("amount") ?? 0);
    const paidAmount = Number(formData.get("paidAmount") ?? 0);
    const isPaid = paidAmount >= amount;

    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsSaving(false);
      toast.error("Sesi login berakhir.");
      return;
    }

    const { error } = await supabase
      .from("debts")
      .update({
        amount,
        paid_amount: Math.min(amount, Math.max(0, paidAmount)),
        debt_date: String(formData.get("debtDate") ?? ""),
        source_name: String(formData.get("sourceName") ?? ""),
        contact_name: String(formData.get("contactName") ?? ""),
        reason: String(formData.get("reason") ?? ""),
        is_paid: isPaid,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    setIsSaving(false);
    if (error) { toast.error(`Gagal mengubah debts: ${error.message}`); return; }
    toast.success("Catatan berhasil diedit.");
    setEditingDebt(null);
    router.refresh();
  }

  return (
    <>
      <Panel className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">Daftar catatan</p>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          </div>
          <p className="text-xs text-muted">Tandai lunas untuk menutup catatan.</p>
        </div>
        <div className="space-y-3">
          {records.length ? (
            records.map((record) => {
              const isPayable = record.direction === "payable";
              return (
                <div
                  key={record.id}
                  className="grid gap-3 rounded-lg border border-border bg-background-strong p-4"
                >
                  {editingDebt?.id === record.id ? (
                    <form action={updateDebt} className="grid gap-3">
                      <input type="hidden" name="id" value={record.id} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input name="amount" type="number" min="1" step="1" defaultValue={record.amount} />
                        <Input name="paidAmount" type="number" min="0" step="1" defaultValue={record.paid_amount} />
                        <Input name="debtDate" type="date" defaultValue={record.debt_date} />
                        <Input name="sourceName" placeholder="Asal / platform" defaultValue={record.source_name} />
                        <Input name="contactName" placeholder="Nama kontak" defaultValue={record.contact_name} />
                        <Input name="reason" placeholder="Alasan" defaultValue={record.reason} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" type="submit" isLoading={isSaving}>Simpan edit</Button>
                        <Button size="sm" type="button" variant="secondary" onClick={() => setEditingDebt(null)}>Batal</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {/* Direction badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            isPayable
                              ? "bg-danger/10 text-danger"
                              : "bg-accent-soft text-accent"
                          }`}
                        >
                          {isPayable
                            ? <ArrowUpRight className="size-3" />
                            : <ArrowDownLeft className="size-3" />}
                          {isPayable ? "Hutang" : "Piutang"}
                        </span>
                        {record.is_paid && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                            <CheckCircle2 className="size-3" />
                            Lunas
                          </span>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted">Nominal</p>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(record.amount, currencyCode)}
                          </p>
                          {record.paid_amount > 0 && (
                            <p className="text-xs text-muted">
                              Sudah: {formatCurrency(record.paid_amount, currencyCode)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted">
                            {isPayable ? "Kamu hutang ke" : "Yang berhutang ke kamu"}
                          </p>
                          <p className="text-sm font-semibold text-foreground">{record.contact_name}</p>
                          {record.source_name && (
                            <p className="text-xs text-muted">via {record.source_name}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted">Tanggal</p>
                          <p className="text-sm font-semibold text-foreground">{formatDate(record.debt_date)}</p>
                        </div>
                        {!record.is_paid && (
                          <Button
                            variant={isPayable ? "danger" : "primary"}
                            size="sm"
                            onClick={() => openModal(record)}
                          >
                            {isPayable ? "Bayar" : "Terima"}
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditingDebt(record)}>
                          Edit
                        </Button>
                      </div>

                      {record.payments?.length ? (
                        <div className="rounded-md border border-border bg-background px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Riwayat cicilan</p>
                          <div className="mt-2 grid gap-1">
                            {record.payments.map((p) => (
                              <p key={p.id} className="text-xs text-muted">
                                {formatDate(p.paid_date)} — {formatCurrency(p.amount, currencyCode)}
                                {p.note ? ` | ${p.note}` : ""}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <p className="text-sm leading-7 text-muted">{record.reason}</p>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm leading-7 text-muted">
              Belum ada catatan bulan ini.
            </div>
          )}
        </div>
      </Panel>

      {selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="glass-panel w-full max-w-lg rounded-lg p-6">
            {step === "prompt" ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-5 text-danger" />
                  <div>
                    <p className="text-sm font-semibold text-danger">Cek dulu</p>
                    <h3 className="text-2xl font-bold text-foreground">
                      {selectedDebt.direction === "payable" ? "Hutang ini sudah dibayar?" : "Piutang ini sudah diterima?"}
                    </h3>
                  </div>
                </div>
                <p className="text-sm leading-7 text-muted">
                  Sisa {formatCurrency(selectedDebt.remaining_amount, currencyCode)} dari total{" "}
                  {formatCurrency(selectedDebt.amount, currencyCode)} untuk {selectedDebt.contact_name}.
                </p>
                {wallets.length > 0 && (
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                      {selectedDebt.direction === "payable" ? "Bayar dari dompet" : "Terima ke dompet"}
                    </span>
                    <Select value={paymentWalletId} onChange={(e) => setPaymentWalletId(e.target.value)}>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </Select>
                  </label>
                )}
                <div className="grid gap-2 rounded-lg border border-border bg-background-strong p-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    {selectedDebt.direction === "payable" ? "Bayar sebagian" : "Terima sebagian"}
                  </label>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      type="number"
                      min="0"
                      max={selectedDebt.remaining_amount}
                      step="1"
                      placeholder="Contoh: 50000"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    <Button variant="secondary" onClick={() => void savePartialPayment()} isLoading={isSaving}>
                      Simpan
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" onClick={closeModal}>Belum</Button>
                  <Button
                    variant={selectedDebt.direction === "payable" ? "danger" : "primary"}
                    onClick={() => { setStep("confirm"); setCountdown(10); }}
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
                    <p className="text-sm font-semibold text-danger">Konfirmasi akhir</p>
                    <h3 className="text-2xl font-bold text-foreground">Yakin sudah lunas?</h3>
                  </div>
                </div>
                <p className="text-sm leading-7 text-muted">
                  Tombol aktif setelah countdown selesai, supaya tidak kepencet tidak sengaja.
                </p>
                <div className="rounded-lg border border-danger/20 bg-danger/8 px-4 py-4 text-sm text-danger">
                  Countdown: <span className="font-bold">{countdown}</span> detik
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" onClick={closeModal}>Batal</Button>
                  <Button
                    variant={selectedDebt.direction === "payable" ? "danger" : "primary"}
                    onClick={() => void markAsPaid()}
                    disabled={countdown > 0}
                    isLoading={isSaving}
                  >
                    <CheckCircle2 className="size-4" />
                    Tandai lunas
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
