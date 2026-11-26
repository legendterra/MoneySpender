"use client";

import * as React from "react";
import { Delete, Fingerprint, Lock } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  isPasskeySupported,
  markAppLockActive,
  readAppLockConfig,
  readAppLockLastActive,
  shouldLockOnResume,
  verifyLocalPasskey,
  verifyPin,
  type AppLockConfig,
} from "@/lib/app-lock";
import { toUiLocale } from "@/components/ui/format";

/**
 * Full-screen flat PIN / Passkey lock overlay.
 * Dormant unless the user explicitly enables App Lock in Pengaturan > Keamanan.
 */
export function AppLockGate() {
  const locale = toUiLocale(useLocale());
  const isEn = locale === "en";
  const [config, setConfig] = React.useState<AppLockConfig | null>(null);
  const [locked, setLocked] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const syncConfig = React.useCallback(() => {
    const next = readAppLockConfig();
    setConfig(next);
    if (!next?.enabled) {
      setLocked(false);
      return;
    }
    const lastActive = readAppLockLastActive();
    if (shouldLockOnResume(lastActive, Date.now(), next.timeoutMinutes)) {
      setLocked(true);
    }
  }, []);

  React.useEffect(() => {
    syncConfig();
    const onConfigChange = () => {
      const next = readAppLockConfig();
      setConfig(next);
      if (!next?.enabled) setLocked(false);
    };
    const onVisibility = () => {
      const current = readAppLockConfig();
      if (!current?.enabled) return;
      if (document.visibilityState === "hidden") {
        markAppLockActive(Date.now());
      } else if (document.visibilityState === "visible") {
        if (shouldLockOnResume(readAppLockLastActive(), Date.now(), current.timeoutMinutes)) {
          setPin("");
          setError(null);
          setLocked(true);
        }
      }
    };
    window.addEventListener("moneyspender:applock-changed", onConfigChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("moneyspender:applock-changed", onConfigChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncConfig]);

  async function submitPin(candidate: string) {
    if (!config || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyPin(candidate, config);
      if (ok) {
        markAppLockActive(Date.now());
        setPin("");
        setLocked(false);
      } else {
        setPin("");
        setError(isEn ? "Wrong PIN. Try again." : "PIN salah. Coba lagi.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function unlockWithPasskey() {
    if (!config?.passkeyCredentialId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyLocalPasskey(config.passkeyCredentialId);
      if (ok) {
        markAppLockActive(Date.now());
        setPin("");
        setLocked(false);
      } else {
        setError(isEn ? "Biometric verification failed." : "Verifikasi biometrik gagal.");
      }
    } catch {
      setError(isEn ? "Biometric cancelled." : "Verifikasi biometrik dibatalkan.");
    } finally {
      setBusy(false);
    }
  }

  function appendDigit(digit: string) {
    if (pin.length >= 6 || busy) return;
    const next = pin + digit;
    setPin(next);
    setError(null);
    if (next.length === 6) {
      void submitPin(next);
    }
  }

  if (!locked || !config) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? "App locked" : "Aplikasi terkunci"}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-bg px-6 py-8"
    >
      <div className="grid w-full max-w-xs gap-6 text-center">
        <div className="grid justify-items-center gap-2">
          <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-primary-ink">
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <h2 className="text-[20px] font-bold text-text">
            {isEn ? "Enter your PIN" : "Masukkan PIN"}
          </h2>
          <p className="text-[13px] text-muted">
            {isEn ? "MoneySpender is locked on this device." : "MoneySpender dikunci di perangkat ini."}
          </p>
        </div>

        <div className="flex justify-center gap-3" aria-live="polite">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <span
              key={idx}
              className={`size-3 rounded-full border transition-colors ${
                idx < pin.length ? "border-primary bg-primary" : "border-line-strong bg-transparent"
              }`}
            />
          ))}
        </div>

        {error ? <p className="text-[13px] font-medium text-expense">{error}</p> : null}

        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => appendDigit(digit)}
              className="flex min-h-14 items-center justify-center rounded-control bg-surface text-[20px] font-semibold text-text transition-colors hover:bg-surface-2 active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={!config.passkeyCredentialId || !isPasskeySupported() || busy}
            onClick={() => void unlockWithPasskey()}
            aria-label={isEn ? "Unlock with biometrics" : "Buka dengan biometrik"}
            className="flex min-h-14 items-center justify-center rounded-control bg-surface text-primary-ink transition-colors hover:bg-surface-2 disabled:opacity-30"
          >
            <Fingerprint className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => appendDigit("0")}
            className="flex min-h-14 items-center justify-center rounded-control bg-surface text-[20px] font-semibold text-text transition-colors hover:bg-surface-2 active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin((cur) => cur.slice(0, -1))}
            aria-label={isEn ? "Backspace" : "Hapus digit"}
            className="flex min-h-14 items-center justify-center rounded-control bg-surface text-muted transition-colors hover:bg-surface-2"
          >
            <Delete className="size-5" aria-hidden="true" />
          </button>
        </div>

        <Button
          size="lg"
          fullWidth
          disabled={pin.length < 4}
          isLoading={busy}
          onClick={() => void submitPin(pin)}
        >
          {isEn ? "Unlock" : "Buka kunci"}
        </Button>
      </div>
    </div>
  );
}
