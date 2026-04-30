import { MonthFilter } from "@/components/month-filter";
import { PageHeading } from "@/components/page-heading";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { getTransactionsPageData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const data = await getTransactionsPageData("expense", params.month);
  const currency = data.profile.currency_code ?? "IDR";

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Pengeluaran"
        title="Biar uang keluar tidak cuma terasa hilang."
        description={`${data.selectedMonthLabel}: total pengeluaran ${formatCurrency(data.total, currency)}.`}
        right={<MonthFilter monthValue={data.monthValue} actionPath="/expenses" />}
      />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <TransactionForm
          title="Tambah uang keluar"
          description="Catat jumlah, kategori, tanggal, dan toko/sumbernya. Nanti gampang dicek lagi kalau ada yang terasa boros."
          categories={data.categories}
          type="expense"
        />
        <TransactionsList
          title="Pengeluaran bulan ini"
          records={data.transactions}
          currencyCode={currency}
        />
      </div>
    </div>
  );
}
