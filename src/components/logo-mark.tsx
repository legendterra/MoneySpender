import Image from "next/image";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative size-11 overflow-hidden rounded-full border border-white/70 bg-white shadow-[0_12px_30px_rgba(34,90,170,0.22)]">
        <Image
          src="/logo-circular.png"
          alt="Logo MoneySpender"
          fill
          sizes="44px"
          className="object-cover"
          priority
        />
      </div>
      <div className="grid leading-tight">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-strong/85">
          Financial Clarity
        </span>
        <span className="text-lg font-bold text-foreground">MoneySpender</span>
      </div>
    </div>
  );
}
