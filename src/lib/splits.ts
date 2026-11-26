export type SplitDraftRow = {
  categoryId: string | null;
  categoryLabel: string;
  amount: number;
};

export type SplitValidationIssue = "empty" | "invalidAmount" | "mismatch" | "missingCategory";

export function remainingSplitAmount(totalAmount: number, rows: SplitDraftRow[]): number {
  const sum = rows.reduce((acc, row) => acc + (Number.isFinite(row.amount) ? Math.round(row.amount) : 0), 0);
  return Math.round(totalAmount) - sum;
}

export function validateSplits(totalAmount: number, rows: SplitDraftRow[]): SplitValidationIssue | null {
  if (rows.length < 2) return "empty";
  for (const row of rows) {
    if (!Number.isInteger(row.amount) || row.amount <= 0) return "invalidAmount";
    if (!row.categoryLabel.trim()) return "missingCategory";
  }
  if (remainingSplitAmount(totalAmount, rows) !== 0) return "mismatch";
  return null;
}

export function buildSplitPayloads(userId: string, transactionId: string, rows: SplitDraftRow[]) {
  return rows.map((row) => ({
    user_id: userId,
    transaction_id: transactionId,
    category_id: row.categoryId,
    category_label: row.categoryLabel.trim(),
    amount: Math.round(row.amount),
  }));
}
