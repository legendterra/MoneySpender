"use client";

import { startTransition, useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SupabaseAuthListener() {
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
