import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";

import { APP_NAME, APP_TIMEZONE } from "@/lib/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Slot = "morning" | "evening";
type QueryError = { message: string; code?: string };
type QueryResult<T> = { data: T | null; error: QueryError | null };
type PreferenceRow = { user_id: string };
type SubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export const runtime = "nodejs";

function getDateInJakarta(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function getCopy(slot: Slot) {
  return slot === "morning"
    ? {
        title: `${APP_NAME} | Reminder Pagi`,
        body: "Selamat pagi. Saatnya catat pemasukan dan rencana pengeluaran hari ini.",
      }
    : {
        title: `${APP_NAME} | Reminder Malam`,
        body: "Sebelum istirahat, cek lagi transaksi hari ini agar laporan tetap lengkap.",
      };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slot: string }> },
) {
  const { slot } = await context.params;
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (slot !== "morning" && slot !== "evening") {
    return NextResponse.json({ error: "Slot tidak valid" }, { status: 400 });
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
  const enabledColumn =
    slot === "morning" ? "reminder_morning_enabled" : "reminder_evening_enabled";

  const preferencesResult = (await admin
    .from("reminder_preferences")
    .select("user_id")
    .eq("push_enabled", true)
    .eq(enabledColumn, true)) as QueryResult<PreferenceRow[]>;

  const { data: preferences, error: preferenceError } = preferencesResult;

  if (preferenceError) {
    return NextResponse.json({ error: preferenceError.message }, { status: 500 });
  }

  const userIds = (preferences ?? []).map((item) => item.user_id);

  if (!userIds.length) {
    return NextResponse.json({ success: true, sent: 0, reason: "Tidak ada penerima aktif." });
  }

  const subscriptionsResult = (await admin
    .from("push_subscriptions")
    .select("user_id,endpoint,p256dh,auth")
    .in("user_id", userIds)) as QueryResult<SubscriptionRow[]>;

  const { data: subscriptions, error: subscriptionError } = subscriptionsResult;

  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
  }

  const reminderDate = getDateInJakarta();
  const payload = {
    ...getCopy(slot),
    url: "/dashboard",
    tag: `${slot}-${reminderDate}`,
  };

  let sent = 0;
  const removed: string[] = [];
  const failed: string[] = [];

  for (const subscription of subscriptions ?? []) {
    const logResult = (await admin
      .from("notification_logs")
      .insert({
        user_id: subscription.user_id,
        slot,
        reminder_date: reminderDate,
      })
      .select("id")
      .single()) as QueryResult<{ id: string }>;

    if (logResult.error) {
      if (logResult.error.code === "23505") {
        continue;
      }

      failed.push(subscription.endpoint);
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (error) {
      const statusCode =
        error && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;

      failed.push(subscription.endpoint);

      if (statusCode === 404 || statusCode === 410) {
        removed.push(subscription.endpoint);
      }
    }
  }

  if (removed.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", removed);
  }

  return NextResponse.json({
    success: true,
    slot,
    sent,
    removed: removed.length,
    failed: failed.length,
  });
}
