"use client";

import * as React from "react";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

import { SettingsSection } from "@/components/pengaturan/section";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { toUiLocale } from "@/components/ui/format";
import { Input } from "@/components/ui/input";
import {
  generateSalt,
  hashPin,
  isPasskeySupported,
  isValidPin,
  markAppLockActive,
  readAppLockConfig,
  registerLocalPasskey,
  writeAppLockConfig,
  type AppLockConfig,
  type AppLockTimeoutMinutes,
} from "@/lib/app-lock";

const TIMEOUTS: AppLockTimeoutMinutes[] = [0, 1, 5, 15];

export function SecuritySection({ email }: { email: string }) {
  const locale = toUiLocale(useLocale());
  const isEn = locale === "en";
  const [config, setConfig] = React.useState<AppLockConfig | null>(null);
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [timeoutMinutes, setTimeoutMinutes] = React.useState<AppLockTimeoutMinutes>(1);
  const [busy, setBusy] = React.useState(false);
  const [passkeySupported, setPasskeySupported] = React.useState(false);

  React.useEffect(() => {
    const existing = readAppLockConfig();
    setConfig(existing);
    if (existing) setTimeoutMinutes(existing.timeoutMinutes);
    setPasskeySupported(isPasskeySupported());
  }, []);

  async function savePin(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidPin(pin)) {
      toast.error(isEn ? "PIN must be 4 to 6 digits." : "PIN harus 4 sampai 6 angka.");
      return;
    }
    if (pin !== confirmPin) {
      toast.error(isEn ? "PIN confirmation does not match." : "Konfirmasi PIN tidak cocok.");
      return;
    }
    setBusy(true);
    try {
      const salt = generateSalt();
      const pinHash = await hashPin(pin, salt);
      const next: AppLockConfig = {
        enabled: true,
        pinHash,
        salt,
        timeoutMinutes,
        passkeyCredentialId: config?.passkeyCredentialId ?? null,
      };
      writeAppLockConfig(next);
      markAppLockActive(Date.now());
      setConfig(next);
      setPin("");
      setConfirmPin("");
      toast.success(isEn ? "App PIN lock enabled on this device." : "Kunci PIN aktif di perangkat ini.");
    } finally {
      setBusy(false);
    }
  }

  function updateTimeout(nextTimeout: AppLockTimeoutMinutes) {
    setTimeoutMinutes(nextTimeout);
    if (!config) return;
    const updated: AppLockConfig = { ...config, timeoutMinutes: nextTimeout };
    writeAppLockConfig(updated);
    setConfig(updated);
    toast.success(isEn ? "Auto-lock timer updated." : "Waktu kunci otomatis diperbarui.");
  }

  async function enablePasskey() {
    if (!config) return;
    setBusy(true);
    try {
      const id = await registerLocalPasskey(email);
      if (!id) {
        toast.error(isEn ? "Device biometrics unavailable." : "Biometrik perangkat tidak tersedia.");
        return;
      }
      const updated: AppLockConfig = { ...config, passkeyCredentialId: id };
      writeAppLockConfig(updated);
      setConfig(updated);
      toast.success(isEn ? "Biometric unlock linked." : "Kunci biometrik terhubung.");
    } catch {
      toast.error(isEn ? "Biometric setup cancelled." : "Pendaftaran biometrik dibatalkan.");
    } finally {
      setBusy(false);
    }
  }

  function disableLock() {
    writeAppLockConfig(null);
    setConfig(null);
    toast.success(isEn ? "App lock turned off." : "Kunci aplikasi dimatikan.");
  }

  return (
    <SettingsSection
      id="keamanan"
      title={isEn ? "Device lock" : "Keamanan perangkat"}
      description={
        isEn
          ? "Protect balances with a local 4–6 digit PIN and optional biometrics on this browser/PWA."
          : "Lindungi saldo di perangkat ini dengan PIN 4–6 angka dan opsional biometrik (Touch ID / sidik jari)."
      }
    >
      <div className="grid gap-6">
        <div className="flex items-center justify-between gap-4 border-y border-line py-3">
          <div className="flex items-center gap-3">
            {config?.enabled ? (
              <ShieldCheck className="size-5 text-income" aria-hidden="true" />
            ) : (
              <Lock className="size-5 text-muted" aria-hidden="true" />
            )}
            <div className="grid">
              <span className="text-[14px] font-semibold text-text">
                {config?.enabled
                  ? isEn
                    ? "PIN lock is active"
                    : "Kunci PIN aktif"
                  : isEn
                    ? "PIN lock is off"
                    : "Kunci PIN nonaktif"}
              </span>
              <span className="text-[12px] text-muted">
                {isEn
                  ? "Stored locally on this device only."
                  : "Tersimpan lokal di perangkat ini saja."}
              </span>
            </div>
          </div>
          {config?.enabled ? (
            <Button variant="ghost" size="sm" className="text-expense hover:text-expense" onClick={disableLock}>
              {isEn ? "Disable" : "Matikan"}
            </Button>
          ) : null}
        </div>

        <form onSubmit={(e) => void savePin(e)} className="grid gap-4">
          <Field label={config?.enabled ? (isEn ? "New PIN (4–6 digits)" : "Ganti PIN (4–6 angka)") : isEn ? "Create PIN (4–6 digits)" : "Buat PIN (4–6 angka)"}>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              placeholder="••••"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </Field>
          <Field label={isEn ? "Confirm PIN" : "Ulangi PIN"}>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              placeholder="••••"
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </Field>

          <div className="grid gap-1.5">
            <span className="text-[13px] font-semibold text-text">
              {isEn ? "Lock automatically after" : "Kunci otomatis setelah"}
            </span>
            <ChipGroup label={isEn ? "Auto-lock timer" : "Waktu kunci otomatis"}>
              {TIMEOUTS.map((minutes) => (
                <Chip
                  key={minutes}
                  variant="choice"
                  selected={timeoutMinutes === minutes}
                  onClick={() => updateTimeout(minutes)}
                >
                  {minutes === 0
                    ? isEn
                      ? "Immediately"
                      : "Segera"
                    : isEn
                      ? `${minutes} min`
                      : `${minutes} menit`}
                </Chip>
              ))}
            </ChipGroup>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" isLoading={busy}>
              {config?.enabled ? (isEn ? "Update PIN" : "Simpan PIN baru") : isEn ? "Enable PIN lock" : "Aktifkan kunci PIN"}
            </Button>
            {config?.enabled && passkeySupported ? (
              <Button type="button" variant="secondary" isLoading={busy} onClick={() => void enablePasskey()}>
                <Fingerprint aria-hidden="true" />
                {config.passkeyCredentialId
                  ? isEn
                    ? "Re-link biometrics"
                    : "Hubungkan ulang biometrik"
                  : isEn
                    ? "Link biometrics / Passkey"
                    : "Aktifkan biometrik / Passkey"}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </SettingsSection>
  );
}
