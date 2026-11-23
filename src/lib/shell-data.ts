import { cache } from "react";

import type { CatatCategory, CatatData, CatatWallet } from "@/components/quick-add/types";
import { addDaysToKey, jakartaDateKey } from "@/components/ui/format";
import { getAuthedContext } from "@/lib/auth";

/**
 * Data for the app shell and the global Catat sheet, plus today's activity for Beranda.
 * Every query result goes through `rows()`, which throws with the table name, so
 * schema drift is visible instead of silently empty.
 *
 * TODO(v2-merge): when src/lib/data.ts exposes the same data (categories with usage,
 * today's activity), switch the layout and dashboard to it and delete this file.
 */

type QueryResult<T> = { data: T[] | null; error: { message: string } | null };

function rows<T>(table: string, result: QueryResult<T>): T[] {
  if (result.error) {
    throw new Error(`Gagal memuat tabel ${table}: ${result.error.message}`);
  }
  return result.data ?? [];
}

const USAGE_WINDOW_DAYS = 90;

export const getShellData = cache(async (): Promise<CatatData> => {
  const { supabase, user } = await getAuthedContext();
  const since = addDaysToKey(jakartaDateKey(), -USAGE_WINDOW_DAYS);

  const [categoriesResult, walletsResult, usageResult, debtsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,type,color")
      .eq("user_id", user.id)
      .in("type", ["income", "expense"])
      .order("name", { ascending: true }),
    supabase
      .from("wallets")
      .select("id,name,kind")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("category_id")
      .eq("user_id", user.id)
      .gte("transaction_date", since)
      .not("category_id", "is", null)
      .limit(3000),
    supabase
      .from("debts")
      .select("contact_name")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false })
      .limit(60),
  ]);

  const usage = new Map<string, number>();
  for (const row of rows<{ category_id: string | null }>("transactions", usageResult)) {
    if (row.category_id) usage.set(row.category_id, (usage.get(row.category_id) ?? 0) + 1);
  }

  const categories: CatatCategory[] = rows<Omit<CatatCategory, "usageCount">>(
    "categories",
    categoriesResult,
  ).map((category) => ({ ...category, usageCount: usage.get(category.id) ?? 0 }));

  const wallets = rows<CatatWallet>("wallets", walletsResult);

  const contacts: string[] = [];
  for (const row of rows<{ contact_name: string | null }>("debts", debtsResult)) {
    const name = row.contact_name?.trim();
    if (name && !contacts.includes(name)) contacts.push(name);
  }

  // TODO(v2-merge): templates come from `transaction_templates` once the migration is live.
  return { categories, wallets, templates: [], contacts: contacts.slice(0, 12) };
});

export type TodayActivityItem = {
  id: string;
  kind: "expense" | "income" | "transfer" | "debt";
  amount: number;
  title: string;
  categoryLabel: string | null;
  walletLabel: string | null;
  /** Transfers: wallet names. Debts: direction + contact. */
  fromWallet?: string | null;
  toWallet?: string | null;
  debtDirection?: "payable" | "receivable";
  contactName?: string | null;
  createdAt: string;
};

export type TodayActivity = {
  dateKey: string;
  items: TodayActivityItem[];
  spent: number;
  income: number;
};

/** Everything recorded today (Asia/Jakarta): transactions, transfers and new debts. */
export const getTodayActivity = cache(async (): Promise<TodayActivity> => {
  const { supabase, user } = await getAuthedContext();
  const dateKey = jakartaDateKey();

  const [txResult, transferResult, debtResult, walletResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,type,amount,category_label,wallet_label,reason,merchant,created_at")
      .eq("user_id", user.id)
      .eq("transaction_date", dateKey)
      .order("created_at", { ascending: false }),
    supabase
      .from("wallet_transfers")
      .select("id,amount,from_wallet_id,to_wallet_id,note,created_at")
      .eq("user_id", user.id)
      .eq("transfer_date", dateKey),
    supabase
      .from("debts")
      .select("id,amount,direction,contact_name,wallet_label,reason,created_at")
      .eq("user_id", user.id)
      .eq("debt_date", dateKey),
    supabase.from("wallets").select("id,name").eq("user_id", user.id),
  ]);

  const walletNames = new Map(
    rows<{ id: string; name: string }>("wallets", walletResult).map((wallet) => [wallet.id, wallet.name]),
  );

  const items: TodayActivityItem[] = [];
  let spent = 0;
  let income = 0;

  for (const row of rows<{
    id: string;
    type: "income" | "expense";
    amount: number | string;
    category_label: string | null;
    wallet_label: string | null;
    reason: string | null;
    merchant: string | null;
    created_at: string;
  }>("transactions", txResult)) {
    const amount = Number(row.amount);
    if (row.type === "expense") spent += amount;
    else income += amount;
    items.push({
      id: `tx-${row.id}`,
      kind: row.type,
      amount,
      title: row.reason?.trim() || row.merchant?.trim() || row.category_label || "",
      categoryLabel: row.category_label,
      walletLabel: row.wallet_label,
      createdAt: row.created_at,
    });
  }

  for (const row of rows<{
    id: string;
    amount: number | string;
    from_wallet_id: string;
    to_wallet_id: string;
    note: string | null;
    created_at: string;
  }>("wallet_transfers", transferResult)) {
    items.push({
      id: `tf-${row.id}`,
      kind: "transfer",
      amount: Number(row.amount),
      title: row.note?.trim() ?? "",
      categoryLabel: null,
      walletLabel: null,
      fromWallet: walletNames.get(row.from_wallet_id) ?? null,
      toWallet: walletNames.get(row.to_wallet_id) ?? null,
      createdAt: row.created_at,
    });
  }

  for (const row of rows<{
    id: string;
    amount: number | string;
    direction: "payable" | "receivable";
    contact_name: string | null;
    wallet_label: string | null;
    reason: string | null;
    created_at: string;
  }>("debts", debtResult)) {
    items.push({
      id: `db-${row.id}`,
      kind: "debt",
      amount: Number(row.amount),
      title: row.reason?.trim() ?? "",
      categoryLabel: row.direction === "payable" ? "Hutang" : "Piutang",
      walletLabel: row.wallet_label,
      debtDirection: row.direction,
      contactName: row.contact_name,
      createdAt: row.created_at,
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { dateKey, items, spent, income };
});
