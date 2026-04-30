"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DebtRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type ModalStep = "prompt" | "confirm";

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
  }

  function closeModal() {
    setSelectedDebt(null);
    setStep("prompt");
    setCountdown(10);
  }

  async function markAsPaid() {
    if (!selectedDebt) {
      return;
    }

    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("debts")
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
      })
      .eq("id", selectedDebt.id);

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Hutang ditandai sudah dibayar.");
    closeModal();
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
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted">Nominal</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(record.amount, currencyCode)}
                    </p>
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
                        Cek bayar
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-7 text-muted">{record.reason}</p>
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
                  Nominal {formatCurrency(selectedDebt.amount, currencyCode)} untuk {selectedDebt.lender_name}.
                </p>
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
