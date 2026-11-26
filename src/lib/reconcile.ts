import type { Wallet } from "@/lib/types";

export type ReconcileResult = {
  delta: number;
  payload: {
    type: "income" | "expense";
    amount: number;
    category_id: null;
    category_label: string;
    wallet_id: string;
    wallet_label: string;
    transaction_date: string;
    reason: string;
    merchant: null;
  };
};

/**
 * Computes the adjustment transaction needed to bring a wallet's tracked balance
 * to its real-world balance without altering opening_balance history.
 * Returns null when the balance already matches.
 */
export function buildReconcileTransaction({
  wallet,
  actualBalance,
  dateKey,
  categoryLabel = "Penyesuaian Saldo",
  reason = "Penyesuaian saldo dompet",
}: {
  wallet: Pick<Wallet, "id" | "name" | "balance">;
  actualBalance: number;
  dateKey: string;
  categoryLabel?: string;
  reason?: string;
}): ReconcileResult | null {
  const current = Math.round(Number(wallet.balance) || 0);
  const target = Math.round(Number(actualBalance) || 0);
  const delta = target - current;
  if (delta === 0) return null;

  return {
    delta,
    payload: {
      type: delta > 0 ? "income" : "expense",
      amount: Math.abs(delta),
      category_id: null,
      category_label: categoryLabel,
      wallet_id: wallet.id,
      wallet_label: wallet.name,
      transaction_date: dateKey,
      reason: reason.trim() || "Penyesuaian saldo dompet",
      merchant: null,
    },
  };
}
