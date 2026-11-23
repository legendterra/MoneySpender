"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Check, CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { AmountDisplay } from "@/components/ui/amount-display";
import { AmountKeypad } from "@/components/ui/amount-keypad";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { formatMoney, toUiLocale } from "@/components/ui/format";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { haptic } from "@/lib/haptics";
import { pushReadiness, readPushEnvironment } from "@/lib/notification-settings";
import {
  SAVINGS_PRESETS,
  WALLET_KINDS,
  WALLET_PRESETS,
  buildWalletRow,
  validateFirstWallet,
  validateSavingsTarget,
} from "@/lib/onboarding";
import { enablePush } from "@/lib/push-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { WalletKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<WalletKind, typeof Wallet> = {
  cash: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
  card: CreditCard,
  other: Wallet,
};

type Step = 1 | 2 | 3;

export function OnboardingWizard({ userId, firstName }: { userId: string; firstName: string }) {
  const t = useTranslations("onboarding");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(1);
  const [walletId, setWalletId] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<WalletKind>("cash");
  const [name, setName] = React.useState("Tunai");
  const [balance, setBalance] = React.useState(0);
  const [goal, setGoal] = React.useState(0);
  const [reserve, setReserve] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pushNote, setPushNote] = React.useState<string | null>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function goTo(next: Step) {
    setError(null);
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  function pickKind(next: WalletKind) {
    const presetNames = Object.values(WALLET_PRESETS).flat();
    setKind(next);
    // Replace the name only while it is still a preset (never overwrite what the user typed).
    if (!name.trim() || presetNames.includes(name.trim())) setName(WALLET_PRESETS[next][0]);
  }

  async function saveWallet() {
    const input = { name, kind, openingBalance: balance };
    const issue = validateFirstWallet(input);
    if (issue) {
      setError(t(`walletIssue_${issue}`));
      return;
    }
    setBusy("wallet");
    const supabase = createBrowserSupabaseClient();
    const row = buildWalletRow(userId, input);
    const result = walletId
      ? await supabase.from("wallets").update(row).eq("id", walletId).eq("user_id", userId).select("id").single()
      : await supabase.from("wallets").insert(row).select("id").single();
    setBusy(null);
    if (result.error) {
      setError(`Supabase ${walletId ? "update" : "insert"} on "wallets" failed: ${result.error.message}`);
      return;
    }
    setWalletId(String(result.data.id));
    haptic("success");
    goTo(2);
  }

  async function saveGoal(amount: number) {
    if (validateSavingsTarget(amount)) {
      setError(t("goalInvalid"));
      return;
    }
    setBusy(amount === 0 && !reserve ? "skip" : "goal");
    const { error: saveError } = await createBrowserSupabaseClient()
      .from("profiles")
      .upsert(
        { id: userId, monthly_savings_goal: amount, reserve_savings: amount > 0 ? reserve : false },
        { onConflict: "id" },
      );
    setBusy(null);
    if (saveError) {
      setError(`Supabase upsert on "profiles.monthly_savings_goal" failed: ${saveError.message}`);
      return;
    }
    haptic("tap");
    goTo(3);
  }

  async function turnOnPush() {
    setPushNote(null);
    const readiness = pushReadiness(readPushEnvironment());
    if (readiness === "ios-install") {
      setPushNote(t("pushIosInstall"));
      return;
    }
    setBusy("push");
    const result = await enablePush();
    setBusy(null);
    if (result.ok) {
      haptic("success");
      toast.success(t("pushOn"));
      finish();
      return;
    }
    const notes: Record<string, string> = {
      denied: t("pushDenied"),
      dismissed: t("pushDismissed"),
      unsupported: t("pushUnsupported"),
      "no-key": t("pushNoKey"),
    };
    setPushNote(notes[result.reason] ?? result.message ?? t("pushFailed"));
  }

  function finish() {
    setBusy("finish");
    router.replace("/dashboard");
    router.refresh();
  }

  const KindIcon = KIND_ICONS[kind];

  return (
    <div className="grid gap-6 pt-2 md:pt-6">
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-[12px] font-semibold text-muted">
          <span>{t("stepOf", { step, total: 3 })}</span>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => goTo((step - 1) as Step)}
              className="-mr-2 min-h-11 rounded-chip px-2 text-[13px] font-semibold text-muted outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t("back")}
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((index) => (
            <span
              key={index}
              className={cn("h-[3px] rounded-full transition-colors", index <= step ? "bg-text" : "bg-line")}
            />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <section aria-labelledby="ob-title" className="grid gap-5">
          <header className="grid gap-1.5">
            <h1 id="ob-title" ref={headingRef} tabIndex={-1} className="text-[26px] leading-tight font-bold tracking-tight text-text outline-none">
              {t("walletTitle", { name: firstName || "__none__" })}
            </h1>
            <p className="text-[14px] leading-6 text-muted">{t("walletBody")}</p>
          </header>
          <ChipGroup label={t("walletKind")}>
            {WALLET_KINDS.map((option) => (
              <Chip key={option} icon={KIND_ICONS[option]} selected={kind === option} onClick={() => pickKind(option)}>
                {t(`kind_${option}`)}
              </Chip>
            ))}
          </ChipGroup>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold text-text">{t("walletName")}</span>
            <div className="relative">
              <KindIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                maxLength={40}
                className="pl-10"
                autoComplete="off"
              />
            </div>
          </label>
          {WALLET_PRESETS[kind].length > 1 ? (
            <ChipGroup label={t("walletSuggestions")} scroll className="-mt-2">
              {WALLET_PRESETS[kind].map((preset) => (
                <Chip key={preset} variant="meta" onClick={() => setName(preset)} selected={name === preset}>
                  {preset}
                </Chip>
              ))}
            </ChipGroup>
          ) : null}
          <div className="grid gap-3 border-t border-line pt-5">
            <div className="grid gap-0.5 text-center">
              <span className="text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">{t("balanceLabel")}</span>
              <AmountDisplay value={balance} placeholder label={t("balanceLabel")} />
              <span className="text-[12px] text-muted">{t("balanceHint")}</span>
            </div>
            <AmountKeypad value={balance} onChange={setBalance} onSubmit={() => void saveWallet()} captureKeyboard={step === 1} />
          </div>
          {error ? <ErrorNote message={error} /> : null}
          <Button size="lg" fullWidth onClick={() => void saveWallet()} isLoading={busy === "wallet"}>
            {t("continue")}
          </Button>
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="ob-title" className="grid gap-5">
          <header className="grid gap-1.5">
            <h1 id="ob-title" ref={headingRef} tabIndex={-1} className="text-[26px] leading-tight font-bold tracking-tight text-text outline-none">
              {t("goalTitle")}
            </h1>
            <p className="text-[14px] leading-6 text-muted">{t("goalBody")}</p>
          </header>
          <div className="grid gap-3">
            <div className="grid gap-0.5 text-center">
              <span className="text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">{t("goalLabel")}</span>
              <AmountDisplay value={goal} placeholder label={t("goalLabel")} />
            </div>
            <ChipGroup label={t("goalPresets")} className="justify-center">
              {SAVINGS_PRESETS.map((preset) => (
                <Chip key={preset} selected={goal === preset} onClick={() => setGoal(preset)}>
                  {preset === 0 ? t("goalNone") : formatMoney(preset, { locale, compact: true })}
                </Chip>
              ))}
            </ChipGroup>
            <AmountKeypad value={goal} onChange={setGoal} onSubmit={() => void saveGoal(goal)} captureKeyboard={step === 2} />
          </div>
          <label className={cn("flex items-center gap-4 border-y border-line py-3.5", goal <= 0 && "opacity-55")}>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-[14px] font-medium text-text">{t("reserveLabel")}</span>
              <span className="text-[12px] leading-[18px] text-muted">{t("reserveHint")}</span>
            </span>
            <Switch checked={goal > 0 && reserve} onCheckedChange={setReserve} disabled={goal <= 0} label={t("reserveLabel")} />
          </label>
          {error ? <ErrorNote message={error} /> : null}
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="ghost" size="lg" onClick={() => void saveGoal(0)} isLoading={busy === "skip"} disabled={busy !== null}>
              {t("skip")}
            </Button>
            <Button size="lg" onClick={() => void saveGoal(goal)} isLoading={busy === "goal"} disabled={busy !== null}>
              {goal > 0 ? t("saveGoal") : t("continue")}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section aria-labelledby="ob-title" className="grid gap-5">
          <header className="grid gap-1.5">
            <h1 id="ob-title" ref={headingRef} tabIndex={-1} className="text-[26px] leading-tight font-bold tracking-tight text-text outline-none">
              {t("pushTitle")}
            </h1>
            <p className="text-[14px] leading-6 text-muted">{t("pushBody")}</p>
          </header>
          <ul className="divide-y divide-line border-y border-line">
            {(["pushMorning", "pushMidday", "pushEvening"] as const).map((key) => (
              <li key={key} className="flex gap-3 py-3 text-[14px] leading-6">
                <Check className="mt-1 size-4 shrink-0 text-income" aria-hidden="true" />
                <span className="text-muted">{t.rich(key, { b: (chunks) => <strong className="font-semibold text-text">{chunks}</strong> })}</span>
              </li>
            ))}
          </ul>
          <p className="text-[12px] leading-[18px] text-muted">{t("pushQuiet")}</p>
          {pushNote ? (
            <div role="status" className="border-l-2 border-debt pl-3 text-[13px] leading-5 text-text">
              {pushNote}{" "}
              <Link href="/install" className="font-semibold underline underline-offset-2">
                {t("installGuide")}
              </Link>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Button size="lg" fullWidth onClick={() => void turnOnPush()} isLoading={busy === "push"} disabled={busy !== null}>
              {t("pushButton")}
            </Button>
            <Button variant="ghost" size="lg" fullWidth onClick={finish} isLoading={busy === "finish"} disabled={busy === "push"}>
              {t("pushLater")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="text-[13px] leading-5 font-medium text-expense">
      {message}
    </p>
  );
}
