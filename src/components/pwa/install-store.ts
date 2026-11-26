"use client";

import { useEffect, useSyncExternalStore } from "react";

// One place that holds Chrome's deferred `beforeinstallprompt` event, so the
// floating install prompt, Pengaturan and /install can all offer "Instal".
// Pages where the prompt must not float (404) call useSuppressInstallPrompt().

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type InstallSnapshot = {
  /** Chrome/Edge offered installation (Android, desktop). */
  canInstall: boolean;
  /** Installed during this session (appinstalled). */
  installed: boolean;
  /** A page asked to hide the floating prompt. */
  suppressed: boolean;
};

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let suppressCount = 0;
let snapshot: InstallSnapshot = { canInstall: false, installed: false, suppressed: false };
const serverSnapshot: InstallSnapshot = snapshot;
const listeners = new Set<() => void>();

function emit() {
  snapshot = { canInstall: Boolean(deferred), installed, suppressed: suppressCount > 0 };
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );
}

/** Shows the browser's install dialog. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome === "accepted") {
    deferred = null;
    installed = true;
    emit();
  }
  return choice.outcome;
}

/** True when running as the installed app. */
export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

/** Hides the floating install prompt while the calling component is mounted. */
export function useSuppressInstallPrompt() {
  useEffect(() => {
    suppressCount += 1;
    emit();
    return () => {
      suppressCount -= 1;
      emit();
    };
  }, []);
}

export function SuppressInstallPrompt() {
  useSuppressInstallPrompt();
  return null;
}
