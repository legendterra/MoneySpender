"use client";

import { useState } from "react";

import { formatCurrency } from "@/lib/utils";

type DashboardSnapshot = {
  savedAt: string;
  payload: {
    currency: string;
    month: string;
    income: number;
    expense: number;
    balance: number;
    debt: number;
  };
};

export function OfflineSnapshotViewer() {
  const [snapshot] = useState<DashboardSnapshot | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem("moneyspender.offline.snapshot.dashboard");
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as DashboardSnapshot;
    } catch {
      return null;
    }
  });

  if (!snapshot) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-sm leading-7 text-muted">
        Belum ada snapshot offline. Buka dashboard saat online minimal sekali, nanti ringkasannya muncul di sini.
      </div>
    );
  }

  const historyRaw = typeof window !== "undefined" ? window.localStorage.getItem("moneyspender.offline.snapshot.history") : null;
  const settingsRaw = typeof window !== "undefined" ? window.localStorage.getItem("moneyspender.offline.snapshot.settings") : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-background-strong p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">{snapshot.payload.month}</p>
        <p className="mt-2 text-2xl font-black text-foreground">
          {formatCurrency(snapshot.payload.balance, snapshot.payload.currency)}
        </p>
        <p className="mt-1 text-sm text-muted">Sisa saldo terakhir</p>
      </div>
      <div className="rounded-lg border border-border bg-background-strong p-5">
        <p className="text-sm text-muted">Pemasukan: {formatCurrency(snapshot.payload.income, snapshot.payload.currency)}</p>
        <p className="mt-2 text-sm text-muted">Pengeluaran: {formatCurrency(snapshot.payload.expense, snapshot.payload.currency)}</p>
        <p className="mt-2 text-sm text-muted">Hutang: {formatCurrency(snapshot.payload.debt, snapshot.payload.currency)}</p>
      </div>
      <div className="rounded-lg border border-border bg-background-strong p-5 sm:col-span-2">
        <p className="text-sm font-bold text-foreground">Data lokal terakhir</p>
        <p className="mt-2 text-sm text-muted">
          Riwayat: {historyRaw ? "tersimpan" : "belum ada"} | Settings: {settingsRaw ? "tersimpan" : "belum ada"}
        </p>
        <p className="mt-2 text-xs leading-6 text-muted">
          Untuk lihat data lengkap saat offline, buka Dashboard, Riwayat, dan Settings minimal sekali saat online.
        </p>
      </div>
    </div>
  );
}
