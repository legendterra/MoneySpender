import { NextResponse, type NextRequest } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { endpoint } = (await request.json()) as { endpoint?: string };

  // Validate endpoint
  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing push subscription endpoint" },
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

  // Delete subscription and log the action
  const { error, count } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ 
    success: true, 
    deleted: count,
    message: `Unsubscribed from ${endpoint}`
  });
}
