import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BudgetView } from "@/components/budget/budget-view";
import { getBudgetPageData } from "@/lib/data-budget";
import { parsePage } from "@/lib/paging";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("budget") };
}

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string; page?: string }> }) {
  const { month, page } = await searchParams;
  const data = await getBudgetPageData(month, parsePage(page));
  return <BudgetView {...data} monthParam={month} />;
}
