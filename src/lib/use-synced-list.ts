"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { applyListChange, type ListChange } from "@/lib/list-change";

export type WriteResult<T> = { error: string; item?: undefined } | { error?: undefined; item?: T };

/**
 * Server-rendered list + instant local updates.
 *
 * - `useOptimistic` shows the change while the write is in flight;
 * - on success the change is kept in local state, so nothing flickers while
 *   `router.refresh()` (inside a transition) fetches the new server list;
 * - when the server list arrives (new `items` identity) it replaces local state.
 */
export function useSyncedList<T extends { id: string }>(items: T[], sort?: (a: T, b: T) => number) {
  const router = useRouter();
  const [state, setState] = React.useState({ source: items, list: items });
  let list = state.list;
  if (state.source !== items) {
    // New server data: adopt it (the "adjust state while rendering" pattern).
    list = items;
    setState({ source: items, list: items });
  }

  const [optimistic, addOptimistic] = React.useOptimistic(list, (current: T[], change: ListChange<T>) =>
    applyListChange(current, change, sort),
  );
  const [isPending, startTransition] = React.useTransition();

  /** Runs `write`; returns the error message, or null on success. */
  const mutate = React.useCallback(
    (change: ListChange<T>, write: () => Promise<WriteResult<T>>) =>
      new Promise<string | null>((resolve) => {
        startTransition(async () => {
          addOptimistic(change);
          const result = await write();
          if (result.error) {
            resolve(result.error);
            return;
          }
          const settled: ListChange<T> =
            change.type === "upsert" && result.item
              ? { type: "upsert", item: result.item }
              : change;
          // A new row may come back with its real id: drop the temporary one first.
          setState((current) => {
            let next = current.list;
            if (change.type === "upsert" && result.item && result.item.id !== change.item.id) {
              next = applyListChange(next, { type: "remove", id: change.item.id });
            }
            return { ...current, list: applyListChange(next, settled, sort) };
          });
          startTransition(() => router.refresh());
          resolve(null);
        });
      }),
    [addOptimistic, router, sort],
  );

  return { list: optimistic, mutate, isPending };
}
