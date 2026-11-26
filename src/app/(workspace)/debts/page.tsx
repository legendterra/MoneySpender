import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HutangView } from "@/components/hutang/hutang-view";
import { getDebtsPageData } from "@/lib/data";
import { parsePage } from "@/lib/paging";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("debts") };
}

/** Hutang (PLAN.md section 4): payable / receivable tabs, 10 per page, payments, settle. */
export default async function HutangPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = params.tab === "receivable" ? "receivable" : "payable";
  const debtParam = typeof params.debt === "string" ? params.debt : "";
  const debtId = /^[A-Za-z0-9-]{1,64}$/.test(debtParam) ? debtParam : null;
  const data = await getDebtsPageData({
    tab,
    page: parsePage(params.page),
    settledPage: parsePage(params.settled),
    debtId,
  });

  return (
    <HutangView
      key={tab}
      tab={tab}
      initialDebtId={debtId}
      settledOpen={params.settled !== undefined}
      data={{
        today: data.today,
        summary: data.summary,
        active: data.active,
        settled: data.settled,
        focus: data.focus,
        wallets: data.wallets.map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          kind: wallet.kind,
          balance: wallet.balance,
        })),
      }}
    />
  );
}
