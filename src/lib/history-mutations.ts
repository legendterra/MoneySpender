import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteDebtPayment, restoreDebtPayment, type DeletedDebtPayment } from "@/lib/debt-payments";
import type { HistoryKind } from "@/lib/history";
import { SupabaseQueryError } from "@/lib/supabase/query";

// Delete with undo (Riwayat, Hutang). The full rows are read before deleting,
// so "Urungkan" re-inserts exactly what was there (same id and created_at).

type Row = Record<string, unknown>;

export type UndoToken =
  | { kind: "rows"; inserts: Array<{ table: string; rows: Row[] }> }
  | { kind: "payment"; deleted: DeletedDebtPayment };

export type DeleteTarget = { kind: HistoryKind; id: string };

const TABLE_BY_KIND = {
  expense: "transactions",
  income: "transactions",
  transfer: "wallet_transfers",
  debt: "debts",
} as const;

async function readRow(supabase: SupabaseClient, table: string, id: string, userId: string) {
  const result = await supabase.from(table).select("*").eq("id", id).eq("user_id", userId).single();
  if (result.error) throw new SupabaseQueryError(table, "select", result.error);
  return result.data as Row;
}

export async function deleteEntry(supabase: SupabaseClient, userId: string, target: DeleteTarget): Promise<UndoToken> {
  if (target.kind === "debt_payment") {
    return { kind: "payment", deleted: await deleteDebtPayment(supabase, { userId, paymentId: target.id }) };
  }

  const table = TABLE_BY_KIND[target.kind];
  const row = await readRow(supabase, table, target.id, userId);
  const inserts: Array<{ table: string; rows: Row[] }> = [{ table, rows: [row] }];

  if (table === "debts") {
    // Payments are removed by ON DELETE CASCADE; keep them for the undo.
    const payments = await supabase.from("debt_payments").select("*").eq("debt_id", target.id).eq("user_id", userId);
    if (payments.error) throw new SupabaseQueryError("debt_payments", "select", payments.error);
    const rows = (payments.data ?? []) as Row[];
    if (rows.length) inserts.push({ table: "debt_payments", rows });
  }

  const removed = await supabase.from(table).delete().eq("id", target.id).eq("user_id", userId);
  if (removed.error) throw new SupabaseQueryError(table, "delete", removed.error);
  return { kind: "rows", inserts };
}

export async function restoreEntry(supabase: SupabaseClient, userId: string, token: UndoToken) {
  if (token.kind === "payment") {
    await restoreDebtPayment(supabase, { userId, deleted: token.deleted });
    return;
  }
  for (const { table, rows } of token.inserts) {
    const owned = rows.filter((row) => row.user_id === userId);
    if (!owned.length) continue;
    const inserted = await supabase.from(table).insert(owned);
    if (inserted.error) throw new SupabaseQueryError(table, "insert", inserted.error);
  }
}
