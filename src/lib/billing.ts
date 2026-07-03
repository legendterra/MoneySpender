import { cache } from "react";
import { NextResponse } from "next/server";

import { billingEnabled } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Plan = "free" | "pro";

export type SubscriptionRow = {
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Fitur yang dikunci untuk paket Free. */
export const PRO_FEATURES = {
  importExport: "Import & export Excel/CSV",
  recurring: "Transaksi berulang otomatis",
  budgetAlerts: "Notifikasi budget",
  auditLog: "Audit log aktivitas",
} as const;

export function resolvePlan(subscription: SubscriptionRow | null): Plan {
  // Billing belum dikonfigurasi → semua fitur terbuka, perilaku sama seperti
  // sebelum ada paket berbayar.
  if (!billingEnabled()) return "pro";
  if (!subscription || subscription.plan !== "pro") return "free";

  if (subscription.status === "active" || subscription.status === "trialing") {
    return "pro";
  }
  // Grace period: langganan yang berakhir/nunggak tetap Pro sampai akhir
  // periode yang sudah dibayar.
  if (
    subscription.current_period_end &&
    new Date(subscription.current_period_end) > new Date()
  ) {
    return "pro";
  }
  return "free";
}

export async function getPlanForUser(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<Plan> {
  if (!billingEnabled()) return "pro";
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,stripe_customer_id,stripe_subscription_id,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return resolvePlan(data as SubscriptionRow | null);
}

/** Plan user yang sedang login — di-cache per request. */
export const getCurrentPlan = cache(async (): Promise<Plan> => {
  if (!billingEnabled()) return "pro";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "free";
  return getPlanForUser(supabase, user.id);
});

/**
 * Untuk cron: dari daftar user id, kembalikan subset yang berhak Pro.
 * Saat billing nonaktif semua user dianggap Pro (set dikembalikan utuh).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function filterProUserIds(admin: any, userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds)];
  if (!billingEnabled() || unique.length === 0) return new Set(unique);

  const { data } = await admin
    .from("subscriptions")
    .select("user_id,plan,status,stripe_customer_id,stripe_subscription_id,current_period_end")
    .in("user_id", unique);

  const pro = new Set<string>();
  for (const row of (data ?? []) as Array<SubscriptionRow & { user_id: string }>) {
    if (resolvePlan(row) === "pro") pro.add(row.user_id);
  }
  return pro;
}

/**
 * Guard route API berbayar. Mengembalikan response 402 untuk user Free,
 * atau null jika boleh lanjut.
 */
export async function requirePro(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<NextResponse | null> {
  const plan = await getPlanForUser(supabase, userId);
  if (plan === "pro") return null;
  return NextResponse.json(
    { error: "Fitur ini khusus paket Pro. Upgrade di halaman /pricing.", code: "pro_required" },
    { status: 402 },
  );
}
