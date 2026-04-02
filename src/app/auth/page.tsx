import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth/auth-panel";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AuthPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <AuthPanel />;
}
