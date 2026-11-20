import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { LOCALE_COOKIE } from "@/i18n/locales";
import { buildTestMessage } from "@/lib/digest";
import { fetchProfile } from "@/lib/finance-data";
import { createWebPushSender, sendToSubscriptions, type PushSubscriptionRow } from "@/lib/push";
import { enforceRateLimit } from "@/lib/rate-limit";
import { expectRows } from "@/lib/supabase/query";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Sends a test notification to the signed-in user's own devices only. */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(`push-test:${user.id}`, { limit: 3, windowSeconds: 300 });
  if (limited) return limited;

  try {
    const send = createWebPushSender();
    const subscriptions = expectRows<PushSubscriptionRow>(
      "push_subscriptions",
      await supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", user.id),
    );
    if (!subscriptions.length) {
      return NextResponse.json(
        { error: "No push subscription for this account yet. Turn notifications on first." },
        { status: 404 },
      );
    }

    const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
    const locale = await fetchProfile(supabase, user.id)
      .then((profile) => profile.locale)
      .catch(() => (cookieLocale === "en" ? "en" : "id"));
    const message = buildTestMessage(locale);
    const result = await sendToSubscriptions(
      subscriptions,
      { title: message.title, body: message.body, url: "/dashboard", tag: "moneyspender-test" },
      send,
    );

    if (result.gone.length) {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .in("endpoint", result.gone);
      if (error) console.error(`push_subscriptions delete failed: ${error.message}`);
    }

    return NextResponse.json({
      sent: result.sent,
      removed: result.gone.length,
      failed: result.failed.length,
      errors: result.failed.map((f) => `${f.status}: ${f.message}`),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test notification failed." },
      { status: 500 },
    );
  }
}
