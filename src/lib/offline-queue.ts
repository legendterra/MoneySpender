"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

type OfflineTable = "transactions" | "debts";

export type OfflineMutationError = {
  message: string;
  code: string | null;
  at: string;
};

export type OfflineMutation = {
  id: string;
  table: OfflineTable;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts?: number;
  lastError?: OfflineMutationError;
  /** Rejected by Supabase (e.g. constraint/schema error): kept until the user retries or discards it. */
  failed?: boolean;
};

export type FlushResult = {
  synced: number;
  remaining: number;
  /** Items that failed permanently, including ones from earlier flushes. */
  failed: OfflineMutation[];
};

const QUEUE_KEY = "moneyspender.offline.queue.v1";
export const OFFLINE_QUEUE_EVENT = "moneyspender:offline-queue-change";

function readQueue() {
  if (typeof window === "undefined") {
    return [] as OfflineMutation[];
  }

  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineMutation[]) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
}

/**
 * Network failures (no code), expired JWTs (PGRST3xx) and Postgres
 * connection/resource errors are retried automatically; everything else
 * (constraint violations, missing columns, bad enum values) will fail again.
 */
export function isTransientSyncError(error: { code?: string | null }) {
  const code = error.code ?? "";
  return !code || /^(PGRST3|08|40|53|57)/.test(code);
}

export function getOfflineQueue() {
  return readQueue();
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

export function getFailedOfflineMutations() {
  return readQueue().filter((item) => item.failed);
}

export function enqueueOfflineMutation(table: OfflineTable, payload: Record<string, unknown>) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  writeQueue([
    ...readQueue(),
    {
      id,
      table,
      payload,
      createdAt: new Date().toISOString(),
    },
  ]);
}

export function discardOfflineMutation(id: string) {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

async function insertItem(supabase: SupabaseClient, userId: string, item: OfflineMutation) {
  // wallet_id/wallet_label stay in the payload: wallet balances depend on them.
  const { error } = await supabase.from(item.table).insert({ ...item.payload, user_id: userId });
  return error;
}

function withError(item: OfflineMutation, error: { message: string; code?: string | null }): OfflineMutation {
  return {
    ...item,
    attempts: (item.attempts ?? 0) + 1,
    failed: !isTransientSyncError(error),
    lastError: {
      message: `Supabase insert on "${item.table}" failed: ${error.message}`,
      code: error.code || null,
      at: new Date().toISOString(),
    },
  };
}

/** Syncs pending items. Permanently failed items are skipped until retried. */
export async function flushOfflineMutations(supabase: SupabaseClient): Promise<FlushResult> {
  const queue = readQueue();
  const failedBefore = queue.filter((item) => item.failed);

  if (!queue.length || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    return { synced: 0, remaining: queue.length, failed: failedBefore };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { synced: 0, remaining: queue.length, failed: failedBefore };
  }

  const remaining: OfflineMutation[] = [];
  let synced = 0;

  for (const item of queue) {
    if (item.failed) {
      remaining.push(item);
      continue;
    }
    const error = await insertItem(supabase, user.id, item);
    if (error) {
      remaining.push(withError(item, error));
    } else {
      synced += 1;
    }
  }

  writeQueue(remaining);
  return { synced, remaining: remaining.length, failed: remaining.filter((item) => item.failed) };
}

/** Retries one item (also a permanently failed one). Returns the error message, or null on success. */
export async function retryOfflineMutation(supabase: SupabaseClient, id: string): Promise<string | null> {
  const item = readQueue().find((entry) => entry.id === id);
  if (!item) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Sesi login berakhir. Masuk lagi lalu coba ulang.";

  const error = await insertItem(supabase, user.id, item);
  const queue = readQueue();
  if (!error) {
    writeQueue(queue.filter((entry) => entry.id !== id));
    return null;
  }
  const updated = withError(item, error);
  writeQueue(queue.map((entry) => (entry.id === id ? updated : entry)));
  return updated.lastError?.message ?? error.message;
}
