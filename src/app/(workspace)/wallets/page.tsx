import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DompetView } from "@/components/dompet/dompet-view";
import { getWalletsPageData } from "@/lib/data-wallets";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("wallets") };
}

/** Dompet (PLAN.md section 4): balances, add/edit/archive, transfers, net worth. */
export default async function DompetPage() {
  const data = await getWalletsPageData();
  return <DompetView data={data} />;
}
