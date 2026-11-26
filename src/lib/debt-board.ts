import type { HistoryEntry } from "@/lib/history";
import type { DebtDirection, DebtPayment, DebtRecord } from "@/lib/types";

// Hutang screen (PLAN.md section 4): payable = the user owes someone,
// receivable = someone owes the user. Pure, so totals are unit tested.

export type DebtItem = DebtRecord & {
  payments: DebtPayment[];
  /** Paid share of the amount, 0..1. */
  progress: number;
  settled: boolean;
};

export type DebtSide = {
  direction: DebtDirection;
  active: DebtItem[];
  settled: DebtItem[];
  /** Still owed on active debts. */
  remaining: number;
  /** Original amount of active debts. */
  total: number;
  /** Already paid on active debts. */
  paid: number;
  /** Different people with an active debt. */
  people: number;
};

export type DebtBoard = Record<DebtDirection, DebtSide>;

export function toDebtItem(debt: DebtRecord, payments: DebtPayment[]): DebtItem {
  const amount = Math.max(0, Number(debt.amount) || 0);
  const paid = Math.min(amount, Math.max(0, Number(debt.paid_amount) || 0));
  const remaining = Math.max(0, amount - paid);
  return {
    ...debt,
    paid_amount: paid,
    remaining_amount: remaining,
    payments: [...payments].sort(
      (a, b) => b.paid_date.localeCompare(a.paid_date) || b.id.localeCompare(a.id),
    ),
    progress: amount > 0 ? paid / amount : 0,
    settled: debt.is_paid || remaining <= 0,
  };
}

function emptySide(direction: DebtDirection): DebtSide {
  return { direction, active: [], settled: [], remaining: 0, total: 0, paid: 0, people: 0 };
}

export function buildDebtBoard(debts: DebtRecord[], payments: DebtPayment[]): DebtBoard {
  const byDebt = new Map<string, DebtPayment[]>();
  for (const payment of payments) {
    const list = byDebt.get(payment.debt_id) ?? [];
    list.push(payment);
    byDebt.set(payment.debt_id, list);
  }

  const board: DebtBoard = { payable: emptySide("payable"), receivable: emptySide("receivable") };
  const people: Record<DebtDirection, Set<string>> = { payable: new Set(), receivable: new Set() };

  for (const debt of debts) {
    const item = toDebtItem(debt, byDebt.get(debt.id) ?? []);
    const side = board[item.direction === "receivable" ? "receivable" : "payable"];
    if (item.settled) {
      side.settled.push(item);
      continue;
    }
    side.active.push(item);
    side.remaining += item.remaining_amount;
    side.total += item.amount;
    side.paid += item.paid_amount;
    people[side.direction].add(item.contact_name.trim().toLocaleLowerCase("id"));
  }

  for (const side of [board.payable, board.receivable]) {
    side.people = people[side.direction].size;
    // Newest first; settled ones by when they were paid off.
    side.active.sort((a, b) => b.debt_date.localeCompare(a.debt_date) || b.id.localeCompare(a.id));
    side.settled.sort(
      (a, b) =>
        (b.paid_at ?? b.debt_date).localeCompare(a.paid_at ?? a.debt_date) || b.id.localeCompare(a.id),
    );
  }
  return board;
}

/** Quick amounts offered in the pay sheet: the whole remaining and, when useful, half of it. */
export function paymentSuggestions(remaining: number) {
  const whole = Math.max(0, Math.floor(remaining));
  if (whole <= 0) return [];
  const half = Math.floor(whole / 2 / 1000) * 1000;
  return half >= 1000 && half < whole ? [whole, half] : [whole];
}

// ── Paging and optimistic updates ────────────────────────────────────────────

/** Hutang shows 10 debts per page in each list. */
export const DEBTS_PAGE_SIZE = 10;

export type DebtSideSummary = Omit<DebtSide, "active" | "settled"> & { activeCount: number; settledCount: number };

export function summarizeSide(side: DebtSide): DebtSideSummary {
  const { active, settled, ...rest } = side;
  return { ...rest, activeCount: active.length, settledCount: settled.length };
}

/** A change made in this tab, shown until the refreshed page arrives. */
export type DebtPatch = {
  debtId: string;
  /** Added to paid_amount (negative when a payment is removed). */
  paidDelta: number;
  addPayment?: DebtPayment;
  removePaymentId?: string;
};

export function applyDebtPatches(items: DebtItem[], patches: DebtPatch[]): DebtItem[] {
  if (!patches.length) return items;
  return items.map((item) => {
    const mine = patches.filter((patch) => patch.debtId === item.id);
    if (!mine.length) return item;
    let paid = Number(item.paid_amount) || 0;
    let payments = item.payments;
    for (const patch of mine) {
      paid += patch.paidDelta;
      if (patch.addPayment) payments = [patch.addPayment, ...payments.filter((p) => p.id !== patch.addPayment!.id)];
      if (patch.removePaymentId) payments = payments.filter((p) => p.id !== patch.removePaymentId);
    }
    const settledNow = paid >= item.amount;
    return toDebtItem(
      {
        ...item,
        paid_amount: paid,
        is_paid: settledNow,
        paid_at: settledNow ? (item.paid_at ?? new Date().toISOString()) : null,
      },
      payments,
    );
  });
}

/** A debt saved from the Catat sheet (Riwayat entry) as a list item. */
export function entryToDebtItem(entry: HistoryEntry): DebtItem | null {
  if (entry.kind !== "debt" || !entry.debtDirection) return null;
  return toDebtItem(
    {
      id: entry.id,
      amount: entry.amount,
      paid_amount: entry.debtPaid ?? 0,
      remaining_amount: Math.max(0, entry.amount - (entry.debtPaid ?? 0)),
      debt_date: entry.date,
      contact_name: entry.contact ?? "",
      source_name: "",
      reason: entry.note ?? "",
      direction: entry.debtDirection,
      wallet_id: entry.walletId,
      wallet_label: entry.walletLabel,
      category_label: entry.categoryLabel ?? "",
      is_paid: (entry.debtPaid ?? 0) >= entry.amount,
      paid_at: entry.debtPaidAt,
    },
    [],
  );
}
