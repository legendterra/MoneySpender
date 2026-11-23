"use client";

import * as React from "react";
import { Delete } from "lucide-react";
import { useTranslations } from "next-intl";

import { AMOUNT_MAX_DIGITS, applyKeypadKey, type KeypadKey } from "@/components/ui/keypad-logic";
import { cn } from "@/lib/utils";

export { AMOUNT_MAX_DIGITS, applyKeypadKey, type KeypadKey };

const KEYS: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(6);
    } catch {
      // Unsupported (iOS): silently skip.
    }
  }
}

/**
 * Digit keypad for rupiah amounts: 1-9, 000, 0, backspace (long-press clears).
 * With `captureKeyboard`, a physical keyboard works too: digits type, Backspace deletes,
 * Delete clears, Enter submits. Keys typed into inputs are ignored.
 */
export function AmountKeypad({
  value,
  onChange,
  onSubmit,
  maxDigits = AMOUNT_MAX_DIGITS,
  captureKeyboard = false,
  disabled = false,
  labels,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  onSubmit?: () => void;
  maxDigits?: number;
  captureKeyboard?: boolean;
  disabled?: boolean;
  /** Override the translated accessible labels. */
  labels?: { backspace?: string; keypad?: string; clearHint?: string };
  className?: string;
}) {
  const t = useTranslations("ui");
  const text = {
    backspace: labels?.backspace ?? t("backspace"),
    keypad: labels?.keypad ?? t("keypad"),
    clearHint: labels?.clearHint ?? t("clearHint"),
  };
  const valueRef = React.useRef(value);
  const longPress = React.useRef<number | null>(null);
  const cleared = React.useRef(false);

  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const press = React.useCallback(
    (key: KeypadKey) => {
      if (disabled) return;
      const next = applyKeypadKey(valueRef.current, key, maxDigits);
      valueRef.current = next;
      onChange(next);
    },
    [disabled, maxDigits, onChange],
  );

  React.useEffect(() => {
    if (!captureKeyboard || disabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        press(event.key as KeypadKey);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        press("back");
      } else if (event.key === "Delete") {
        event.preventDefault();
        press("clear");
      } else if (event.key === "Enter" && onSubmit) {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === "BUTTON") return;
        event.preventDefault();
        onSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [captureKeyboard, disabled, onSubmit, press]);

  function startLongPress() {
    cleared.current = false;
    longPress.current = window.setTimeout(() => {
      cleared.current = true;
      press("clear");
      haptic();
    }, 550);
  }

  function endLongPress() {
    if (longPress.current) window.clearTimeout(longPress.current);
    longPress.current = null;
  }

  return (
    <div
      role="group"
      aria-label={text.keypad}
      className={cn("grid grid-cols-3 gap-2 tabular-nums", className)}
    >
      {KEYS.map((key) => {
        const isBack = key === "back";
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-label={isBack ? text.backspace : key}
            title={isBack ? text.clearHint : undefined}
            onPointerDown={isBack ? startLongPress : undefined}
            onPointerUp={isBack ? endLongPress : undefined}
            onPointerLeave={isBack ? endLongPress : undefined}
            onPointerCancel={isBack ? endLongPress : undefined}
            onContextMenu={isBack ? (event) => event.preventDefault() : undefined}
            onClick={() => {
              if (isBack && cleared.current) {
                cleared.current = false;
                return;
              }
              haptic();
              press(key);
            }}
            className={cn(
              "grid h-[52px] select-none place-items-center rounded-control bg-surface-2 text-[20px] font-semibold text-text transition-[background-color,transform] duration-100 outline-none touch-manipulation active:scale-[0.97] active:bg-line focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-40",
              key === "000" && "text-[17px]",
              isBack && "text-muted",
            )}
          >
            {isBack ? <Delete className="size-[22px]" aria-hidden="true" /> : key}
          </button>
        );
      })}
    </div>
  );
}
