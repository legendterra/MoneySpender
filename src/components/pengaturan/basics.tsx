"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { ChoiceList } from "@/components/flat/controls";
import { AmountInput } from "@/components/pengaturan/amount-input";
import { SavingsGoalsPanel } from "@/components/pengaturan/savings-goals-panel";
import { SettingRow, SettingsSection, writeError } from "@/components/pengaturan/section";
import { Button } from "@/components/ui/button";
import { formatMoney, toUiLocale } from "@/components/ui/format";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useIsClient } from "@/components/ui/use-media-query";
import type { AppLocale } from "@/i18n/locales";
import { haptic } from "@/lib/haptics";
import { setAccountLocale } from "@/lib/locale-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ProfileSection({ userId, name, email }: { userId: string; name: string; email: string }) {
  const t = useTranslations("pengaturan");
  const router = useRouter();
  const [value, setValue] = React.useState(name);
  const [saving, setSaving] = React.useState(false);
  const dirty = value.trim() !== name.trim();
  const inputId = React.useId();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const fullName = value.trim();
    if (!fullName) {
      toast.error(t("nameRequired"));
      return;
    }
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("profiles").upsert({ id: userId, full_name: fullName }, { onConflict: "id" });
    if (error) {
      setSaving(false);
      toast.error(t("saveFailed"), { description: writeError("upsert", "profiles.full_name", error) });
      return;
    }
    // The sidebar greeting reads the auth metadata name.
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSaving(false);
    if (authError) toast.error(t("saveFailed"), { description: `Supabase auth.updateUser (full_name) failed: ${authError.message}` });
    else toast.success(t("nameSaved"));
    router.refresh();
  }

  return (
    <SettingsSection id="profil" title={t("profileTitle")} description={t("profileBody")}>
      <form onSubmit={save} className="grid gap-3 pt-2">
        <label htmlFor={inputId} className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-text">{t("nameLabel")}</span>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoComplete="name"
              maxLength={60}
              className="min-w-0 flex-1"
            />
            <Button type="submit" disabled={!dirty} isLoading={saving} className="shrink-0">
              {t("save")}
            </Button>
          </div>
        </label>
        <p className="text-[13px] text-muted">
          {t("emailLabel")} <span className="font-medium text-text">{email}</span>
        </p>
      </form>
    </SettingsSection>
  );
}

export function AppearanceSection() {
  const t = useTranslations("pengaturan");
  const locale = useLocale() as AppLocale;
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();
  const [pendingLocale, setPendingLocale] = React.useState<AppLocale | null>(null);

  async function changeLocale(next: AppLocale) {
    if (next === locale) return;
    setPendingLocale(next);
    const result = await setAccountLocale(next);
    if (!result.ok) {
      toast.error(t("languageFailed"), { description: result.error });
      setPendingLocale(null);
      return;
    }
    window.location.reload();
  }

  const themeValue = (isClient ? theme : "dark") as "dark" | "light" | "system";

  return (
    <SettingsSection id="tampilan" title={t("appearanceTitle")} description={t("appearanceBody")}>
      <div className="grid gap-8">
        <div className="grid gap-1">
          <h3 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">{t("languageLabel")}</h3>
          <ChoiceList
            label={t("languageLabel")}
            value={pendingLocale ?? locale}
            onChange={(next) => void changeLocale(next)}
            disabled={pendingLocale !== null}
            options={[
              { value: "id", label: "Bahasa Indonesia" },
              { value: "en", label: "English" },
            ]}
          />
          <p className="text-[12px] text-muted">{t("languageHint")}</p>
        </div>
        <div className="grid gap-1">
          <h3 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">{t("themeLabel")}</h3>
          <ChoiceList
            label={t("themeLabel")}
            value={themeValue === "light" || themeValue === "system" ? themeValue : "dark"}
            onChange={(next) => setTheme(next)}
            options={[
              { value: "dark", label: t("themeDark") },
              { value: "light", label: t("themeLight") },
              { value: "system", label: t("themeSystem") },
            ]}
          />
          <p className="text-[12px] text-muted">{t("themeHint")}</p>
        </div>
      </div>
    </SettingsSection>
  );
}

export function SavingsSection({
  userId,
  goal,
  reserve,
}: {
  userId: string;
  goal: number;
  reserve: boolean;
}) {
  const t = useTranslations("pengaturan");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const [amount, setAmount] = React.useState(goal);
  const [reserveOn, setReserveOn] = React.useState(reserve);
  const [saving, setSaving] = React.useState<"goal" | "reserve" | null>(null);
  const inputId = React.useId();
  const switchId = React.useId();

  async function update(patch: Record<string, unknown>, column: string) {
    const { error } = await createBrowserSupabaseClient()
      .from("profiles")
      .upsert({ id: userId, ...patch }, { onConflict: "id" });
    if (error) {
      toast.error(t("saveFailed"), { description: writeError("upsert", `profiles.${column}`, error) });
      return false;
    }
    return true;
  }

  async function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    setSaving("goal");
    const ok = await update({ monthly_savings_goal: amount }, "monthly_savings_goal");
    setSaving(null);
    if (!ok) return;
    haptic("success");
    toast.success(amount > 0 ? t("goalSaved", { amount: formatMoney(amount, { locale }) }) : t("goalCleared"));
    router.refresh();
  }

  async function toggleReserve(next: boolean) {
    setReserveOn(next);
    setSaving("reserve");
    const ok = await update({ reserve_savings: next }, "reserve_savings");
    setSaving(null);
    if (!ok) {
      setReserveOn(!next);
      return;
    }
    toast.success(next ? t("reserveOn") : t("reserveOff"));
    router.refresh();
  }

  return (
    <SettingsSection id="tabungan" title={t("savingsTitle")} description={t("savingsBody")}>
      <form onSubmit={saveGoal} className="grid gap-1.5 pt-2 pb-1">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-text">
          {t("goalLabel")}
        </label>
        <div className="flex gap-2">
          <AmountInput id={inputId} value={amount} onChange={setAmount} className="min-w-0 flex-1" />
          <Button type="submit" disabled={amount === goal} isLoading={saving === "goal"} className="shrink-0">
            {t("save")}
          </Button>
        </div>
        <span className="text-xs text-muted">{t("goalHint")}</span>
      </form>
      <div className="mt-4 border-y border-line">
        <SettingRow
          label={t("reserveLabel")}
          hint={t("reserveHint")}
          htmlFor={switchId}
          control={
            <Switch
              id={switchId}
              checked={reserveOn}
              onCheckedChange={(next) => void toggleReserve(next)}
              disabled={saving === "reserve" || goal <= 0}
            />
          }
        />
        {goal <= 0 ? <p className="-mt-1 text-[12px] text-muted">{t("reserveNeedsGoal")}</p> : null}
      </div>
      <SavingsGoalsPanel userId={userId} />
    </SettingsSection>
  );
}
