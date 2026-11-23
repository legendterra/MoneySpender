import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RiwayatView } from "@/components/riwayat/riwayat-view";
import { getHistoryPageData } from "@/lib/data-history";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("history") };
}

/** Riwayat (PLAN.md section 4): every record of the period, grouped by WIB day. */
export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getHistoryPageData(await searchParams);
  return <RiwayatView data={data} />;
}
