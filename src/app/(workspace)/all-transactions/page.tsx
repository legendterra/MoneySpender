import Link from "next/link";

import { AllTransactionsPanel } from "@/components/history/all-transactions-panel";
import { PageHeading } from "@/components/page-heading";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button-styles";
import { WEEKDAY_OPTIONS } from "@/lib/constants";
import { getAllTransactionsData } from "@/lib/data";
import { cn } from "@/lib/utils";

export default async function AllTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    weekday?: string;
    year?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const data = await getAllTransactionsData(params);
  const currency = data.profile.currency_code ?? "IDR";
  const pageOptions = Array.from({ length: data.totalPages }, (_, index) => index + 1);

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Semua transaksi"
        title="Riwayat seumur hidup dengan urutan terbaru ke terlama."
        description={`Menampilkan ${data.pageSize} data per halaman. Saat ini ada ${data.totalItems} transaksi yang cocok dengan filter aktif dan semuanya bersifat read only.`}
      />

      <Panel className="space-y-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">Filter lifetime history</p>
            <h2 className="text-2xl font-bold text-foreground">Filter berdasarkan tanggal, hari, dan tahun</h2>
          </div>
          <div className="rounded-2xl border border-border bg-background-strong px-4 py-3 text-sm text-muted">
            Halaman {data.filters.page} dari {data.totalPages}
          </div>
        </div>

        <form action="/all-transactions" className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr_0.7fr_auto_auto]">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Tanggal</span>
            <Input type="date" name="date" defaultValue={data.filters.date} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Hari</span>
            <Select name="weekday" defaultValue={data.filters.weekday}>
              {WEEKDAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Tahun</span>
            <Input
              type="number"
              name="year"
              min="2000"
              max="2100"
              placeholder="2026"
              defaultValue={data.filters.year}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Page</span>
            <Select name="page" defaultValue={String(data.filters.page)}>
              {pageOptions.map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "primary", size: "md", fullWidth: true }))}
            >
              Terapkan
            </button>
          </div>
          <div className="flex items-end">
            <Link
              href="/all-transactions"
              className={cn(buttonVariants({ variant: "secondary", size: "md", fullWidth: true }))}
            >
              Reset
            </Link>
          </div>
        </form>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-border bg-background-strong px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Urutan list</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Hari ini ke bawah lalu tanggal sebelumnya</p>
          </div>
          <div className="rounded-[22px] border border-border bg-background-strong px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Hari aktif</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data.filters.weekdayLabel}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-background-strong px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Mode data</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Read only, tidak bisa dihapus</p>
          </div>
        </div>
      </Panel>

      <AllTransactionsPanel
        items={data.items}
        currencyCode={currency}
        startIndex={(data.filters.page - 1) * data.pageSize}
      />
    </div>
  );
}
