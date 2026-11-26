import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ResetPasswordPanel } from "@/components/auth/reset-password-panel";
import { PlainFrame } from "@/components/public/plain-frame";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle") };
}

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return (
    <PlainFrame width="sm" center logoHref={null}>
      <ResetPasswordPanel email={user.email ?? ""} />
    </PlainFrame>
  );
}
