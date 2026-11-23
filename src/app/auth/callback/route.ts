import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/i18n/locales";
import { ensureUserSetup } from "@/lib/auth";
import { fetchProfile } from "@/lib/finance-data";
import { safeRedirectPath } from "@/lib/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"), requestUrl.origin);

  let destination = next;
  let locale: string | null = null;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureUserSetup(supabase, user).catch((setupError) => {
          // Setup can recover on a later request; OAuth redirect must still complete.
          console.error("ensureUserSetup failed in /auth/callback:", setupError);
        });

        // The account's language wins over whatever the pre-login cookie said.
        locale = await fetchProfile(supabase, user.id)
          .then((profile) => profile.locale)
          .catch(() => null);

        const { data: existingWallet, error: walletError } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!walletError && !existingWallet) {
          destination = "/onboarding";
        }
      }
    }
  }

  const response = NextResponse.redirect(new URL(destination, requestUrl.origin));
  if (locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }
  return response;
}
