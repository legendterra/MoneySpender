import { cache } from "react";

import type { CatatCategory, CatatData, CatatTemplate, CatatWallet } from "@/components/quick-add/types";
import { getAuthedContext } from "@/lib/auth";
import { addDays, todayWIB } from "@/lib/dates";
import { CATEGORY_COLUMNS, WALLET_COLUMNS, fetchTemplates, mapWalletRow } from "@/lib/finance-data";
import { expectRows, selectAllRows } from "@/lib/supabase/query";
import type { Category, TransactionTemplate } from "@/lib/types";

/**
 * Data for the app shell and the global Catat sheet, loaded once by the
 * (workspace) layout. Reads go through expectRows/selectAllRows, so schema
 * drift throws an error naming the table instead of rendering empty chips.
 */

const USAGE_WINDOW_DAYS = 90;
const RECENT_CONTACTS = 12;

function toCatatTemplate(template: TransactionTemplate): CatatTemplate {
  return {
    id: template.id,
    label: template.label,
    type: template.type,
    amount: template.amount,
    categoryId: template.category_id,
    categoryLabel: template.category_label,
    walletId: template.wallet_id,
    walletLabel: template.wallet_label,
  };
}

export const getShellData = cache(async (): Promise<CatatData> => {
  const { supabase, user } = await getAuthedContext();
  const since = addDays(todayWIB(), -USAGE_WINDOW_DAYS);

  const [categoryRows, walletRows, usageRows, debtRows, templates] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("user_id", user.id)
      .in("type", ["income", "expense"])
      .order("name", { ascending: true })
      .then((result) => expectRows<Category>("categories", result)),
    supabase
      .from("wallets")
      .select(WALLET_COLUMNS)
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true })
      .then((result) => expectRows<Record<string, unknown>>("wallets", result).map(mapWalletRow)),
    // Paged: a busy quarter can exceed PostgREST's 1000-row cap.
    selectAllRows<{ category_id: string | null }>("transactions", () =>
      supabase
        .from("transactions")
        .select("id,category_id")
        .eq("user_id", user.id)
        .gte("transaction_date", since)
        .not("category_id", "is", null)
        .order("id", { ascending: true }),
    ),
    supabase
      .from("debts")
      .select("contact_name")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false })
      .limit(60)
      .then((result) => expectRows<{ contact_name: string | null }>("debts", result)),
    fetchTemplates(supabase, user.id),
  ]);

  const usage = new Map<string, number>();
  for (const row of usageRows) {
    if (row.category_id) usage.set(row.category_id, (usage.get(row.category_id) ?? 0) + 1);
  }

  const categories: CatatCategory[] = categoryRows.map((category) => ({
    ...category,
    usageCount: usage.get(category.id) ?? 0,
  }));

  const wallets: CatatWallet[] = walletRows.map((wallet) => ({
    id: wallet.id,
    name: wallet.name,
    kind: wallet.kind as CatatWallet["kind"],
  }));

  const contacts: string[] = [];
  for (const row of debtRows) {
    const name = row.contact_name?.trim();
    if (name && !contacts.includes(name)) contacts.push(name);
  }

  return {
    categories,
    wallets,
    templates: templates.filter((template) => template.amount > 0).map(toCatatTemplate),
    contacts: contacts.slice(0, RECENT_CONTACTS),
  };
});
