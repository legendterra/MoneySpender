import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthPanel } from "@/components/auth/auth-panel";
import { PlainFrame } from "@/components/public/plain-frame";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("metaTitle") };
}

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const [
    {
      data: { user },
    },
    { error },
    t,
  ] = await Promise.all([supabase.auth.getUser(), searchParams, getTranslations("auth")]);

  if (user) redirect("/dashboard");

  return (
    <PlainFrame width="sm" center logoHref="/">
      <AuthPanel initialError={error === "link" ? t("linkExpired") : null} />
    </PlainFrame>
  );
}
