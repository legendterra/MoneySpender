import { NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/lemonsqueezy";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type WebhookEvent = {
  meta?: {
    event_name?: string;
    custom_data?: { user_id?: string };
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      customer_id?: number;
      renews_at?: string | null;
      ends_at?: string | null;
    };
  };
};

// Status Lemon Squeezy yang masih memberi akses Pro. "cancelled" ikut:
// aksesnya berakhir lewat current_period_end (grace period di resolvePlan).
const ENTITLED_STATUSES = ["active", "on_trial", "past_due", "cancelled"];

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Billing belum diaktifkan." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "Signature tidak valid." }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as WebhookEvent;
  const eventName = event.meta?.event_name ?? "";

  // Hanya event objek subscription; subscription_payment_* punya bentuk lain.
  if (!eventName.startsWith("subscription_") || eventName.startsWith("subscription_payment")) {
    return NextResponse.json({ received: true });
  }

  const userId = event.meta?.custom_data?.user_id;
  const attributes = event.data?.attributes;
  if (!userId || !attributes || !event.data?.id) {
    return NextResponse.json({ received: true });
  }

  const status = attributes.status ?? "inactive";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminSupabaseClient() as any;

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: ENTITLED_STATUSES.includes(status) ? "pro" : "free",
      status,
      provider_customer_id:
        attributes.customer_id != null ? String(attributes.customer_id) : null,
      provider_subscription_id: String(event.data.id),
      current_period_end: attributes.ends_at ?? attributes.renews_at ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Webhook subscriptions upsert gagal:", error);
    return NextResponse.json({ error: "Gagal menyimpan status langganan." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
