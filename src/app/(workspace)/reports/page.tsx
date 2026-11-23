import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ScreenPlaceholder } from "@/components/shell/screen-placeholder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reports") };
}

// Placeholder until the Laporan screen is built (PLAN.md section 4).
export default async function LaporanPage() {
  const t = await getTranslations("placeholder");
  return (
    <ScreenPlaceholder
      icon={ChartColumn}
      title={t("reportsTitle")}
      body={t("reportsBody")}
    />
  );
}
