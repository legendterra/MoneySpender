import { describe, expect, it } from "vitest";

import { resolveLocale } from "@/i18n/locales";
import { fetchProfile, fetchReminderPreferences, fetchTemplates, normalizeReminder } from "@/lib/finance-data";
import {
  SupabaseQueryError,
  expectCount,
  expectData,
  expectRows,
  isMissingSchemaError,
  selectAllRows,
} from "@/lib/supabase/query";

import { FakeSupabase, asClient } from "./helpers/fake-supabase";

describe("Supabase result helpers", () => {
  it("throw an error naming the table, operation, code and message", () => {
    const error = { code: "42703", message: "column transactions.payment_method does not exist" };
    expect(() => expectRows("transactions", { data: null, error })).toThrow(
      'Supabase select on "transactions" failed [42703]: column transactions.payment_method does not exist.',
    );
    expect(() => expectData("debts", { data: null, error }, "update")).toThrow(SupabaseQueryError);
    expect(() => expectCount("debts", { data: null, error })).toThrow(/count on "debts"/);
  });

  it("return data, [] for null lists and the count", () => {
    expect(expectRows("t", { data: null, error: null })).toEqual([]);
    expect(expectData("t", { data: { a: 1 }, error: null })).toEqual({ a: 1 });
    expect(expectCount("t", { data: null, error: null, count: 7 })).toBe(7);
  });

  it("recognise missing-schema errors", () => {
    expect(isMissingSchemaError({ code: "42703", message: "" })).toBe(true);
    expect(isMissingSchemaError({ code: "PGRST205", message: "" })).toBe(true);
    expect(isMissingSchemaError({ code: "23505", message: "" })).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
  });

  it("selectAllRows pages past the 1000-row PostgREST cap", async () => {
    const rows = Array.from({ length: 2_345 }, (_, i) => ({ id: String(i).padStart(5, "0"), user_id: "u1" }));
    const db = new FakeSupabase({ transactions: rows });
    const all = await selectAllRows("transactions", () =>
      asClient(db).from("transactions").select("id").eq("user_id", "u1").order("id"),
    );
    expect(all).toHaveLength(2_345);
    expect(db.calls("transactions")).toHaveLength(3);
  });
});

describe("profile / reminder readers", () => {
  it("fall back to the pre-migration columns and default locale 'id'", async () => {
    const db = new FakeSupabase(
      { profiles: [{ id: "u1", full_name: "Budi", currency_code: "IDR", monthly_savings_goal: "1000000" }] },
      {
        failures: [
          {
            table: "profiles",
            op: "select",
            error: { code: "42703", message: "column profiles.locale does not exist" },
            when: (q) => Boolean(q.columns?.includes("locale")),
          },
        ],
      },
    );
    const profile = await fetchProfile(asClient(db), "u1");
    expect(profile).toMatchObject({ full_name: "Budi", locale: "id", reserve_savings: false, monthly_savings_goal: 1_000_000 });
  });

  it("read locale and reserve_savings once the migration is applied", async () => {
    const db = new FakeSupabase({ profiles: [{ id: "u1", locale: "en", reserve_savings: true }] });
    expect(await fetchProfile(asClient(db), "u1")).toMatchObject({ locale: "en", reserve_savings: true });
  });

  it("do not hide other errors", async () => {
    const db = new FakeSupabase(
      { profiles: [] },
      { failures: [{ table: "profiles", op: "select", error: { code: "42501", message: "permission denied for table profiles" } }] },
    );
    await expect(fetchProfile(asClient(db), "u1")).rejects.toThrow(/"profiles" failed \[42501\]/);
  });

  it("default digest settings before the migration", async () => {
    const db = new FakeSupabase(
      { reminder_preferences: [{ user_id: "u1", push_enabled: true }] },
      {
        failures: [
          {
            table: "reminder_preferences",
            op: "select",
            error: { code: "42703", message: "column reminder_preferences.digest_enabled does not exist" },
            when: (q) => Boolean(q.columns?.includes("digest_enabled")),
          },
        ],
      },
    );
    expect(await fetchReminderPreferences(asClient(db), "u1")).toMatchObject({
      push_enabled: true,
      digest_enabled: true,
      digest_every_hours: 3,
      active_start: 9,
      active_end: 21,
      hide_amounts: false,
    });
  });

  it("return no templates until the table exists", async () => {
    const db = new FakeSupabase(
      {},
      { failures: [{ table: "transaction_templates", op: "select", error: { code: "PGRST205", message: "Could not find the table" } }] },
    );
    expect(await fetchTemplates(asClient(db), "u1")).toEqual([]);
  });

  it("normalizes invalid digest windows to the defaults", () => {
    expect(normalizeReminder({ digest_every_hours: 5, active_start: 22, active_end: 6 })).toMatchObject({
      digest_every_hours: 3,
      active_start: 9,
      active_end: 21,
    });
    expect(normalizeReminder({ digest_every_hours: 0, active_start: 7, active_end: 22 })).toMatchObject({
      digest_every_hours: 0,
      active_start: 7,
      active_end: 22,
    });
  });

  it("resolveLocale keeps id as the default", () => {
    expect(resolveLocale(undefined)).toBe("id");
    expect(resolveLocale("fr", "en")).toBe("en");
    expect(resolveLocale("en")).toBe("en");
  });
});
