import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureUserSetup } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/dashboard";
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureUserSetup(supabase, user).catch(() => {
          // Setup can recover on a later request; OAuth redirect must still complete.
        });

        // Check if user has set up wallets — if not, redirect to onboarding
        const { data: existingWallet } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!existingWallet) {
          return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
