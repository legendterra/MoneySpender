"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

type OfflineTable = "transactions" | "debts";

export type OfflineMutation = {
  id: string;
  table: OfflineTable;
  payload: Record<string, unknown>;
  createdAt: string;
};

const QUEUE_KEY = "moneyspender.offline.queue.v1";

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
  window.dispatchEvent(new CustomEvent("moneyspender:offline-queue-change"));
}

export function getOfflineQueueCount() {
  return readQueue().length;
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

export async function flushOfflineMutations(supabase: SupabaseClient) {
  const queue = readQueue();

  if (!queue.length || typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, remaining: queue.length };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { synced: 0, remaining: queue.length };
  }

  const remaining: OfflineMutation[] = [];
  let synced = 0;

  for (const item of queue) {
    const { error } = await supabase.from(item.table).insert({
      user_id: user.id,
      ...item.payload,
    });

    if (error) {
      remaining.push(item);
    } else {
      synced += 1;
    }
  }

  writeQueue(remaining);
  return { synced, remaining: remaining.length };
}
