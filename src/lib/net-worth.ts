import type { DebtRecord, Wallet, WalletTransfer } from "@/lib/types";

// Dompet (PLAN.md section 4): net worth = wallets + receivables - payables.
// Archived wallets are not counted (they are no longer in use); card wallets
// are, so a negative credit-card balance lowers the total.

export type NetWorthSummary = {
  /** Sum of balances of non-archived wallets (cards included). */
  walletTotal: number;
  /** Non-archived, non-card wallets: the money the daily allowance is based on. */
  liquid: number;
  /** Still to be received on open receivable debts. */
  receivable: number;
  /** Still to be paid on open payable debts. */
  payable: number;
  /** walletTotal + receivable. */
  assets: number;
  netWorth: number;
  activeWallets: number;
  archivedWallets: number;
};

function remaining(debt: Pick<DebtRecord, "amount" | "paid_amount" | "is_paid">) {
  if (debt.is_paid) return 0;
  return Math.max(0, (Number(debt.amount) || 0) - (Number(debt.paid_amount) || 0));
}

export function computeNetWorth(
  wallets: Pick<Wallet, "kind" | "is_archived" | "balance">[],
  debts: Pick<DebtRecord, "direction" | "amount" | "paid_amount" | "is_paid">[],
): NetWorthSummary {
  let walletTotal = 0;
  let liquid = 0;
  let activeWallets = 0;
  let archivedWallets = 0;
  for (const wallet of wallets) {
    if (wallet.is_archived) {
      archivedWallets += 1;
      continue;
    }
    activeWallets += 1;
    const balance = Number(wallet.balance) || 0;
    walletTotal += balance;
    if (wallet.kind !== "card") liquid += balance;
  }

  let receivable = 0;
  let payable = 0;
  for (const debt of debts) {
    if (debt.direction === "receivable") receivable += remaining(debt);
    else payable += remaining(debt);
  }

  return {
    walletTotal,
    liquid,
    receivable,
    payable,
    assets: walletTotal + receivable,
    netWorth: walletTotal + receivable - payable,
    activeWallets,
    archivedWallets,
  };
}

export type TransferRow = WalletTransfer & { fromName: string | null; toName: string | null };

/** Latest transfers first (date, then id for a stable order), with wallet names. */
export function recentTransfers(
  transfers: WalletTransfer[],
  wallets: Pick<Wallet, "id" | "name">[],
  limit = 6,
): TransferRow[] {
  const names = new Map(wallets.map((wallet) => [wallet.id, wallet.name]));
  return [...transfers]
    .sort((a, b) => b.transfer_date.localeCompare(a.transfer_date) || b.id.localeCompare(a.id))
    .slice(0, limit)
    .map((transfer) => ({
      ...transfer,
      fromName: names.get(transfer.from_wallet_id) ?? null,
      toName: names.get(transfer.to_wallet_id) ?? null,
    }));
}

/** Active wallets first in their creation order, archived ones last. */
export function orderWallets<T extends Pick<Wallet, "is_archived">>(wallets: T[]) {
  return [...wallets.filter((wallet) => !wallet.is_archived), ...wallets.filter((wallet) => wallet.is_archived)];
}
