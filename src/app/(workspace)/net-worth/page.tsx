import Link from "next/link";

import { TransferPanel } from "@/components/net-worth/transfer-panel";
import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/button-styles";
import { getNetWorthData } from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";
import { Building2, Coins, CreditCard, Package, Smartphone, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Wallet as WalletType } from "@/lib/types";

const kindIcon: Record<WalletType["kind"], React.ElementType> = {
  cash: Coins,
  bank: Building2,
  ewallet: Smartphone,
  card: CreditCard,
  other: Package,
};

const kindLabel: Record<WalletType["kind"], string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  card: "Kartu Kredit",
  other: "Lainnya",
};

export default async function NetWorthPage() {
  const data = await getNetWorthData();
  const currency = data.profile.currency_code ?? "IDR";
  const isPositive = data.netWorth >= 0;

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Net worth"
        title="Posisi keuangan kamu yang sebenarnya."
        description="Total aset nyata (saldo dompet + piutang) dikurangi kewajiban (hutang). Ini angka yang paling jujur soal kondisi finansialmu."
      />

      {/* Net Worth summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-accent" />
            <p className="text-sm font-semibold text-muted">Total Aset</p>
          </div>
          <p className="text-3xl font-black text-foreground">{formatCurrency(data.totalAssets, currency)}</p>
          <div className="space-y-1 text-xs text-muted">
            <p>Saldo dompet: {formatCurrency(data.totalWalletBalance, currency)}</p>
            {data.debtSummary.totalReceivable > 0 && (
              <p className="text-accent">+ Piutang: {formatCurrency(data.debtSummary.totalReceivable, currency)}</p>
            )}
          </div>
        </Panel>

        <Panel className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="size-4 text-danger" />
            <p className="text-sm font-semibold text-muted">Total Liabilitas</p>
          </div>
          <p className="text-3xl font-black text-danger">{formatCurrency(data.totalDebt, currency)}</p>
          <p className="text-xs text-muted">
            Hutang yang belum lunas ({data.debtSummary.unpaidCount} item)
          </p>
        </Panel>

        <Panel className={`space-y-3 ${isPositive ? "border-accent/30 bg-accent-soft/30" : "border-danger/20 bg-danger/5"}`}>
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-foreground" />
            <p className="text-sm font-semibold text-muted">Net Worth</p>
          </div>
          <p className={`text-3xl font-black ${isPositive ? "text-accent" : "text-danger"}`}>
            {formatCurrency(data.netWorth, currency)}
          </p>
          <p className="text-xs text-muted">
            {isPositive ? "Aset melebihi kewajiban ✓" : "Kewajiban melebihi aset — perlu perhatian"}
          </p>
        </Panel>
      </div>

      {/* Wallet breakdown */}
      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted">Aset likuid</p>
            <h2 className="text-2xl font-bold text-foreground">Saldo per dompet</h2>
          </div>
          <Link
            href="/settings#wallets"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Kelola dompet
          </Link>
        </div>

        {data.wallets.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.wallets.map((wallet) => {
              const Icon = kindIcon[wallet.kind];
              const isNegative = wallet.balance < 0;
              return (
                <div
                  key={wallet.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background-strong p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-md bg-background">
                      <Icon className="size-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{wallet.name}</p>
                      <p className="text-xs text-muted">{kindLabel[wallet.kind]}</p>
                    </div>
                  </div>
                  <p className={`text-xl font-black ${isNegative ? "text-danger" : "text-foreground"}`}>
                    {formatCurrency(wallet.balance, currency)}
                  </p>
                  {wallet.opening_balance > 0 && (
                    <p className="text-xs text-muted">
                      Saldo awal: {formatCurrency(wallet.opening_balance, currency)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            Belum ada dompet.{" "}
            <Link href="/settings#wallets" className="font-semibold text-accent underline-offset-4 hover:underline">
              Tambahkan di Settings
            </Link>{" "}
            supaya Net Worth bisa dihitung dengan benar.
          </div>
        )}
      </Panel>

      {/* Debt/Receivable breakdown */}
      {(data.debtSummary.totalPayable > 0 || data.debtSummary.totalReceivable > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.debtSummary.totalPayable > 0 && (
            <Panel className="space-y-3">
              <p className="text-sm font-semibold text-danger">Kewajiban (Hutang)</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(data.debtSummary.totalPayable, currency)}
              </p>
              <p className="text-xs leading-6 text-muted">
                Jumlah yang harus kamu bayarkan. Mengurangi Net Worth.
              </p>
              <Link href="/debts" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Lihat hutang
              </Link>
            </Panel>
          )}
          {data.debtSummary.totalReceivable > 0 && (
            <Panel className="space-y-3">
              <p className="text-sm font-semibold text-accent">Aset (Piutang)</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(data.debtSummary.totalReceivable, currency)}
              </p>
              <p className="text-xs leading-6 text-muted">
                Uang yang orang lain hutang ke kamu. Menambah Net Worth.
              </p>
              <Link href="/debts" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Lihat piutang
              </Link>
            </Panel>
          )}
        </div>
      )}

      {/* Transfer panel */}
      {data.wallets.length >= 2 && (
        <TransferPanel wallets={data.wallets} />
      )}
    </div>
  );
}
