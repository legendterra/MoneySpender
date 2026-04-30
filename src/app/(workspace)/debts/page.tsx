import { DebtForm } from "@/components/debts/debt-form";
import { DebtsList } from "@/components/debts/debts-list";
import { MonthFilter } from "@/components/month-filter";
import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { getDebtsPageData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const data = await getDebtsPageData(params.month);
  const currency = data.profile.currency_code ?? "IDR";

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Hutang"
        title="Tahu siapa, kapan, dan berapa yang masih harus dibayar."
        description={`Total belum lunas: ${formatCurrency(data.summary.totalOutstanding, currency)}. Untuk ${data.selectedMonthLabel}: ${formatCurrency(data.summary.currentMonthOutstanding, currency)}.`}
        right={<MonthFilter monthValue={data.monthValue} actionPath="/debts" />}
      />

      <Panel className="grid gap-4 lg:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <div className="rounded-[24px] border border-danger/20 bg-danger/8 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-danger">Total Hutang</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(data.summary.totalOutstanding, currency)}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Gabungan semua hutang yang belum ditandai lunas.
          </p>
        </div>
        <div className="rounded-[24px] border border-danger/20 bg-danger/8 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-danger">Sisa Hutang bulan ini</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(data.summary.currentMonthOutstanding, currency)}
          </p>
          <p className="mt-3 text-sm leading-7 text-danger">
            Kalau bisa, selesaikan yang jatuhnya paling dekat dulu. Future you bakal berterima kasih.
          </p>
        </div>
        <div className="rounded-[24px] border border-border bg-background-strong p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Status catatan aktif</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{data.summary.unpaidCount} hutang</p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Hutang hanya bisa ditandai lunas lewat konfirmasi ganda, supaya tidak kepencet tanpa sengaja.
          </p>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <DebtForm
          title="Tambah hutang"
          description="Catat nominal, tanggal, dari mana, ke siapa, dan alasannya. Singkat saja, yang penting jelas."
          categories={data.categories}
        />
        <DebtsList title="Hutang bulan ini" records={data.debts} currencyCode={currency} />
      </div>
    </div>
  );
}
