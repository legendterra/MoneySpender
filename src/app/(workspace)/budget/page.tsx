import type { Metadata } from "next";
import { PiggyBank } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ScreenPlaceholder } from "@/components/shell/screen-placeholder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("budget") };
}

// Placeholder until the Budget screen is built (PLAN.md section 4).
export default async function BudgetPage() {
  const t = await getTranslations("placeholder");
  return (
    <ScreenPlaceholder
      icon={PiggyBank}
      title={t("budgetTitle")}
      body={t("budgetBody")}
      legacyHref="/settings"
      legacyLabel={t("openOld")}
    />
  );
}
