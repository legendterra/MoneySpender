import { NextResponse } from "next/server";

import { billingEnabled, createCheckoutUrl } from "@/lib/lemonsqueezy";
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

  const limited = await enforceRateLimit(`checkout:${user.id}`, { limit: 10, windowSeconds: 600 });
  if (limited) return limited;

  try {
    const url = await createCheckoutUrl(user.id, user.email);
    if (!url) throw new Error("Checkout URL kosong.");
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membuat sesi pembayaran." }, { status: 502 });
  }
}
