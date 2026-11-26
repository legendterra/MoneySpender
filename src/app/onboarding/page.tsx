import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { OnboardingWizard } from "@/components/onboarding/onboarding-flow";
import { PlainFrame } from "@/components/public/plain-frame";
import { getAuthedContext } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * First run: wallet + opening balance, savings target, notifications.
 * Users who already have a wallet go straight to Beranda, unless they open
 * the guide again on purpose (`?ulang=1`, linked from nowhere by default).
 */
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ ulang?: string }> }) {
  const [{ supabase, user }, { ulang }] = await Promise.all([getAuthedContext(), searchParams]);

  const [wallet, profile] = await Promise.all([
    supabase.from("wallets").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (wallet.error) {
    throw new Error(`Supabase select on "wallets" (onboarding check) failed: ${wallet.error.message}`);
  }
  if (wallet.data && ulang !== "1") redirect("/dashboard");

  const fullName = (profile.data?.full_name as string | null | undefined) ?? user.user_metadata?.full_name ?? "";
  const firstName = String(fullName).trim().split(/\s+/)[0] || user.email?.split("@")[0] || "";

  return (
    <PlainFrame width="sm" logoHref={null}>
      <OnboardingWizard userId={user.id} firstName={firstName} />
    </PlainFrame>
  );
}
