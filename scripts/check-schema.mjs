#!/usr/bin/env node
// Read-only schema drift check (PLAN.md section 9 "Schema").
//
// For every table/column list the app selects or writes, sends
//   GET /rest/v1/<table>?select=<cols>&limit=0
// with the anon key. RLS returns zero rows, but PostgREST still validates the
// table, every column and enum filters, so a missing column fails with
// 400/42703 and a missing table with 404/PGRST205. Nothing is ever written.
//
// Keep PROBES in sync with the column lists in src/lib/finance-data.ts and the
// insert/update payloads in routes and components.
//
// Usage: npm run check:schema        (reads .env.local, falls back to process.env)
// Exit code 1 when any probe fails.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATION = "requires migration 2026-11-20";

/** @type {Array<{ table: string; columns: string[]; filter?: string; note?: string }>} */
const PROBES = [
  // profiles
  { table: "profiles", columns: ["id", "full_name", "currency_code", "monthly_savings_goal", "yearly_savings_goal", "created_at", "updated_at"] },
  { table: "profiles", columns: ["locale", "reserve_savings"], note: MIGRATION },

  // categories
  { table: "categories", columns: ["id", "user_id", "name", "type", "color", "created_at"] },
  { table: "categories", columns: ["id"], filter: "type=in.(income,expense)", note: "enum transaction_type" },

  // wallets
  { table: "wallets", columns: ["id", "user_id", "name", "kind", "opening_balance", "color", "is_archived", "created_at", "updated_at"] },

  // transactions
  {
    table: "transactions",
    columns: ["id", "user_id", "type", "amount", "category_id", "category_label", "wallet_id", "wallet_label", "transaction_date", "reason", "merchant", "created_at", "updated_at"],
  },
  { table: "transactions", columns: ["id"], filter: "type=in.(income,expense)", note: "enum transaction_type" },

  // wallet_transfers
  { table: "wallet_transfers", columns: ["id", "user_id", "from_wallet_id", "to_wallet_id", "amount", "transfer_date", "note", "created_at"] },

  // debts
  {
    table: "debts",
    columns: ["id", "user_id", "direction", "amount", "paid_amount", "wallet_id", "wallet_label", "category_id", "category_label", "debt_date", "contact_name", "source_name", "reason", "is_paid", "paid_at", "created_at"],
  },
  { table: "debts", columns: ["id"], filter: "direction=in.(payable,receivable)", note: "enum debt_direction" },

  // debt_payments
  { table: "debt_payments", columns: ["id", "user_id", "debt_id", "amount", "wallet_id", "wallet_label", "paid_date", "note", "created_at"] },

  // monthly_budgets
  { table: "monthly_budgets", columns: ["id", "user_id", "category_id", "month", "amount"] },

  // recurring_transactions
  {
    table: "recurring_transactions",
    columns: ["id", "user_id", "type", "category_id", "category_label", "wallet_id", "wallet_label", "amount", "reason", "merchant", "day_of_month", "last_generated_month", "is_active"],
  },

  // reminder_preferences
  { table: "reminder_preferences", columns: ["user_id", "reminder_morning_enabled", "reminder_evening_enabled", "push_enabled"] },
  {
    table: "reminder_preferences",
    columns: ["digest_enabled", "digest_every_hours", "active_start", "active_end", "hide_amounts"],
    note: MIGRATION,
  },

  // push_subscriptions
  { table: "push_subscriptions", columns: ["id", "user_id", "endpoint", "p256dh", "auth", "user_agent", "created_at"] },

  // budget_notification_logs
  { table: "budget_notification_logs", columns: ["id", "user_id", "category_id", "month", "threshold"] },

  // notification_digest_logs (new table)
  {
    table: "notification_digest_logs",
    columns: ["id", "user_id", "endpoint", "local_date", "local_hour", "kind", "created_at"],
    note: MIGRATION,
  },

  // transaction_templates (new table)
  {
    table: "transaction_templates",
    columns: ["id", "user_id", "label", "type", "amount", "category_id", "category_label", "wallet_id", "wallet_label", "sort_order", "created_at"],
    note: MIGRATION,
  },

  // audit_logs
  { table: "audit_logs", columns: ["id", "user_id", "action", "metadata", "created_at"] },

  // subscriptions (billing, dormant)
  {
    table: "subscriptions",
    columns: ["user_id", "plan", "status", "provider_customer_id", "provider_subscription_id", "current_period_end", "updated_at"],
  },

  // v2.2 enhancements (migration 2026-11-26)
  { table: "debts", columns: ["due_date"], note: "v2.2 migration 2026-11-26" },
  {
    table: "recurring_transactions",
    columns: ["cadence", "day_of_week", "month_of_year", "end_of_month", "to_wallet_id", "to_wallet_label"],
    note: "v2.2 migration 2026-11-26",
  },
  {
    table: "savings_goals",
    columns: ["id", "user_id", "name", "target_amount", "current_amount", "target_date", "wallet_id", "is_archived", "created_at", "updated_at"],
    note: "v2.2 migration 2026-11-26",
  },
];

function readEnvFile(path) {
  const values = {};
  if (!existsSync(path)) return values;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    values[match[1]] = value;
  }
  return values;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fileEnv = readEnvFile(join(root, ".env.local"));
const supabaseUrl = fileEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("FAIL  setup  NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local and environment");
  process.exit(1);
}

async function probe({ table, columns, filter }) {
  const query = new URLSearchParams({ select: columns.join(","), limit: "0" });
  const url = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/${table}?${query.toString()}${filter ? `&${filter}` : ""}`;
  try {
    const response = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return { ok: true };
    const text = await response.text();
    let detail = text.slice(0, 200);
    try {
      const body = JSON.parse(text);
      detail = [body.code, body.message].filter(Boolean).join(" ");
    } catch {
      // keep raw text
    }
    return { ok: false, detail: `HTTP ${response.status} ${detail}` };
  } catch (error) {
    return { ok: false, detail: `request failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

const results = [];
for (const entry of PROBES) {
  const result = await probe(entry);
  results.push({ entry, result });
  const target = entry.filter ? `${entry.table} [${entry.filter}]` : `${entry.table}(${entry.columns.join(",")})`;
  const note = entry.note ? `  (${entry.note})` : "";
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${target}${note}${result.ok ? "" : `  -> ${result.detail}`}`);
}

const failed = results.filter(({ result }) => !result.ok);
const failedPending = failed.filter(({ entry }) => entry.note === MIGRATION);
console.log(
  `\n${results.length} probes: ${results.length - failed.length} passed, ${failed.length} failed` +
    (failedPending.length
      ? ` (${failedPending.length} of them ${MIGRATION.replace("requires", "require")}: run supabase/migrations/2026-11-20-v2-preferences.sql in the Supabase SQL Editor)`
      : ""),
);
process.exit(failed.length ? 1 : 0);
