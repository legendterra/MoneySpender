import { NextResponse, type NextRequest } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PushSubscriptionPayload = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: NextRequest) {
  const subscription = (await request.json()) as PushSubscriptionPayload;

  // Validate subscription payload
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    return NextResponse.json(
      { error: "Invalid push subscription data" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(`push:${user.id}`, { limit: 10, windowSeconds: 60 });
  if (limited) return limited;

  // Store subscription with metadata for debugging
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: request.headers.get("user-agent"),
      created_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, endpoint: subscription.endpoint });
}
