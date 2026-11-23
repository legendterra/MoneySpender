import { describe, expect, it, vi } from "vitest";

import { runDigest } from "@/lib/digest-runner";
import type { PushPayload, PushSubscriptionRow } from "@/lib/push";

import { FakeSupabase, asClient, type Failure } from "./helpers/fake-supabase";

// 02:00 UTC = 09:00 WIB on 2026-11-20 (first slot of a 09-21 window).
const NINE_AM_WIB = new Date("2026-11-20T02:00:00Z");

function pref(user_id: string, overrides: Record<string, unknown> = {}) {
  return {
    user_id,
    push_enabled: true,
    digest_enabled: true,
    digest_every_hours: 3,
    active_start: 9,
    active_end: 21,
    hide_amounts: false,
    ...overrides,
  };
}

function sub(user_id: string, endpoint: string) {
  return { user_id, endpoint: `https://push.example/${endpoint}`, p256dh: "p", auth: "a" };
}

function makeDb(options: { failures?: Failure[]; prefs?: Record<string, Record<string, unknown>> } = {}) {
  return new FakeSupabase(
    {
      reminder_preferences: [
        pref("u1", options.prefs?.u1),
        pref("u2", { digest_enabled: false, ...options.prefs?.u2 }),
        pref("u3", { push_enabled: false }),
        pref("u4", { active_start: 12, active_end: 20 }),
      ],
      push_subscriptions: [sub("u1", "e1"), sub("u1", "e2"), sub("u2", "e3"), sub("u3", "e4"), sub("u4", "e5")],
      profiles: [
        { id: "u1", locale: "en", currency_code: "IDR", monthly_savings_goal: 0, reserve_savings: false },
        { id: "u2", locale: "id", currency_code: "IDR", monthly_savings_goal: 0, reserve_savings: false },
        { id: "u4", locale: "id", currency_code: "IDR", monthly_savings_goal: 0, reserve_savings: false },
      ],
      wallets: [
        { id: "w1", user_id: "u1", name: "Tunai", kind: "cash", opening_balance: 1_100_000, color: null, is_archived: false, created_at: "1" },
        { id: "w2", user_id: "u2", name: "BCA", kind: "bank", opening_balance: 500_000, color: null, is_archived: false, created_at: "1" },
      ],
      transactions: [
        { id: "t1", user_id: "u1", type: "expense", amount: 85_000, category_id: "c1", wallet_id: "w1", transaction_date: "2026-11-10" },
        { id: "t2", user_id: "u2", type: "expense", amount: 60_000, category_id: "c2", wallet_id: "w2", transaction_date: "2026-11-11" },
      ],
      categories: [
        { id: "c1", user_id: "u1", name: "Food", type: "expense" },
        { id: "c2", user_id: "u2", name: "Makan", type: "expense" },
      ],
      monthly_budgets: [
        { id: "b1", user_id: "u1", category_id: "c1", month: "2026-11", amount: 100_000 },
        { id: "b2", user_id: "u2", category_id: "c2", month: "2026-11", amount: 50_000 },
      ],
      wallet_transfers: [],
      debts: [],
      debt_payments: [],
      recurring_transactions: [],
      notification_digest_logs: [],
      budget_notification_logs: [],
    },
    {
      unique: {
        notification_digest_logs: [["endpoint", "local_date", "local_hour"]],
        budget_notification_logs: [["user_id", "category_id", "month", "threshold"]],
      },
      failures: options.failures,
    },
  );
}

function recordingSender(fail: Record<string, number> = {}) {
  const calls: Array<{ endpoint: string; payload: PushPayload }> = [];
  const send = vi.fn(async (subscription: PushSubscriptionRow, payload: PushPayload) => {
    const status = fail[subscription.endpoint];
    if (status) throw Object.assign(new Error(`push service said ${status}`), { statusCode: status });
    calls.push({ endpoint: subscription.endpoint, payload });
  });
  return { send, calls };
}

