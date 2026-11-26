"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CatatSheet } from "@/components/quick-add/catat-sheet";
import {
  parseCatatMode,
  type CatatData,
  type CatatMode,
  type CatatOpenOptions,
} from "@/components/quick-add/types";
import type { HistoryEntry, PendingEntry } from "@/lib/history";

type CatatContextValue = {
  /**
   * Open the global Catat sheet, optionally in a given mode (default "expense").
   * `options.preset` pre-fills it (duplicate); `options.editing` turns it into an edit sheet.
   */
  open: (mode?: CatatMode, options?: CatatOpenOptions) => void;
  close: () => void;
  isOpen: boolean;
  /**
   * Rows saved in this tab that the current server page may not include yet.
   * Lists lay them over their data until the refreshed page has rendered.
   */
  pending: PendingEntry[];
  /** After a successful save: show `entry` right away, then refresh the server data. */
  recorded: (entry: HistoryEntry | null, options?: { isNew?: boolean }) => void;
  /** Refresh the server data in a transition (after any mutation). */
  refresh: () => void;
  /** True while a refresh is in flight. */
  refreshing: boolean;
  /** Date.now() of the last refresh start: local patches older than this are in the server data once it settles. */
  lastRefreshAt: number;
};

const noop: CatatContextValue = {
  open: () => undefined,
  close: () => undefined,
  isOpen: false,
  pending: [],
  recorded: () => undefined,
  refresh: () => undefined,
  refreshing: false,
  lastRefreshAt: 0,
};

const CatatContext = React.createContext<CatatContextValue>(noop);

/** Open the Catat sheet from anywhere inside the app shell. No-op outside a provider. */
export function useCatat() {
  return React.useContext(CatatContext);
}

/** Keeps rows saved for this long at most, even if a refresh never settles. */
const PENDING_TTL_MS = 60_000;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * Hosts the global Catat sheet. Opens with `useCatat().open()`, the N key (when not
 * typing and no other dialog is open), or `?catat=expense|income|transfer|debt`.
 */
export function CatatProvider({
  data,
  demo = false,
  children,
}: {
  data: CatatData;
  demo?: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<{
    open: boolean;
    mode: CatatMode;
    session: number;
    options: CatatOpenOptions;
  }>({
    open: false,
    mode: "expense",
    session: 0,
    options: {},
  });

  const open = React.useCallback((mode: CatatMode = "expense", options: CatatOpenOptions = {}) => {
    setState((current) =>
      current.open ? current : { open: true, mode, session: current.session + 1, options },
    );
  }, []);

  const close = React.useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  // Optimistic rows + router.refresh() inside a transition: `refreshing` stays
  // true until the refreshed server components have rendered, so a saved row
  // is visible at once and never blinks out before the real one arrives.
  const router = useRouter();
  const [refreshing, startRefresh] = React.useTransition();
  const [pendingRows, setPendingRows] = React.useState<PendingEntry[]>([]);
  const [lastRefreshAt, setLastRefreshAt] = React.useState(0);

  const refresh = React.useCallback(() => {
    setLastRefreshAt(Date.now());
    startRefresh(() => router.refresh());
  }, [router]);

  const recorded = React.useCallback(
    (entry: HistoryEntry | null, options: { isNew?: boolean } = {}) => {
      if (entry) {
        const at = Date.now();
        setPendingRows((list) => [
          { entry, at, isNew: options.isNew ?? true },
          ...list.filter((item) => item.entry.key !== entry.key && at - item.at < PENDING_TTL_MS),
        ]);
      }
      refresh();
    },
    [refresh],
  );

  // Once a refresh has settled, rows saved before it started are in the server data.
  const pending = React.useMemo(
    () => (refreshing ? pendingRows : pendingRows.filter((item) => item.at > lastRefreshAt)),
    [refreshing, pendingRows, lastRefreshAt],
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "n" && event.key !== "N") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      open("expense");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const value = React.useMemo(
    () => ({ open, close, isOpen: state.open, pending, recorded, refresh, refreshing, lastRefreshAt }),
    [open, close, state.open, pending, recorded, refresh, refreshing, lastRefreshAt],
  );

  return (
    <CatatContext.Provider value={value}>
      {children}
      <CatatSheet
        key={state.session}
        open={state.open}
        onOpenChange={(next) => (next ? open(state.mode, state.options) : close())}
        data={data}
        initialMode={state.mode}
        preset={state.options.preset}
        editing={state.options.editing}
        demo={demo}
        onRecorded={recorded}
      />
      <React.Suspense fallback={null}>
        <CatatUrlTrigger onOpen={open} />
      </React.Suspense>
    </CatatContext.Provider>
  );
}

/** Opens the sheet for `?catat=<mode>` (PWA shortcuts), then removes the parameter. */
function CatatUrlTrigger({ onOpen }: { onOpen: (mode: CatatMode) => void }) {
  const searchParams = useSearchParams();
  const mode = parseCatatMode(searchParams.get("catat"));

  React.useEffect(() => {
    if (!mode) return;
    onOpen(mode);
    const url = new URL(window.location.href);
    url.searchParams.delete("catat");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [mode, onOpen]);

  return null;
}
