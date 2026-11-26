"use client";

// Haptics via navigator.vibrate (Android Chrome). iOS Safari has no Vibration
// API, so every call is a silent no-op there (PLAN.md section 8).

const PATTERNS = {
  tap: 6,
  success: [10, 40, 18],
  warning: [24, 60, 24],
} as const;

export type HapticKind = keyof typeof PATTERNS;

export function haptic(kind: HapticKind = "tap") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate(PATTERNS[kind] as number | number[]);
  } catch {
    // Some browsers throw when vibration is blocked (no user gesture): ignore.
  }
}
