import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ReportsView } from "@/components/reports/reports-view";
import { getReportsData } from "@/lib/data-reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reports") };
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const [data, t] = await Promise.all([getReportsData(params), getTranslations("laporan")]);
  // Fold labels for the category breakdown come from the server-side aggregation.
  const categories = data.categories.map((row) =>
    row.key === "__other__"
      ? { ...row, name: t("otherCategories") }
      : row.key === "label:tanpa kategori"
        ? { ...row, name: t("uncategorized") }
        : row,
  );
  return <ReportsView {...data} categories={categories} />;
}
