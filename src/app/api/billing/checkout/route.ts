import { NextResponse } from "next/server";

import { billingEnabled, createCheckoutUrl, type BillingInterval } from "@/lib/lemonsqueezy";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const { interval } = (await request.json().catch(() => ({}))) as { interval?: string };
  const billingInterval: BillingInterval = interval === "yearly" ? "yearly" : "monthly";

  try {
    const url = await createCheckoutUrl(user.id, user.email, billingInterval);
    if (!url) {
      return NextResponse.json({ error: "Paket ini belum dikonfigurasi." }, { status: 503 });
    }
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membuat sesi pembayaran." }, { status: 502 });
  }
}
