import { getAuthedContext } from "@/lib/auth";
import {
  RECURRING_COLUMNS,
  TEMPLATE_COLUMNS,
  fetchProfile,
  fetchReminderPreferences,
  mapRecurring,
  mapTemplate,
} from "@/lib/finance-data";
import { clampPage, pageRange, totalPages } from "@/lib/paging";
import { expectCount, expectRows } from "@/lib/supabase/query";
import type { Category, TransactionType } from "@/lib/types";

// Per-section fetchers for /settings/<section>: each route reads only what it
// shows, lists are paged in the database (10 rows), queries run in parallel.

export const SETTINGS_PAGE_SIZE = 10;

function fallbackName(user: { user_metadata?: Record<string, unknown> | null }) {
  const name = user.user_metadata?.full_name;
  return typeof name === "string" ? name : null;
}

export type Paged<T> = { items: T[]; page: number; totalPages: number; totalItems: number };

type RangeResult = { data: unknown; error: { message: string; code?: string } | null; count: number | null };

/**
 * Runs a counted, ranged select. A page past the end (PostgREST 416 / PGRST103,
 * e.g. after deleting the last row of the last page) falls back to page 1.
 */
async function rangedSelect<R extends RangeResult>(
  page: number,
  run: (from: number, to: number) => PromiseLike<R>,
): Promise<{ result: R; page: number }> {
  const { from, to } = pageRange(page, SETTINGS_PAGE_SIZE);
  const result = await run(from, to);
  if (page > 1 && result.error?.code === "PGRST103") {
    const first = pageRange(1, SETTINGS_PAGE_SIZE);
    return { result: await run(first.from, first.to), page: 1 };
  }
  return { result, page };
}

/** Clamps the requested page against the row count from the same query. */
function paged<T>(items: T[], count: number, requested: number): Paged<T> {
  const pages = totalPages(count, SETTINGS_PAGE_SIZE);
  return { items, page: clampPage(requested, pages), totalPages: pages, totalItems: count };
}

/** /settings menu: values shown as hints next to each section. */
export async function getSettingsMenuData() {
  const { supabase, user } = await getAuthedContext();
  const head = { count: "exact" as const, head: true };
  const [profile, reminder, categories, recurring, templates] = await Promise.all([
    fetchProfile(supabase, user.id, fallbackName(user)),
    fetchReminderPreferences(supabase, user.id),
    supabase.from("categories").select("id", head).eq("user_id", user.id),
    supabase.from("recurring_transactions").select("id", head).eq("user_id", user.id).eq("is_active", true),
    supabase.from("transaction_templates").select("id", head).eq("user_id", user.id),
  ]);
  return {
    user: { id: user.id, email: user.email ?? "" },
    profile,
    reminder,
    counts: {
      categories: expectCount("categories", categories),
      recurring: expectCount("recurring_transactions", recurring),
      templates: expectCount("transaction_templates", templates),
    },
  };
}

export async function getProfileSettings() {
  const { supabase, user } = await getAuthedContext();
  const profile = await fetchProfile(supabase, user.id, fallbackName(user));
  return { user: { id: user.id, email: user.email ?? "" }, profile };
}

export async function getNotificationSettings() {
  const { supabase, user } = await getAuthedContext();
  const [reminder, devices] = await Promise.all([
    fetchReminderPreferences(supabase, user.id),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  return { userId: user.id, reminder, deviceCount: expectCount("push_subscriptions", devices) };
}

export async function getCategoriesSettings(type: TransactionType, page: number) {
  const { supabase, user } = await getAuthedContext();
  const { result, page: served } = await rangedSelect(page, (from, to) =>
    supabase
      .from("categories")
      .select("id,name,type,color", { count: "exact" })
      .eq("user_id", user.id)
      .eq("type", type)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  const items = expectRows<Category>("categories", result);
  return { userId: user.id, type, ...paged(items, result.count ?? items.length, served) };
}

/** Categories and wallets for the selects in the recurring/template sheets (small, per user). */
async function pickerOptions(userId: string) {
  const { supabase } = await getAuthedContext();
  const [categories, wallets] = await Promise.all([
    supabase.from("categories").select("id,name,type,color").eq("user_id", userId).order("name"),
    supabase.from("wallets").select("id,name").eq("user_id", userId).eq("is_archived", false).order("created_at"),
  ]);
  return {
    categories: expectRows<Category>("categories", categories),
    wallets: expectRows<{ id: string; name: string }>("wallets", wallets),
  };
}

export async function getRecurringSettings(page: number) {
  const { supabase, user } = await getAuthedContext();
  const [{ result: list, page: served }, totals, options] = await Promise.all([
    rangedSelect(page, (from, to) =>
      supabase
        .from("recurring_transactions")
        .select(RECURRING_COLUMNS, { count: "exact" })
        .eq("user_id", user.id)
        .order("day_of_month", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    supabase.from("recurring_transactions").select("type,amount,is_active").eq("user_id", user.id).eq("is_active", true),
    pickerOptions(user.id),
  ]);
  const items = expectRows<Record<string, unknown>>("recurring_transactions", list).map(mapRecurring);
  const active = expectRows<{ type: TransactionType; amount: number; is_active: boolean }>(
    "recurring_transactions",
    totals,
  );
  return { userId: user.id, ...options, active, ...paged(items, list.count ?? items.length, served) };
}

export async function getTemplateSettings(page: number) {
  const { supabase, user } = await getAuthedContext();
  const [{ result: list, page: served }, last, options] = await Promise.all([
    rangedSelect(page, (from, to) =>
      supabase
        .from("transaction_templates")
        .select(TEMPLATE_COLUMNS, { count: "exact" })
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .range(from, to),
    ),
    supabase
      .from("transaction_templates")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1),
    pickerOptions(user.id),
  ]);
  const items = expectRows<Record<string, unknown>>("transaction_templates", list).map(mapTemplate);
  const maxSort = expectRows<{ sort_order: number }>("transaction_templates", last)[0]?.sort_order ?? -1;
  return {
    userId: user.id,
    ...options,
    nextSortOrder: Number(maxSort) + 1,
    ...paged(items, list.count ?? items.length, served),
  };
}
