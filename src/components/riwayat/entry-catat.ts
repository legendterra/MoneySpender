import type { CatatMode, CatatOpenOptions } from "@/components/quick-add/types";
import type { HistoryEntry } from "@/lib/history";

/** Catat mode and options to edit (or duplicate) a Riwayat entry; null for debt payments. */
export function entryToCatat(
  entry: HistoryEntry,
  { duplicate = false, today }: { duplicate?: boolean; today: string },
): { mode: CatatMode; options: CatatOpenOptions } | null {
  if (entry.kind === "debt_payment") return null;

  const base = {
    amount: Math.round(entry.amount),
    note: entry.note ?? "",
    dateKey: duplicate ? today : entry.date,
    walletId: entry.walletId ?? undefined,
    walletLabel: entry.walletLabel ?? undefined,
  };

  if (entry.kind === "transfer") {
    return {
      mode: "transfer",
      options: {
        preset: { ...base, toWalletId: entry.toWalletId ?? undefined, toWalletLabel: entry.toWalletLabel ?? undefined },
        editing: duplicate ? undefined : { table: "wallet_transfers", id: entry.id },
      },
    };
  }

  if (entry.kind === "debt") {
    return {
      mode: "debt",
      options: {
        preset: {
          ...base,
          contact: entry.contact ?? "",
          debtDirection: entry.debtDirection ?? "payable",
        },
        editing: duplicate
          ? undefined
          : { table: "debts", id: entry.id, debtPaid: entry.debtPaid ?? 0, debtPaidAt: entry.debtPaidAt },
      },
    };
  }

  return {
    mode: entry.kind,
    options: {
      preset: {
        ...base,
        merchant: entry.merchant ?? "",
        categoryId: entry.categoryId ?? undefined,
        categoryLabel: entry.categoryLabel ?? undefined,
      },
      editing: duplicate ? undefined : { table: "transactions", id: entry.id },
    },
  };
}
