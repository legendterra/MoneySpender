import { cn } from "@/lib/utils";

export function LogoMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <div
        className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary text-[12px] font-extrabold tracking-tight text-on-primary"
        aria-hidden="true"
      >
        MS
      </div>
      {!compact ? (
        <span className="truncate text-[15px] font-bold tracking-tight text-text">MoneySpender</span>
      ) : null}
    </div>
  );
}
