import Link from "next/link";
import { CreditCard } from "lucide-react";

import { ManageBillingButton } from "@/components/billing/upgrade-button";
import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import { getCurrentPlan } from "@/lib/billing";
import { billingEnabled } from "@/lib/stripe";
import { cn } from "@/lib/utils";

/** Panel status langganan di halaman Settings. Tidak tampil saat billing nonaktif. */
export async function BillingPanel() {
  if (!billingEnabled()) return null;
  const plan = await getCurrentPlan();

  return (
    <Panel className="rounded-lg p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-accent-strong" />
          <h3 className="text-lg font-bold text-foreground">Langganan</h3>
        </div>
        <p className="text-sm leading-7 text-muted">
          Paket saat ini:{" "}
          <span className="font-semibold text-foreground">
            {plan === "pro" ? "Pro" : "Free"}
          </span>
        </p>
        {plan === "pro" ? (
          <ManageBillingButton>Kelola langganan & pembayaran</ManageBillingButton>
        ) : (
          <Link href="/pricing" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
            Upgrade ke Pro
          </Link>
        )}
      </div>
    </Panel>
  );
}
