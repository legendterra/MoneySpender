import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getAuthedContext } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Setup Awal",
  description: "Atur dompet pertamamu sebelum mulai mencatat keuangan.",
};

export default async function OnboardingPage() {
  const { user } = await getAuthedContext();

  // If user already has wallets, skip onboarding
  const supabase = await createServerSupabaseClient();
  const { data: existingWallet } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingWallet) {
    redirect("/dashboard");
  }

  return <OnboardingWizard userName={user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Pengguna"} />;
}
