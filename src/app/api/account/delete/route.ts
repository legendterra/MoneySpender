import { NextResponse } from "next/server";

import { billingEnabled, cancelSubscription } from "@/lib/lemonsqueezy";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminSupabaseClient() as any;

    // Batalkan langganan berbayar dulu — kalau tidak, kartu user tetap
    // ditagih meski akun & datanya sudah dihapus dari aplikasi.
    if (billingEnabled()) {
      const { data: subscription } = await admin
        .from("subscriptions")
        .select("provider_subscription_id,status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        subscription?.provider_subscription_id &&
        !["cancelled", "expired"].includes(subscription.status)
      ) {
        try {
          await cancelSubscription(subscription.provider_subscription_id);
        } catch (error) {
          console.error("Gagal membatalkan langganan sebelum hapus akun:", error);
          return NextResponse.json(
            {
              error:
                "Gagal membatalkan langganan aktif. Coba lagi, atau batalkan dulu lewat menu Kelola Langganan.",
            },
            { status: 502 },
          );
        }
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Akun belum bisa dihapus." },
      { status: 500 },
    );
  }
}
