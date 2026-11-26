import type { SupabaseClient } from "@supabase/supabase-js";

import { todayWIB } from "@/lib/dates";
import { SupabaseQueryError } from "@/lib/supabase/query";
import type { DebtRecord } from "@/lib/types";

type PayableDebt = Pick<DebtRecord, "id" | "amount" | "paid_amount" | "wallet_id" | "wallet_label">;

/** A payment can never exceed what is still owed. */
export function clampDebtPayment(debt: Pick<DebtRecord, "amount" | "paid_amount">, requested: number) {
  const remaining = Math.max(0, Number(debt.amount) - Number(debt.paid_amount));
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return Math.min(requested, remaining);
}

export type RecordDebtPaymentInput = {
  userId: string;
  debt: PayableDebt;
  amount: number;
  /** Defaults to the debt's own wallet. */
  walletId?: string | null;
  walletLabel?: string | null;
  note?: string | null;
  paidDate?: string;
  now?: Date;
};

export type RecordDebtPaymentResult = {
  paymentId: string;
  amount: number;
  paidAmount: number;
  isPaid: boolean;
};

/**
 * Inserts the payment first, then updates the debt. If the debt update fails
 * the payment is deleted again, so debts.paid_amount and debt_payments never
 * disagree. Throws an Error naming the failing table.
 */
export async function recordDebtPayment(
  supabase: SupabaseClient,
  input: RecordDebtPaymentInput,
): Promise<RecordDebtPaymentResult> {
  const { debt, userId } = input;
  const amount = clampDebtPayment(debt, input.amount);
  if (amount <= 0) {
    throw new Error("Nominal pembayaran harus lebih dari 0 dan hutang ini belum lunas.");
  }

  const now = input.now ?? new Date();
  const paidAmount = Math.min(Number(debt.amount), Number(debt.paid_amount) + amount);
  const isPaid = paidAmount >= Number(debt.amount);
  const walletId = input.walletId === undefined ? debt.wallet_id : input.walletId;
  const walletLabel = input.walletLabel === undefined ? debt.wallet_label : input.walletLabel;

  const inserted = await supabase
    .from("debt_payments")
    .insert({
      user_id: userId,
      debt_id: debt.id,
      amount,
      wallet_id: walletId ?? null,
      wallet_label: walletLabel ?? null,
      paid_date: input.paidDate ?? todayWIB(now),
      note: input.note ?? null,
    })
    .select("id")
    .single();
  if (inserted.error) throw new SupabaseQueryError("debt_payments", "insert", inserted.error);
  const paymentId = String((inserted.data as { id: string }).id);

  const updated = await supabase
    .from("debts")
    .update({ paid_amount: paidAmount, is_paid: isPaid, paid_at: isPaid ? now.toISOString() : null })
    .eq("id", debt.id)
    .eq("user_id", userId);

  if (updated.error) {
    const rollback = await supabase.from("debt_payments").delete().eq("id", paymentId).eq("user_id", userId);
    const rollbackNote = rollback.error
      ? ` Rollback of debt_payments ${paymentId} also failed: ${rollback.error.message}.`
      : " The payment was rolled back.";
    throw new Error(`${new SupabaseQueryError("debts", "update", updated.error).message}${rollbackNote}`);
  }

  return { paymentId, amount, paidAmount, isPaid };
}

type Row = Record<string, unknown>;

type DebtState = { id: string; amount: number; paid_amount: number; is_paid: boolean; paid_at: string | null };

async function readDebtState(supabase: SupabaseClient, userId: string, debtId: string): Promise<DebtState> {
  const result = await supabase
    .from("debts")
    .select("id,amount,paid_amount,is_paid,paid_at")
    .eq("id", debtId)
    .eq("user_id", userId)
    .single();
  if (result.error) throw new SupabaseQueryError("debts", "select", result.error);
  const row = result.data as Row;
  return {
    id: String(row.id),
    amount: Number(row.amount ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
    is_paid: Boolean(row.is_paid),
    paid_at: row.paid_at === null || row.paid_at === undefined ? null : String(row.paid_at),
  };
}

export type DeletedDebtPayment = { payment: Row; debtId: string; previousPaidAt: string | null };

/**
 * Deletes a payment and lowers the debt's paid_amount by it (the debt becomes
 * unpaid again). If the debt update fails, the payment is inserted back.
 * Returns what `restoreDebtPayment` needs for an undo.
 */
export async function deleteDebtPayment(
  supabase: SupabaseClient,
  { userId, paymentId }: { userId: string; paymentId: string },
): Promise<DeletedDebtPayment> {
  const found = await supabase.from("debt_payments").select("*").eq("id", paymentId).eq("user_id", userId).single();
  if (found.error) throw new SupabaseQueryError("debt_payments", "select", found.error);
  const payment = found.data as Row;
  const debt = await readDebtState(supabase, userId, String(payment.debt_id));

  const removed = await supabase.from("debt_payments").delete().eq("id", paymentId).eq("user_id", userId);
  if (removed.error) throw new SupabaseQueryError("debt_payments", "delete", removed.error);

  const paidAmount = Math.max(0, Math.min(debt.amount, debt.paid_amount) - Number(payment.amount ?? 0));
  const isPaid = paidAmount >= debt.amount;
  const updated = await supabase
    .from("debts")
    .update({ paid_amount: paidAmount, is_paid: isPaid, paid_at: isPaid ? debt.paid_at : null })
    .eq("id", debt.id)
    .eq("user_id", userId);
  if (updated.error) {
    const rollback = await supabase.from("debt_payments").insert(payment);
    const rollbackNote = rollback.error
      ? ` Re-inserting debt_payments ${paymentId} also failed: ${rollback.error.message}.`
      : " The payment was put back.";
    throw new Error(`${new SupabaseQueryError("debts", "update", updated.error).message}${rollbackNote}`);
  }

  return { payment, debtId: debt.id, previousPaidAt: debt.paid_at };
}

/** Undo for deleteDebtPayment: puts the payment back and raises paid_amount again. */
export async function restoreDebtPayment(
  supabase: SupabaseClient,
  { userId, deleted, now = new Date() }: { userId: string; deleted: DeletedDebtPayment; now?: Date },
) {
  const debt = await readDebtState(supabase, userId, deleted.debtId);
  const inserted = await supabase.from("debt_payments").insert(deleted.payment);
  if (inserted.error) throw new SupabaseQueryError("debt_payments", "insert", inserted.error);

  const paidAmount = Math.min(debt.amount, debt.paid_amount + Number(deleted.payment.amount ?? 0));
  const isPaid = paidAmount >= debt.amount;
  const updated = await supabase
    .from("debts")
    .update({
      paid_amount: paidAmount,
      is_paid: isPaid,
      paid_at: isPaid ? (deleted.previousPaidAt ?? now.toISOString()) : null,
    })
    .eq("id", debt.id)
    .eq("user_id", userId);
  if (updated.error) {
    await supabase.from("debt_payments").delete().eq("id", String(deleted.payment.id)).eq("user_id", userId);
    throw new SupabaseQueryError("debts", "update", updated.error);
  }
}