describe("runDigest", () => {
  it("dry run returns the plan without sending or logging anything", async () => {
    const db = makeDb();
    const { send } = recordingSender();
    const report = await runDigest({ client: asClient(db), now: NINE_AM_WIB, dry: true, send });

    expect(report).toMatchObject({ dry: true, date: "2026-11-20", hour: 9, sent: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(db.calls("notification_digest_logs", "insert")).toHaveLength(0);
    expect(db.calls("budget_notification_logs", "insert")).toHaveLength(0);

    const byUser = Object.fromEntries(report.plan.map((p) => [p.userId, p]));
    expect(Object.keys(byUser).sort()).toEqual(["u1", "u2"]); // u3 push off, u4 outside its window

    // u1: English morning brief (liquid 1,015,000 / 11 days) + Food budget at 85%.
    expect(byUser.u1.slot).toBe("first");
    expect(byUser.u1.messages[0]).toMatchObject({
      kind: "morning",
      title: "Today's safe-to-spend",
      devices: 2,
      tag: "digest-2026-11-20",
      url: "/dashboard",
    });
    expect(byUser.u1.messages[0].body).toContain("IDR 92,272");
    expect(byUser.u1.messages[1]).toMatchObject({ kind: "budget", threshold: 80, title: "Food budget 80%", devices: 2 });

    // u2 has the digest off: only the budget alert, in Indonesian.
    expect(byUser.u2.slot).toBeNull();
    expect(byUser.u2.messages).toHaveLength(1);
    expect(byUser.u2.messages[0]).toMatchObject({ kind: "budget", threshold: 100, title: "Budget Makan 100%" });
  });

  it("sends once per device and hour, and once per budget threshold", async () => {
    const db = makeDb();
    const first = recordingSender();
    const report = await runDigest({ client: asClient(db), now: NINE_AM_WIB, dry: false, send: first.send });

    expect(report.sent).toBe(5); // u1: 2 digest + 2 budget, u2: 1 budget
    expect(first.calls.map((c) => c.endpoint).sort()).toEqual(
      [
        "https://push.example/e1",
        "https://push.example/e1",
        "https://push.example/e2",
        "https://push.example/e2",
        "https://push.example/e3",
      ].sort(),
    );
    expect(db.rows("notification_digest_logs")).toHaveLength(2);
    expect(db.rows("notification_digest_logs")[0]).toMatchObject({
      user_id: "u1",
      local_date: "2026-11-20",
      local_hour: 9,
      kind: "morning",
    });
    expect(db.rows("budget_notification_logs")).toHaveLength(2);

    const second = recordingSender();
    const again = await runDigest({ client: asClient(db), now: NINE_AM_WIB, dry: false, send: second.send });
    expect(second.send).not.toHaveBeenCalled();
    expect(again.sent).toBe(0);
    expect(again.skippedDuplicates).toBe(4); // 2 devices + 2 budget alerts
  });

  it("deletes subscriptions the push service reports as gone (404/410)", async () => {
    const db = makeDb();
    const { send, calls } = recordingSender({ "https://push.example/e2": 410 });
    const report = await runDigest({ client: asClient(db), now: NINE_AM_WIB, dry: false, send });

    expect(report.removedSubscriptions).toBe(1);
    expect(db.rows("push_subscriptions").map((s) => s.endpoint)).not.toContain("https://push.example/e2");
    // The gone device is not tried again for the budget alert in the same run.
    expect(calls.filter((c) => c.endpoint.endsWith("e2"))).toHaveLength(0);
    expect(report.sent).toBe(3);
    expect(report.failed).toBe(0);
  });

  it("reports other push failures without removing the subscription", async () => {
    const db = makeDb();
    const { send } = recordingSender({ "https://push.example/e1": 500 });
    const report = await runDigest({ client: asClient(db), now: NINE_AM_WIB, dry: false, send });
    expect(report.failed).toBe(2);
    expect(report.errors.join("\n")).toMatch(/failed \(500\)/);
    expect(report.errors.join("\n")).not.toContain("https://push.example/e1"); // endpoints are redacted
    expect(db.rows("push_subscriptions")).toHaveLength(5);
  });

  it("is silent outside every active window (quiet hours)", async () => {
    const db = makeDb();
    const { send } = recordingSender();
    // 16:00 UTC = 23:00 WIB
    const report = await runDigest({ client: asClient(db), now: new Date("2026-11-20T16:00:00Z"), dry: false, send });
    expect(report).toMatchObject({ hour: 23, sent: 0, plan: [] });
    expect(send).not.toHaveBeenCalled();
    expect(db.calls("push_subscriptions", "select")).toHaveLength(0);
  });

  it("rolls the WIB date over at 17:00 UTC", async () => {
    const report = await runDigest({ client: asClient(makeDb()), now: new Date("2026-11-20T17:30:00Z"), dry: true });
    expect(report.date).toBe("2026-11-21");
    expect(report.hour).toBe(0);
  });

  it("honours an hour override (dry runs) and picks the recap for the last slot", async () => {
    const report = await runDigest({ client: asClient(makeDb()), now: NINE_AM_WIB, dry: true, hourOverride: 21 });
    const u1 = report.plan.find((p) => p.userId === "u1")!;
    expect(u1.slot).toBe("last");
    expect(u1.messages[0]).toMatchObject({ kind: "recap", title: "Today's recap" });
    expect(report.plan.map((p) => p.userId)).not.toContain("u4");
  });

  it("hides amounts on the lock screen when hide_amounts is on", async () => {
    const report = await runDigest({
      client: asClient(makeDb({ prefs: { u1: { hide_amounts: true } } })),
      now: NINE_AM_WIB,
      dry: true,
    });
    const u1 = report.plan.find((p) => p.userId === "u1")!;
    expect(u1.messages[0].body).not.toMatch(/IDR|\d/);
  });

  it("skips budget alerts when the budget alerts switch is off, keeping the digest", async () => {
    const db = makeDb({
      prefs: { u1: { reminder_evening_enabled: false }, u2: { reminder_evening_enabled: false } },
    });
    const report = await runDigest({ client: asClient(db), now: NINE_AM_WIB, dry: true });
    const byUser = Object.fromEntries(report.plan.map((p) => [p.userId, p]));
    expect(byUser.u1.messages.map((m) => m.kind)).toEqual(["morning"]);
    expect(byUser.u2).toBeUndefined(); // digest off and budget alerts off: nothing to send
    expect(db.calls("reminder_preferences", "select")[0].columns).toContain("reminder_evening_enabled");
  });

  it("keeps going for other users when one user's data cannot be loaded", async () => {
    const db = makeDb({
      failures: [
        {
          table: "wallets",
          op: "select",
          error: { code: "42703", message: "column wallets.kind does not exist" },
          when: () => true,
          times: 1,
        },
      ],
    });
    const report = await runDigest({ client: asClient(db), now: NINE_AM_WIB, dry: true });
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain('"wallets"');
    expect(report.plan.map((p) => p.userId)).toEqual(["u2"]);
  });

  it("fails loudly when the preferences query fails", async () => {
    const db = makeDb({
      failures: [{ table: "reminder_preferences", op: "select", error: { code: "42703", message: "column reminder_preferences.digest_enabled does not exist" } }],
    });
    await expect(runDigest({ client: asClient(db), now: NINE_AM_WIB, dry: true })).rejects.toThrow(
      /reminder_preferences.*digest_enabled/,
    );
  });

  it("requires a sender for live runs", async () => {
    await expect(runDigest({ client: asClient(makeDb()), now: NINE_AM_WIB, dry: false })).rejects.toThrow(/sender/);
  });
});
