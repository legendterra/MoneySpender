import { NextResponse, type NextRequest } from "next/server";

import { generateRecurringTransactions } from "@/lib/recurring";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await generateRecurringTransactions(createAdminSupabaseClient());
    if (report.errors.length) console.error("recurring cron finished with errors:", report.errors);
    return NextResponse.json({ success: report.errors.length === 0, ...report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
