import { NextResponse } from "next/server";

import { billingEnabled, getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  if (!billingEnabled()) {
    return NextResponse.json({ error: "Billing belum diaktifkan." }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(`portal:${user.id}`, { limit: 10, windowSeconds: 600 });
  if (limited) return limited;

  const { data } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data?.provider_subscription_id) {
    return NextResponse.json({ error: "Belum ada langganan untuk akun ini." }, { status: 404 });
  }

  try {
    const url = await getCustomerPortalUrl(data.provider_subscription_id);
    if (!url) throw new Error("Portal URL kosong.");
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membuka portal langganan." }, { status: 502 });
  }
}
