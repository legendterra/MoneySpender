import { cache } from "react";
import { redirect } from "next/navigation";

import {
  DEFAULT_DEBT_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function ensureUserSetup(
  supabase: ServerSupabaseClient,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  },
) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : user.email?.split("@")[0] ?? "Pengguna";

  const defaultCategories = [
    ...DEFAULT_INCOME_CATEGORIES.map((cat) => ({
      user_id: user.id,
      name: cat.name,
      type: "income" as const,
      color: cat.color,
    })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
      user_id: user.id,
      name: cat.name,
      type: "expense" as const,
      color: cat.color,
    })),
    ...DEFAULT_DEBT_CATEGORIES.map((cat) => ({
      user_id: user.id,
      name: cat.name,
      type: "debt" as const,
      color: cat.color,
    })),
  ];

  const [profileCheck, reminderCheck, categoriesCheck] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    supabase
      .from("reminder_preferences")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("categories").select("id").eq("user_id", user.id).limit(1),
  ]);

  if (profileCheck.error || reminderCheck.error || categoriesCheck.error) {
    throw new Error(
      "Gagal menyiapkan data awal user di Supabase. Jalankan schema terbaru dan cek RLS/policies.",
    );
  }

  const writes = [];

  if (!profileCheck.data) {
    writes.push(
      supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName,
        },
        { onConflict: "id" },
      ),
    );
  }

  if (!reminderCheck.data) {
    writes.push(
      supabase.from("reminder_preferences").upsert(
        {
          user_id: user.id,
        },
        { onConflict: "user_id" },
      ),
    );
  }

  if (!(categoriesCheck.data?.length ?? 0)) {
    writes.push(
      supabase.from("categories").upsert(defaultCategories, {
        onConflict: "user_id,name,type",
      }),
    );
  }

  if (!writes.length) {
    return;
  }

  const results = await Promise.all(writes);

  if (results.some((result) => result.error)) {
    throw new Error(
      "Gagal menyiapkan data awal user di Supabase. Jalankan schema terbaru dan cek RLS/policies.",
    );
  }
}

export const getAuthedContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return { supabase, user };
});

export const getWorkspaceIdentity = cache(async () => {
  const { user } = await getAuthedContext();

  return {
    email: user.email ?? "-",
    label:
      user.user_metadata?.full_name ??
      user.email?.split("@")[0]?.replace(/\./g, " ") ??
      "Pengguna",
  };
});
