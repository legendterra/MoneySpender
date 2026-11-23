import type { CatatCategory, CatatMode, CatatWallet } from "@/components/quick-add/types";

export type DebtDirectionChoice = "payable" | "receivable";

export type CatatDraft = {
  mode: CatatMode;
  amount: number;
  categoryId: string | null;
  /** Free label used when the category is not (yet) a row in `categories`. */
  categoryLabel: string | null;
  walletId: string | null;
  toWalletId: string | null;
  dateKey: string;
  note: string;
  debtDirection: DebtDirectionChoice;
  contact: string;
};

export type CatatIssue = "amount" | "wallets" | "contact" | "belowPaid";

export type CatatPayload =
  | { table: "transactions"; payload: Record<string, unknown> }
  | { table: "wallet_transfers"; payload: Record<string, unknown> }
  | { table: "debts"; payload: Record<string, unknown> };

export function validateDraft(
  draft: CatatDraft,
  walletCount: number,
  { minAmount = 0 }: { minAmount?: number } = {},
): CatatIssue | null {
  if (!Number.isInteger(draft.amount) || draft.amount <= 0) return "amount";
  if (draft.mode === "transfer") {
    if (walletCount < 2 || !draft.walletId || !draft.toWalletId || draft.walletId === draft.toWalletId) {
      return "wallets";
    }
  }
  if (draft.mode === "debt" && !draft.contact.trim()) return "contact";
  // An edited debt can never owe less than what was already paid back.
  if (draft.mode === "debt" && draft.amount < minAmount) return "belowPaid";
  return null;
}

/**
 * Row to insert for a draft (without user_id; the caller or the offline queue adds it).
 * Columns match the live schema: no payment_method, no lender_name.
 */
export function buildCatatPayload(
  draft: CatatDraft,
  categories: CatatCategory[],
  wallets: CatatWallet[],
): CatatPayload {
  const wallet = wallets.find((item) => item.id === draft.walletId) ?? null;
  const note = draft.note.trim();

  if (draft.mode === "transfer") {
    return {
      table: "wallet_transfers",
      payload: {
        from_wallet_id: draft.walletId,
        to_wallet_id: draft.toWalletId,
        amount: draft.amount,
        transfer_date: draft.dateKey,
        note: note || null,
      },
    };
  }

  if (draft.mode === "debt") {
    return {
      table: "debts",
      payload: {
        direction: draft.debtDirection,
        amount: draft.amount,
        debt_date: draft.dateKey,
        wallet_id: wallet?.id ?? null,
        wallet_label: wallet?.name ?? null,
        contact_name: draft.contact.trim(),
        source_name: wallet?.name ?? "",
        reason: note,
        category_label: draft.debtDirection === "payable" ? "Hutang" : "Piutang",
      },
    };
  }

  const category = categories.find((item) => item.id === draft.categoryId) ?? null;
  return {
    table: "transactions",
    payload: {
      type: draft.mode,
      amount: draft.amount,
      category_id: category?.id ?? null,
      category_label: category?.name ?? (draft.categoryLabel?.trim() || null),
      wallet_id: wallet?.id ?? null,
      wallet_label: wallet?.name ?? null,
      transaction_date: draft.dateKey,
      reason: note || null,
      merchant: null,
    },
  };
}

/**
 * Update payload for an edited row. Columns the sheet does not show (merchant,
 * debt source_name, paid_amount) are left out so they keep their stored value;
 * a debt's paid state follows the new amount.
 */
export function buildCatatUpdate(
  draft: CatatDraft,
  categories: CatatCategory[],
  wallets: CatatWallet[],
  editing: { table: CatatPayload["table"]; debtPaid?: number; debtPaidAt?: string | null },
  now: Date = new Date(),
): CatatPayload {
  const built = buildCatatPayload(draft, categories, wallets);
  if (built.table !== editing.table) {
    throw new Error(`Catat edit: a ${editing.table} row cannot become a ${built.table} row.`);
  }
  const payload = { ...built.payload };
  if (built.table === "transactions") delete payload.merchant;
  if (built.table === "debts") {
    delete payload.source_name;
    const paid = Math.max(0, Number(editing.debtPaid) || 0);
    const isPaid = paid > 0 && paid >= draft.amount;
    payload.is_paid = isPaid;
    payload.paid_at = isPaid ? (editing.debtPaidAt ?? now.toISOString()) : null;
  }
  return { table: built.table, payload } as CatatPayload;
}

/** Categories of a type, most used first, then alphabetical. */
export function sortCategoriesByUsage(categories: CatatCategory[], type: "income" | "expense") {
  return categories
    .filter((category) => category.type === type)
    .sort(
      (a, b) =>
        (b.usageCount ?? 0) - (a.usageCount ?? 0) || a.name.localeCompare(b.name, "id"),
    );
}
