import Link from "next/link";
import { Banknote, CreditCard, Landmark, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { AmountText } from "@/components/ui/amount-display";
import { SectionHeader } from "@/components/ui/section-header";

export type WalletChipData = {
  id: string;
  name: string;
  kind: "cash" | "bank" | "ewallet" | "card" | "other";
  balance: number;
};

const icons: Record<WalletChipData["kind"], LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
  card: CreditCard,
  other: Wallet,
};

export function WalletStrip({ wallets }: { wallets: WalletChipData[] }) {
  const t = useTranslations("beranda");
  const total = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  return (
    <section aria-labelledby="wallets-heading" className="grid gap-2">
      <SectionHeader
        id="wallets-heading"
        title={t("wallets")}
        meta={wallets.length ? <AmountText value={total} tone="muted" /> : undefined}
        action={wallets.length ? undefined : { label: t("walletsManage"), href: "/wallets" }}
      />
      {wallets.length ? (
        <ul className="scrollbar-none -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] md:overflow-visible md:px-0 md:pb-0">
          {wallets.map((wallet) => {
            const Icon = icons[wallet.kind];
            return (
              <li key={wallet.id} className="snap-start">
                <Link
                  href="/wallets"
                  className="flex min-w-[8.5rem] flex-col gap-1.5 rounded-control md:min-w-0 border border-line bg-surface px-3.5 py-3 outline-none transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{wallet.name}</span>
                  </span>
                  <AmountText
                    value={wallet.balance}
                    tone={wallet.balance < 0 ? "expense" : "neutral"}
                    className="text-[15px] font-bold"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">{t("walletsEmpty")}</p>
      )}
    </section>
  );
}
