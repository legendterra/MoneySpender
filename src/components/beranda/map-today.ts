import type { TodayItem } from "@/components/beranda/today-list";

/** Minimal shape of a recorded item for today (see getTodayActivity in src/lib/shell-data.ts). */
export type TodaySource = {
  id: string;
  kind: "expense" | "income" | "transfer" | "debt";
  amount: number;
  title: string;
  categoryLabel: string | null;
  walletLabel: string | null;
  fromWallet?: string | null;
  toWallet?: string | null;
  debtDirection?: "payable" | "receivable";
  contactName?: string | null;
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Turns raw records into display rows. `t` is the "beranda" translator. */
export function toTodayItems(sources: TodaySource[], t: Translate): TodayItem[] {
  return sources.map((source) => {
    if (source.kind === "transfer") {
      const from = source.fromWallet ?? "-";
      const to = source.toWallet ?? "-";
      return {
        id: source.id,
        kind: "transfer",
        flow: "move",
        title: t("transferTitle", { from, to }),
        subtitle: source.title,
        amount: source.amount,
      };
    }
    if (source.kind === "debt") {
      const name = source.contactName?.trim() || "-";
      const payable = source.debtDirection !== "receivable";
      return {
        id: source.id,
        kind: "debt",
        flow: payable ? "in" : "out",
        title: payable ? t("debtPayableTitle", { name }) : t("debtReceivableTitle", { name }),
        subtitle: [source.categoryLabel, source.walletLabel].filter(Boolean).join(" · "),
        amount: source.amount,
      };
    }
    const category = source.categoryLabel?.trim() || t("noCategory");
    const title = source.title.trim() || category;
    const subtitle = (title === category ? [source.walletLabel] : [category, source.walletLabel])
      .filter(Boolean)
      .join(" · ");
    return {
      id: source.id,
      kind: source.kind,
      flow: source.kind === "income" ? "in" : "out",
      title,
      subtitle,
      amount: source.amount,
    };
  });
}
