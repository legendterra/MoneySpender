import { todayWIB } from "@/lib/dates";
import type { DebtDirection, Wallet, WalletKind } from "@/lib/types";

// PLAN.md section 4.2:
// balance = opening_balance + income - expense + transfers_in - transfers_out
//         + payable debts received into the wallet - receivable debts paid out of the wallet
//         - payments of payable debts from the wallet + payments of receivable debts into the wallet
// A payment with wallet_id null counts against the debt's own wallet.

export type WalletRow = {
  id: string;
  name: string;
  kind: WalletKind | string;
  opening_balance: number | string;
  color: string | null;
  is_archived: boolean;
};

export type BalanceTransaction = {
  type: "income" | "expense";
  amount: number;
  wallet_id: string | null;
  transaction_date?: string;
};

export type BalanceTransfer = {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  transfer_date?: string;
};

export type BalanceDebt = {
  id: string;
  direction: DebtDirection;
  amount: number;
  paid_amount?: number;
  wallet_id: string | null;
  debt_date?: string;
  paid_at?: string | null;
};

export type BalanceDebtPayment = {
  debt_id: string;
  amount: number;
  wallet_id: string | null;
  paid_date?: string;
};

export type BalanceInputs = {
  transactions?: BalanceTransaction[];
  transfers?: BalanceTransfer[];
  debts?: BalanceDebt[];
  payments?: BalanceDebtPayment[];
};

export type BalanceOptions = {
  /** Only count entries dated strictly before this `yyyy-MM-dd` (e.g. "start of today"). */
  before?: string;
};

export function computeWalletBalances(
  wallets: WalletRow[],
  inputs: BalanceInputs,
  options: BalanceOptions = {},
): Wallet[] {
  const balances = new Map<string, number>();
  for (const wallet of wallets) balances.set(wallet.id, Number(wallet.opening_balance) || 0);

  const counts = (date: string | undefined) => !options.before || !date || date < options.before;
  const apply = (walletId: string | null | undefined, delta: number) => {
    if (!walletId || !balances.has(walletId) || !delta) return;
    balances.set(walletId, balances.get(walletId)! + delta);
  };

  for (const t of inputs.transactions ?? []) {
    if (!counts(t.transaction_date)) continue;
    const amount = Number(t.amount) || 0;
    apply(t.wallet_id, t.type === "income" ? amount : -amount);
  }

  for (const t of inputs.transfers ?? []) {
    if (!counts(t.transfer_date)) continue;
    const amount = Number(t.amount) || 0;
    apply(t.from_wallet_id, -amount);
    apply(t.to_wallet_id, amount);
  }

  const paymentsByDebt = new Map<string, BalanceDebtPayment[]>();
  for (const payment of inputs.payments ?? []) {
    const list = paymentsByDebt.get(payment.debt_id) ?? [];
    list.push(payment);
    paymentsByDebt.set(payment.debt_id, list);
  }

  for (const debt of inputs.debts ?? []) {
    const amount = Number(debt.amount) || 0;
    // payable: money came in when borrowed and goes out when repaid; receivable: the reverse.
    const sign = debt.direction === "receivable" ? -1 : 1;
    if (counts(debt.debt_date)) apply(debt.wallet_id, sign * amount);

    // Payments are applied in date order and capped at the debt amount, so a
    // legacy over-payment row cannot push the wallet past the original debt.
    const payments = [...(paymentsByDebt.get(debt.id) ?? [])].sort((a, b) =>
      (a.paid_date ?? "").localeCompare(b.paid_date ?? ""),
    );
    let applied = 0;
    for (const payment of payments) {
      const paid = Math.min(Number(payment.amount) || 0, Math.max(0, amount - applied));
      applied += paid;
      if (counts(payment.paid_date)) apply(payment.wallet_id ?? debt.wallet_id, -sign * paid);
    }

    // paid_amount set without payment rows (imports, older edits) still moved
    // money: count the unrecorded part against the debt's own wallet.
    const unrecorded = Math.min(Number(debt.paid_amount) || 0, amount) - applied;
    if (unrecorded > 0) {
      const date = debt.paid_at ? todayWIB(new Date(debt.paid_at)) : debt.debt_date;
      if (counts(date)) apply(debt.wallet_id, -sign * unrecorded);
    }
  }

  return wallets.map((wallet) => ({
    id: wallet.id,
    name: wallet.name,
    kind: wallet.kind as WalletKind,
    opening_balance: Number(wallet.opening_balance) || 0,
    color: wallet.color,
    is_archived: wallet.is_archived,
    balance: balances.get(wallet.id) ?? (Number(wallet.opening_balance) || 0),
  }));
}
