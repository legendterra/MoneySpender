import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ReportsView } from "@/components/reports/reports-view";
import { getReportsData } from "@/lib/data-reports";
import { parsePage } from "@/lib/paging";
import { parseReportList, type CategoryShare } from "@/lib/reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reports") };
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; month?: string; year?: string; list?: string; page?: string }>;
}) {
  const params = await searchParams;
  const view = { list: parseReportList(params.list), page: parsePage(params.page) };
  const [data, t] = await Promise.all([getReportsData(params, view), getTranslations("laporan")]);
  // Fold labels for the category breakdown come from the server-side aggregation.
  const label = (rows: CategoryShare[]) =>
    rows.map((row) =>
      row.key === "__other__"
        ? { ...row, name: t("otherCategories") }
        : row.key === "label:tanpa kategori"
          ? { ...row, name: t("uncategorized") }
          : row,
    );
  return (
    <ReportsView
      {...data}
      categories={label(data.categories)}
      categoryBar={label(data.categoryBar)}
      list={data.list ? { ...data.list, categories: label(data.list.categories) } : null}
    />
  );
}
