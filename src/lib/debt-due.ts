export type DebtDueState = "overdue" | "today" | "soon" | "upcoming" | "none";

export type DebtDueSummary = {
  state: DebtDueState;
  daysUntil: number | null;
};

function parseDateKeyUtc(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Classifies a debt's due date relative to today (WIB YYYY-MM-DD):
 * - overdue (< 0 days), today (0), soon (1..3 days), upcoming (> 3 days), none (paid or unset).
 */
export function evaluateDebtDue(
  dueDate: string | null | undefined,
  todayKey: string,
  settled = false,
): DebtDueSummary {
  if (settled || !dueDate) return { state: "none", daysUntil: null };
  const dueMs = parseDateKeyUtc(dueDate);
  const todayMs = parseDateKeyUtc(todayKey);
  if (dueMs === null || todayMs === null) return { state: "none", daysUntil: null };
  const daysUntil = Math.round((dueMs - todayMs) / 86_400_000);
  if (daysUntil < 0) return { state: "overdue", daysUntil };
  if (daysUntil === 0) return { state: "today", daysUntil };
  if (daysUntil <= 3) return { state: "soon", daysUntil };
  return { state: "upcoming", daysUntil };
}
