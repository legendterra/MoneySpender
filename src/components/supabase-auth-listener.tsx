"use client";

import { startTransition, useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SupabaseAuthListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_IN" && pathname === "/auth") {
        window.location.assign("/dashboard");
        return;
      }

      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        return;
      }

      if (event === "SIGNED_OUT") {
        window.location.assign("/");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
