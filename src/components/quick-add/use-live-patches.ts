"use client";

import * as React from "react";

import { useCatat } from "@/components/quick-add/catat-provider";

const TTL_MS = 60_000;

/**
 * Local changes (a debt payment, a renamed wallet) shown on top of server data
 * until the refreshed page has rendered. `push` records a patch and refreshes
 * the server data in a transition; patches made before that refresh started
 * disappear once it settles, because the server data then contains them.
 */
export function useLivePatches<T>() {
  const { refresh, refreshing, lastRefreshAt } = useCatat();
  const [patches, setPatches] = React.useState<Array<{ at: number; value: T }>>([]);

  const push = React.useCallback(
    (value: T) => {
      const at = Date.now();
      setPatches((list) => [...list.filter((item) => at - item.at < TTL_MS), { at, value }]);
      refresh();
    },
    [refresh],
  );

  const visible = React.useMemo(
    () => (refreshing ? patches : patches.filter((item) => item.at > lastRefreshAt)).map((item) => item.value),
    [patches, refreshing, lastRefreshAt],
  );

  return [visible, push] as const;
}
