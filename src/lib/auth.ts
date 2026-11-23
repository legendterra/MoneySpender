import { cache } from "react";
import { redirect } from "next/navigation";

import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/constants";
import { SupabaseQueryError } from "@/lib/supabase/query";
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

  if (profileCheck.error) throw new SupabaseQueryError("profiles", "select", profileCheck.error);
  if (reminderCheck.error) throw new SupabaseQueryError("reminder_preferences", "select", reminderCheck.error);
  if (categoriesCheck.error) throw new SupabaseQueryError("categories", "select", categoriesCheck.error);

  const writes: Array<{ table: string; run: PromiseLike<{ error: { message: string; code?: string } | null }> }> = [];

  if (!profileCheck.data) {
    writes.push({
      table: "profiles",
      run: supabase.from("profiles").upsert({ id: user.id, full_name: fullName }, { onConflict: "id" }),
    });
  }

  if (!reminderCheck.data) {
    writes.push({
      table: "reminder_preferences",
      run: supabase.from("reminder_preferences").upsert({ user_id: user.id }, { onConflict: "user_id" }),
    });
  }

  if (!(categoriesCheck.data?.length ?? 0)) {
    writes.push({
      table: "categories",
      run: supabase.from("categories").upsert(defaultCategories, { onConflict: "user_id,name,type" }),
    });
  }

  if (!writes.length) {
    return;
  }

  const results = await Promise.all(writes.map((write) => write.run));
  results.forEach((result, index) => {
    if (result.error) throw new SupabaseQueryError(writes[index].table, "upsert", result.error);
  });
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
