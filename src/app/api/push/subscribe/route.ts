import { NextResponse, type NextRequest } from "next/server";

import { readJsonBody } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PushSubscriptionPayload = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

export async function POST(request: NextRequest) {
  const body = await readJsonBody<PushSubscriptionPayload>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }
  const subscription = body.data;
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || typeof p256dh !== "string" || !p256dh || typeof auth !== "string" || !auth) {
    return NextResponse.json(
      { error: "Invalid push subscription: endpoint (https URL), keys.p256dh and keys.auth are required." },
      { status: 400 },
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

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent"),
      created_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: `Supabase upsert on "push_subscriptions" failed: ${error.message}` }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
