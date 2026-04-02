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
        title="Catat dan pantau hutang tanpa kehilangan jejak pembayaran."
        description={`Total hutang aktif: ${formatCurrency(data.summary.totalOutstanding, currency)}. Sisa hutang ${data.selectedMonthLabel}: ${formatCurrency(data.summary.currentMonthOutstanding, currency)}.`}
        right={<MonthFilter monthValue={data.monthValue} actionPath="/debts" />}
      />

      <Panel className="grid gap-4 lg:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <div className="rounded-[24px] border border-danger/20 bg-danger/8 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-danger">Total Hutang</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(data.summary.totalOutstanding, currency)}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Nilai ini menghitung semua hutang yang belum lunas dari seluruh bulan.
          </p>
        </div>
        <div className="rounded-[24px] border border-danger/20 bg-danger/8 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-danger">Sisa Hutang bulan ini</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(data.summary.currentMonthOutstanding, currency)}
          </p>
          <p className="mt-3 text-sm leading-7 text-danger">
            Dahulukan pelunasan agar arus kas bulan berikutnya tetap aman. Ambil hutang baru hanya saat benar-benar mendesak dan sudah ada rencana bayar yang jelas.
          </p>
        </div>
        <div className="rounded-[24px] border border-border bg-background-strong p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Status catatan aktif</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{data.summary.unpaidCount} hutang</p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Setiap catatan hutang hanya bisa ditandai lunas melalui konfirmasi ganda. Data tidak saya beri tombol hapus supaya histori tetap aman.
          </p>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <DebtForm
          title="Tambah hutang"
          description="Isi nominal, tanggal, asal transaksi, hutang ke siapa, dan alasannya. Semua field utama wajib diisi agar evaluasi hutang tetap jelas."
          categories={data.categories}
        />
        <DebtsList title="Daftar hutang bulan ini" records={data.debts} currencyCode={currency} />
      </div>
    </div>
  );
}
