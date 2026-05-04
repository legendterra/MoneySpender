"use client";

import { useEffect } from "react";

export function OfflineSnapshotCache({
  name,
  payload,
}: {
  name: string;
  payload: unknown;
}) {
  useEffect(() => {
    window.localStorage.setItem(
      `moneyspender.offline.snapshot.${name}`,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        payload,
      }),
    );
  }, [name, payload]);

  return null;
}
