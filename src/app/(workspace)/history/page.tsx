import type { Metadata } from "next";
import { ReceiptText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ScreenPlaceholder } from "@/components/shell/screen-placeholder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("history") };
}

// Placeholder until the Riwayat screen is built (PLAN.md section 4).
export default async function RiwayatPage() {
  const t = await getTranslations("placeholder");
  return (
    <ScreenPlaceholder
      icon={ReceiptText}
      title={t("historyTitle")}
      body={t("historyBody")}
      legacyHref="/all-transactions"
      legacyLabel={t("openOld")}
    />
  );
}
