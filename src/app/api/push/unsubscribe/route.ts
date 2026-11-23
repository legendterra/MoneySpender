import { NextResponse, type NextRequest } from "next/server";

import { readJsonBody } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await readJsonBody<{ endpoint?: unknown }>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }
  const { endpoint } = body.data;

  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ error: "Missing push subscription endpoint" }, { status: 400 });
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

  const { error, count } = await supabase
    .from("push_subscriptions")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: `Supabase delete on "push_subscriptions" failed: ${error.message}` }, { status: 400 });
  }

  return NextResponse.json({ success: true, deleted: count ?? 0 });
}
