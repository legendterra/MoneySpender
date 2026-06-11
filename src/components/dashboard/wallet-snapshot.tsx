import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import type { Wallet } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Building2, Coins, CreditCard, Package, Smartphone } from "lucide-react";

const kindIcon: Record<Wallet["kind"], React.ElementType> = {
  cash: Coins,
  bank: Building2,
  ewallet: Smartphone,
  card: CreditCard,
  other: Package,
};

const kindColor: Record<Wallet["kind"], string> = {
  cash: "#22c55e",
  bank: "#3b82f6",
  ewallet: "#a855f7",
  card: "#f59e0b",
  other: "#6b7280",
};

export function WalletSnapshot({
  wallets,
  currencyCode,
}: {
  wallets: Wallet[];
  currencyCode: string;
}) {
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <Panel className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">Dompet</p>
          <h2 className="text-2xl font-bold text-foreground">Saldo per tempat</h2>
        </div>
        <Link
          href="/net-worth"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Net Worth →
        </Link>
      </div>

      {wallets.length > 0 && (
        <div className="rounded-lg border border-border bg-background-strong px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Total likuid</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatCurrency(totalBalance, currencyCode)}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {wallets.length ? (
          wallets.map((wallet) => {
            const Icon = kindIcon[wallet.kind];
            const color = kindColor[wallet.kind];
            const isNegative = wallet.balance < 0;
            return (
              <div
                key={wallet.id}
                className="flex items-center gap-3 rounded-md border border-border bg-background p-4"
              >
                <div
                  className="grid size-9 flex-shrink-0 place-items-center rounded-md"
                  style={{ background: `${color}18` }}
                >
                  <Icon className="size-4" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{wallet.name}</p>
                  <p className={`text-base font-black ${isNegative ? "text-danger" : "text-foreground"}`}>
                    {formatCurrency(wallet.balance, currencyCode)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm leading-7 text-muted sm:col-span-2">
            Belum ada dompet.{" "}
            <Link href="/settings" className="font-semibold text-accent underline-offset-4 hover:underline">
              Tambahkan di Settings
            </Link>{" "}
            supaya saldo per tempat bisa kebaca.
          </div>
        )}
      </div>
    </Panel>
  );
}
