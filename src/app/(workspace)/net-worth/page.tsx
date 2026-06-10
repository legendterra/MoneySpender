import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { getNetWorthData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function NetWorthPage() {
  const data = await getNetWorthData();
  const currency = data.profile.currency_code ?? "IDR";

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Net worth"
        title="Aset dikurangi hutang, kelihatan bersih."
        description="Lihat selisih seluruh pemasukan dan pengeluaran terhadap hutang aktif."
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
    </div>
  );
}
