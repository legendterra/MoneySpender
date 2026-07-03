import { NextResponse, type NextRequest } from "next/server";

import { filterProUserIds } from "@/lib/billing";
import { APP_TIMEZONE } from "@/lib/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function getJakartaDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return { monthValue: `${year}-${month}`, day: Number(day), date: `${year}-${month}-${day}` };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminSupabaseClient() as any;
  const { monthValue, day, date } = getJakartaDateParts();
  const { data: rules, error } = await admin
    .from("recurring_transactions")
    .select("id,user_id,type,category_id,category_label,amount,reason,merchant,payment_method,day_of_month,last_generated_month")
    .eq("is_active", true)
    .lte("day_of_month", Math.min(day, 28))
    .or(`last_generated_month.is.null,last_generated_month.neq.${monthValue}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transaksi berulang adalah fitur Pro — saat billing aktif, hanya proses
  // rule milik user Pro.
  const proIds = await filterProUserIds(
    admin,
    (rules ?? []).map((rule: { user_id: string }) => rule.user_id),
  );
  const eligibleRules = (rules ?? []).filter((rule: { user_id: string }) => proIds.has(rule.user_id));

  let generated = 0;

  for (const rule of eligibleRules) {
    const { error: insertError } = await admin.from("transactions").insert({
      user_id: rule.user_id,
      type: rule.type,
      category_id: rule.category_id,
      category_label: rule.category_label,
      amount: rule.amount,
      reason: rule.reason,
      merchant: rule.merchant,
      payment_method: rule.payment_method,
      transaction_date: date,
    });

    if (!insertError) {
      generated += 1;
      await admin.from("recurring_transactions").update({ last_generated_month: monthValue }).eq("id", rule.id);
      await admin.from("audit_logs").insert({
        user_id: rule.user_id,
        action: "auto_recurring_generated",
        metadata: { recurring_id: rule.id, month: monthValue },
      });
    }
  }

  return NextResponse.json({ success: true, generated });
}
