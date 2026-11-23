import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ScreenPlaceholder } from "@/components/shell/screen-placeholder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("wallets") };
}

// Placeholder until the Dompet screen is built (PLAN.md section 4).
export default async function DompetPage() {
  const t = await getTranslations("placeholder");
  return (
    <ScreenPlaceholder
      icon={Wallet}
      title={t("walletsTitle")}
      body={t("walletsBody")}
      legacyHref="/net-worth"
      legacyLabel={t("openOld")}
    />
  );
}
