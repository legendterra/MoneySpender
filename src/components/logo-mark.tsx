import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="grid size-12 place-items-center rounded-[1.05rem] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-base font-black text-white shadow-[0_15px_35px_rgba(57,74,216,0.32)]"
        aria-hidden="true"
      >
        MS
      </div>
      <div className="grid leading-tight">
        <span className="text-[11px] font-black uppercase text-accent-strong">
          Money Report
        </span>
        <span className="text-xl font-black text-foreground">
          MoneySpender
        </span>
      </div>
    </div>
  );
}
