import { TransferPanel } from "@/components/net-worth/transfer-panel";
import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { getNetWorthData } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function NetWorthPage() {
  const data = await getNetWorthData();
  const currency = data.profile.currency_code ?? "IDR";

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Net worth"
        title="Aset dikurangi hutang, kelihatan bersih."
        description="Pantau saldo semua dompet, hutang aktif, dan transfer antar dompet tanpa bikin laporan keuangan jadi rancu."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <p className="text-sm font-semibold text-muted">Total aset</p>
          <p className="mt-2 text-3xl font-black text-foreground">{formatCurrency(data.totalAssets, currency)}</p>
        </Panel>
        <Panel>
          <p className="text-sm font-semibold text-muted">Total hutang</p>
          <p className="mt-2 text-3xl font-black text-danger">{formatCurrency(data.totalDebt, currency)}</p>
        </Panel>
        <Panel>
          <p className="text-sm font-semibold text-muted">Net worth</p>
          <p className="mt-2 text-3xl font-black text-foreground">{formatCurrency(data.netWorth, currency)}</p>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">Dompet aktif</p>
            <h2 className="text-2xl font-bold text-foreground">Saldo per tempat</h2>
          </div>
          <div className="grid gap-3">
            {data.wallets.map((wallet) => (
              <div key={wallet.id} className="rounded-2xl border border-border bg-background-strong p-4">
                <p className="text-sm font-bold text-foreground">{wallet.name}</p>
                <p className="mt-2 text-2xl font-black text-foreground">{formatCurrency(wallet.balance ?? 0, currency)}</p>
                <p className="mt-1 text-xs text-muted">{wallet.kind}</p>
              </div>
            ))}
          </div>
        </Panel>
        <TransferPanel wallets={data.wallets} />
      </div>

      <Panel className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-muted">Riwayat transfer</p>
          <h2 className="text-2xl font-bold text-foreground">Pindah uang tanpa dianggap transaksi</h2>
        </div>
        <div className="grid gap-3">
          {data.transfers.length ? data.transfers.slice(0, 20).map((transfer) => {
            const from = data.wallets.find((wallet) => wallet.id === transfer.from_wallet_id)?.name ?? "Dompet asal";
            const to = data.wallets.find((wallet) => wallet.id === transfer.to_wallet_id)?.name ?? "Dompet tujuan";
            return (
              <div key={transfer.id} className="rounded-2xl border border-border bg-background-strong p-4">
                <p className="text-sm font-bold text-foreground">{from} ke {to}</p>
                <p className="mt-1 text-sm text-muted">{formatDate(transfer.transfer_date)} | {formatCurrency(transfer.amount, currency)}</p>
                {transfer.note ? <p className="mt-1 text-xs text-muted">{transfer.note}</p> : null}
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">Belum ada transfer dompet.</div>
          )}
        </div>
      </Panel>
    </div>
  );
}
