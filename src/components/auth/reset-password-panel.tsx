"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/** New password after the reset link (the callback already signed the user in). */
export function ResetPasswordPanel({ email }: { email: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    setBusy(true);
    const { error: updateError } = await createBrowserSupabaseClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(t("updatePasswordFailed", { message: updateError.message }));
      return;
    }
    toast.success(t("passwordUpdated"));
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <section aria-labelledby="reset-title" className="grid gap-6">
      <div className="grid gap-2">
        <h1 id="reset-title" className="text-[28px] leading-tight font-bold tracking-tight text-text">
          {t("resetTitle")}
        </h1>
        <p className="text-[15px] leading-6 text-muted">
          {t.rich("resetSubtitle", { email, b: (chunks) => <strong className="font-semibold text-text">{chunks}</strong> })}
        </p>
      </div>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field label={t("newPasswordLabel")} hint={t("passwordHint")}>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label={t("confirmPasswordLabel")}>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              setError(null);
            }}
          />
        </Field>
        {error ? (
          <p role="alert" className="text-[13px] leading-5 font-medium text-expense">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" fullWidth isLoading={busy}>
          {t("savePasswordButton")}
        </Button>
      </form>
    </section>
  );
}
