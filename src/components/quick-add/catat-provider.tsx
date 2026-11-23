"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { CatatSheet } from "@/components/quick-add/catat-sheet";
import {
  parseCatatMode,
  type CatatData,
  type CatatMode,
  type CatatOpenOptions,
} from "@/components/quick-add/types";

type CatatContextValue = {
  /**
   * Open the global Catat sheet, optionally in a given mode (default "expense").
   * `options.preset` pre-fills it (duplicate); `options.editing` turns it into an edit sheet.
   */
  open: (mode?: CatatMode, options?: CatatOpenOptions) => void;
  close: () => void;
  isOpen: boolean;
};

const noop: CatatContextValue = { open: () => undefined, close: () => undefined, isOpen: false };

const CatatContext = React.createContext<CatatContextValue>(noop);

/** Open the Catat sheet from anywhere inside the app shell. No-op outside a provider. */
export function useCatat() {
  return React.useContext(CatatContext);
}

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

  const value = React.useMemo(() => ({ open, close, isOpen: state.open }), [open, close, state.open]);

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
