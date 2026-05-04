import { MonthFilter } from "@/components/month-filter";
import { PageHeading } from "@/components/page-heading";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { getTransactionsPageData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const data = await getTransactionsPageData("income", params.month);
  const currency = data.profile.currency_code ?? "IDR";

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Pemasukan"
        title="Uang masuk, masuk catatan juga."
        description={`${data.selectedMonthLabel}: total pemasukan ${formatCurrency(data.total, currency)}.`}
        right={<MonthFilter monthValue={data.monthValue} actionPath="/income" />}
      />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <TransactionForm
          title="Tambah uang masuk"
          description="Isi jumlah, kategori, tanggal, dan catatan pendek. Cukup yang penting, tidak perlu panjang."
          categories={data.categories}
          wallets={data.wallets}
          type="income"
        />
        <TransactionsList
          title="Pemasukan bulan ini"
          records={data.transactions}
          currencyCode={currency}
          categories={data.categories}
          wallets={data.wallets}
        />
      </div>
    </div>
  );
}
