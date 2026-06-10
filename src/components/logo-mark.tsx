import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className="grid size-10 shrink-0 place-items-center rounded-sm bg-accent text-sm font-black text-white"
        aria-hidden="true"
      >
        MS
      </div>
      <div className="grid leading-tight">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Personal finance
        </span>
        <span className="truncate text-lg font-bold tracking-tight text-foreground">
          MoneySpender
        </span>
      </div>
    </div>
  );
}
