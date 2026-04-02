import { redirect } from "next/navigation";

import { ResetPasswordPanel } from "@/components/auth/reset-password-panel";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return <ResetPasswordPanel />;
}
