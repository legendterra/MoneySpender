import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";

import { APP_NAME, APP_TIMEZONE } from "@/lib/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function getMonthValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: "Konfigurasi VAPID belum lengkap." }, { status: 500 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminSupabaseClient() as any;
  const month = getMonthValue();

  const { data: budgets, error } = await admin
    .from("monthly_budgets")
    .select("user_id,category_id,amount,categories(name)")
    .eq("month", month)
    .gt("amount", 0);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;

  for (const budget of budgets ?? []) {
    const { data: transactions } = await admin
      .from("transactions")
      .select("amount")
      .eq("user_id", budget.user_id)
      .eq("category_id", budget.category_id)
      .eq("type", "expense")
      .gte("transaction_date", `${month}-01`)
      .lte("transaction_date", `${month}-31`);

    const spent = (transactions ?? []).reduce((sum: number, item: { amount: number }) => sum + Number(item.amount ?? 0), 0);
    const ratio = Math.round((spent / Number(budget.amount)) * 100);
    const threshold = ratio >= 100 ? 100 : ratio >= 80 ? 80 : 0;

    if (!threshold) {
      continue;
    }

    const log = await admin
      .from("budget_notification_logs")
      .insert({ user_id: budget.user_id, category_id: budget.category_id, month, threshold })
      .select("id")
      .single();

    if (log.error) {
      continue;
    }

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", budget.user_id);

    for (const subscription of subscriptions ?? []) {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({
          title: `${APP_NAME} | Budget ${threshold}%`,
          body: `${budget.categories?.name ?? "Kategori"} sudah ${ratio}% dari budget bulan ini.`,
          url: "/dashboard",
          tag: `budget-${budget.category_id}-${month}-${threshold}`,
        }),
      ).then(() => {
        sent += 1;
      }).catch(() => undefined);
    }
  }

  return NextResponse.json({ success: true, sent });
}
