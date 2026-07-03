import Link from "next/link";
import { Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import { getCurrentPlan } from "@/lib/billing";
import { cn } from "@/lib/utils";

type ProGateProps = {
  /** Nama fitur yang dikunci, untuk copy panel upgrade. */
  feature: string;
  children: React.ReactNode;
};

/**
 * Server component: menampilkan children untuk user Pro, atau panel ajakan
 * upgrade untuk user Free. Saat billing belum dikonfigurasi, semua user
 * dianggap Pro sehingga tidak ada yang terkunci.
 */
export async function ProGate({ feature, children }: ProGateProps) {
  const plan = await getCurrentPlan();
  if (plan === "pro") return <>{children}</>;

  return (
    <Panel className="rounded-lg p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent-strong" />
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent-strong">
            Fitur Pro
          </p>
        </div>
        <h3 className="text-xl font-bold text-foreground">{feature}</h3>
        <p className="text-sm leading-7 text-muted">
          Fitur ini tersedia di paket Pro. Upgrade untuk membukanya beserta semua
          fitur lanjutan lainnya.
        </p>
        <Link href="/pricing" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
          Lihat paket Pro
        </Link>
      </div>
    </Panel>
  );
}
