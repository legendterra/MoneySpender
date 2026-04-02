import Image from "next/image";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative size-11 overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-[0_12px_30px_rgba(88,136,255,0.18)]">
        <Image
          src="/logo-placeholder.svg"
          alt="Logo placeholder"
          fill
          sizes="44px"
          className="object-cover"
          priority
        />
      </div>
      <div className="grid">
        <span className="text-sm font-semibold uppercase tracking-[0.22em] text-accent-strong">
          Placeholder
        </span>
        <span className="text-lg font-bold text-foreground">MoneySpender</span>
      </div>
    </div>
  );
}
