import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  discardOfflineMutation,
  enqueueOfflineMutation,
  flushOfflineMutations,
  getOfflineQueue,
  isTransientSyncError,
  retryOfflineMutation,
} from "@/lib/offline-queue";

type InsertResult = { error: { message: string; code?: string } | null };

function fakeClient(results: InsertResult[]) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return results.shift() ?? { error: null };
      },
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, inserts };
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
    dispatchEvent: () => true,
  });
  vi.stubGlobal("navigator", { onLine: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const expense = {
  amount: 25_000,
  type: "expense",
  category_id: "c1",
  wallet_id: "w-cash",
  wallet_label: "Tunai",
  transaction_date: "2026-11-20",
  reason: "Kopi",
};

describe("offline queue", () => {
  it("keeps wallet_id and wallet_label when syncing", async () => {
    enqueueOfflineMutation("transactions", expense);
    const { client, inserts } = fakeClient([]);
    const result = await flushOfflineMutations(client);

    expect(result).toEqual({ synced: 1, remaining: 0, failed: [] });
    expect(inserts[0]).toEqual({ table: "transactions", row: { ...expense, user_id: "u1" } });
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("marks Supabase rejections as failed, keeps them, and stops retrying them automatically", async () => {
    enqueueOfflineMutation("transactions", expense);
    const { client, inserts } = fakeClient([
      { error: { code: "23514", message: 'new row violates check constraint "transactions_amount_check"' } },
    ]);

    const first = await flushOfflineMutations(client);
    expect(first.synced).toBe(0);
    expect(first.failed).toHaveLength(1);
    expect(first.failed[0].lastError).toMatchObject({ code: "23514" });
    expect(first.failed[0].lastError?.message).toContain('insert on "transactions" failed');

    const second = await flushOfflineMutations(client);
    expect(inserts).toHaveLength(1); // not retried silently
    expect(second.failed).toHaveLength(1);
  });

  it("retries network errors on the next flush", async () => {
    enqueueOfflineMutation("debts", { amount: 10_000, direction: "payable" });
    const { client, inserts } = fakeClient([{ error: { code: "", message: "TypeError: Failed to fetch" } }]);

    const first = await flushOfflineMutations(client);
    expect(first).toMatchObject({ synced: 0, remaining: 1, failed: [] });
    const second = await flushOfflineMutations(client);
    expect(second).toMatchObject({ synced: 1, remaining: 0 });
    expect(inserts).toHaveLength(2);
  });

  it("lets the user retry or discard a failed item", async () => {
    enqueueOfflineMutation("transactions", expense);
    enqueueOfflineMutation("transactions", { ...expense, amount: 1 });
    const { client } = fakeClient([
      { error: { code: "42703", message: "column x does not exist" } },
      { error: { code: "42703", message: "column x does not exist" } },
    ]);
    await flushOfflineMutations(client);
    const [a, b] = getOfflineQueue();

    expect(await retryOfflineMutation(client, a.id)).toBeNull();
    discardOfflineMutation(b.id);
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("does nothing while offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    enqueueOfflineMutation("transactions", expense);
    const { client, inserts } = fakeClient([]);
    expect(await flushOfflineMutations(client)).toMatchObject({ synced: 0, remaining: 1 });
    expect(inserts).toHaveLength(0);
  });

  it("classifies transient vs permanent errors", () => {
    expect(isTransientSyncError({ code: "" })).toBe(true);
    expect(isTransientSyncError({ code: null })).toBe(true);
    expect(isTransientSyncError({ code: "PGRST301" })).toBe(true); // expired JWT
    expect(isTransientSyncError({ code: "08006" })).toBe(true);
    expect(isTransientSyncError({ code: "23505" })).toBe(false);
    expect(isTransientSyncError({ code: "42703" })).toBe(false);
    expect(isTransientSyncError({ code: "22P02" })).toBe(false);
  });
});
