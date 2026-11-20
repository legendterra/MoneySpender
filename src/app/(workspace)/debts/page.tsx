import { DebtForm } from "@/components/debts/debt-form";
import { DebtsList } from "@/components/debts/debts-list";
import { MonthFilter } from "@/components/month-filter";
import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { getDebtsPageData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const data = await getDebtsPageData(params.month);
  const currency = data.profile.currency_code ?? "IDR";
  const { summary } = data;

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Hutang &amp; Piutang"
        title="Tahu siapa yang berhutang ke siapa, dan berapa."
        description="Catat hutang (kamu yang bayar) dan piutang (orang lain yang bayar kamu). Keduanya mempengaruhi Net Worth."
        right={<MonthFilter monthValue={data.monthValue} actionPath="/debts" />}
      />

      {/* Summary cards */}
      <Panel className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-danger/20 bg-danger/8 p-5">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="size-4 text-danger" />
            <p className="text-xs uppercase tracking-[0.22em] text-danger">Total Hutang</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(summary.totalPayable, currency)}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Jumlah yang harus kamu bayar. Mengurangi Net Worth.
          </p>
        </div>

        <div className="rounded-lg border border-accent/20 bg-accent-soft p-5">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="size-4 text-accent" />
            <p className="text-xs uppercase tracking-[0.22em] text-accent">Total Piutang</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(summary.totalReceivable, currency)}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Uang orang lain yang akan kamu terima. Menambah Net Worth.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background-strong p-5">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-muted" />
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Net Kewajiban</p>
          </div>
          <p className={`mt-2 text-3xl font-bold ${summary.netLiability > 0 ? "text-danger" : "text-accent"}`}>
            {formatCurrency(Math.abs(summary.netLiability), currency)}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            {summary.netLiability > 0
              ? `Masih lebih banyak hutang (−${formatCurrency(summary.netLiability, currency)} bersih).`
              : summary.netLiability < 0
                ? `Piutang melebihi hutang. Kamu net positif ${formatCurrency(Math.abs(summary.netLiability), currency)}.`
                : "Hutang dan piutang seimbang."}
          </p>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <DebtForm
          title="Catat hutang / piutang"
          description="Pilih jenis, dompet yang terpengaruh, nama kontak, asal platform, dan alasannya."
          wallets={data.wallets}
        />
        <DebtsList
          title={`Catatan ${data.selectedMonthLabel}`}
          records={data.debts}
          currencyCode={currency}
          wallets={data.wallets}
        />
      </div>
    </div>
  );
}
