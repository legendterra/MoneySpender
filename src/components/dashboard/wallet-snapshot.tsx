import { Panel } from "@/components/ui/panel";
import type { Wallet } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function WalletSnapshot({
  wallets,
  currencyCode,
}: {
  wallets: Wallet[];
  currencyCode: string;
}) {
  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Dompet</p>
        <h2 className="text-2xl font-bold text-foreground">Saldo per tempat</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {wallets.length ? (
          wallets.map((wallet) => (
            <div key={wallet.id} className="rounded-2xl border border-border bg-background-strong p-4">
              <p className="text-sm font-bold text-foreground">{wallet.name}</p>
              <p className="mt-2 text-xl font-black text-foreground">
                {formatCurrency(wallet.balance ?? wallet.opening_balance, currencyCode)}
              </p>
              <p className="mt-1 text-xs text-muted">{wallet.kind}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted md:col-span-2 xl:col-span-5">
            Belum ada dompet. Tambahkan di Settings supaya saldo per tempat bisa kebaca.
          </div>
        )}
      </div>
    </Panel>
  );
}
