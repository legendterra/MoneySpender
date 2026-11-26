"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { TextChoice } from "@/components/flat/controls";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "forgot";
type Method = "password" | "link";
type Sent = { kind: "link" | "reset" | "signup"; email: string } | null;

function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

const textLink =
  "rounded-chip font-semibold text-text underline decoration-line-strong underline-offset-4 outline-none hover:decoration-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function AuthPanel({ initialError }: { initialError?: string | null }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("signin");
  const [method, setMethod] = React.useState<Method>("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [busy, setBusy] = React.useState<"submit" | "google" | null>(null);
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [sent, setSent] = React.useState<Sent>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSent(null);
  }

  async function afterSignIn() {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let destination = "/dashboard";
    if (user) {
      const { data, error: walletError } = await supabase.from("wallets").select("id").eq("user_id", user.id).limit(1);
      if (!walletError && !data?.length) destination = "/onboarding";
    }
    toast.success(t("toastSignedIn"));
    router.replace(destination);
    router.refresh();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const address = email.trim();
    if (!address) {
      setError(t("emailRequired"));
      return;
    }
    const supabase = createBrowserSupabaseClient();
    setBusy("submit");
    try {
      if (mode === "signin" && method === "password") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: address, password });
        if (signInError) {
          setError(
            signInError.code === "invalid_credentials" ? t("wrongCredentials") : t("signInFailed", { message: signInError.message }),
          );
          return;
        }
        await afterSignIn();
        return;
      }
      if (mode === "signin") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: address,
          options: { emailRedirectTo: callbackUrl("/dashboard"), shouldCreateUser: false },
        });
        if (otpError) {
          setError(t("linkFailed", { message: otpError.message }));
          return;
        }
        setSent({ kind: "link", email: address });
        return;
      }
      if (mode === "signup") {
        if (password.length < 8) {
          setError(t("passwordTooShort"));
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: callbackUrl("/onboarding"), data: { full_name: fullName.trim() } },
        });
        if (signUpError) {
          setError(t("signUpFailed", { message: signUpError.message }));
          return;
        }
        if (data.session) {
          router.replace("/onboarding");
          router.refresh();
          return;
        }
        setSent({ kind: "signup", email: address });
        return;
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: callbackUrl("/reset-password"),
      });
      if (resetError) {
        setError(t("resetFailed", { message: resetError.message }));
        return;
      }
      setSent({ kind: "reset", email: address });
    } finally {
      setBusy(null);
    }
  }

  async function google() {
    setError(null);
    setBusy("google");
    const { error: oauthError } = await createBrowserSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl("/dashboard") },
    });
    if (oauthError) {
      setBusy(null);
      setError(t("googleFailed", { message: oauthError.message }));
    }
  }

  if (sent) {
    return (
      <section aria-labelledby="auth-title" className="grid gap-5">
        <Mail className="size-7 text-primary-ink" aria-hidden="true" />
        <div className="grid gap-2">
          <h1 id="auth-title" className="text-[26px] leading-tight font-bold tracking-tight text-text">
            {t("sentTitle")}
          </h1>
          <p className="text-[15px] leading-6 text-muted">
            {t.rich(sent.kind === "reset" ? "sentReset" : sent.kind === "signup" ? "sentSignUp" : "sentLink", {
              email: sent.email,
              b: (chunks) => <strong className="font-semibold text-text">{chunks}</strong>,
            })}
          </p>
          <p className="text-[13px] leading-5 text-muted">{t("sentHint")}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-[14px]">
          <button type="button" className={textLink} onClick={() => setSent(null)}>
            {t("sentRetry")}
          </button>
          <button type="button" className={textLink} onClick={() => switchMode("signin")}>
            {t("backToLogin")}
          </button>
        </div>
      </section>
    );
  }

  const titles: Record<Mode, [string, string]> = {
    signin: [t("signInTitle"), t("signInSubtitle")],
    signup: [t("signUpTitle"), t("signUpSubtitle")],
    forgot: [t("forgotTitle"), t("forgotSubtitle")],
  };
  const submitLabel =
    mode === "signup"
      ? t("signUpButton")
      : mode === "forgot"
        ? t("sendResetButton")
        : method === "link"
          ? t("sendLinkButton")
          : t("signInButton");

  return (
    <section aria-labelledby="auth-title" className="grid gap-6">
      <div className="grid gap-2">
        <h1 id="auth-title" className="text-[28px] leading-tight font-bold tracking-tight text-text">
          {titles[mode][0]}
        </h1>
        <p className="text-[15px] leading-6 text-muted">{titles[mode][1]}</p>
      </div>

      {mode === "signin" ? (
        <TextChoice
          label={t("methodLabel")}
          value={method}
          onChange={(next) => {
            setMethod(next);
            setError(null);
          }}
          options={[
            { value: "password", label: t("methodPassword") },
            { value: "link", label: t("methodLink") },
          ]}
        />
      ) : null}

      <form className="grid gap-4" onSubmit={submit} noValidate>
        {mode === "signup" ? (
          <Field label={t("nameLabel")} optional={t("optional")}>
            <Input
              autoComplete="name"
              placeholder={t("namePlaceholder")}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>
        ) : null}
        <Field label={t("emailLabel")}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            required
          />
        </Field>
        {mode === "signup" || (mode === "signin" && method === "password") ? (
          <Field label={t("passwordLabel")} hint={mode === "signup" ? t("passwordHint") : undefined}>
            <Input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? t("passwordPlaceholderSignUp") : t("passwordPlaceholderSignIn")}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              required
            />
          </Field>
        ) : null}
        {mode === "signin" && method === "link" ? (
          <p className="-mt-1 text-[13px] leading-5 text-muted">{t("linkHint")}</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-[13px] leading-5 font-medium text-expense">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" fullWidth isLoading={busy === "submit"} disabled={busy !== null}>
          {submitLabel}
        </Button>
        {mode === "signin" && method === "password" ? (
          <button type="button" onClick={() => switchMode("forgot")} className={`${textLink} justify-self-start text-[14px]`}>
            {t("forgotLink")}
          </button>
        ) : null}
      </form>

      {mode !== "forgot" ? (
        <div className="grid gap-4">
          <div className="flex items-center gap-3 text-[12px] font-medium text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            {t("or")}
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => void google()}
            isLoading={busy === "google"}
            disabled={busy !== null}
          >
            <GoogleMark />
            {t("googleButton")}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 border-t border-line pt-5 text-[14px] text-muted">
        {mode === "signin" ? (
          <p>
            {t("newHere")}{" "}
            <button type="button" onClick={() => switchMode("signup")} className={textLink}>
              {t("signUpLink")}
            </button>
          </p>
        ) : (
          <p>
            {t("haveAccount")}{" "}
            <button type="button" onClick={() => switchMode("signin")} className={textLink}>
              {t("signInLink")}
            </button>
          </p>
        )}
        <Link
          href="/install"
          className="inline-flex min-h-11 items-center gap-2 justify-self-start font-medium text-text outline-none hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Smartphone className="size-[18px] text-muted" aria-hidden="true" />
          {t("installLink")}
          <ArrowRight className="size-4 text-muted" aria-hidden="true" />
        </Link>
        <a href="https://moneyspender.net" className="justify-self-start text-[13px] text-muted underline-offset-4 hover:underline">
          {t("switchApp")}
        </a>
      </div>
    </section>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}
