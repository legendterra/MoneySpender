import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[rgba(108,120,158,0.24)] bg-white/30 px-3 py-1 text-xs font-black text-accent-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] dark:bg-white/8",
        className,
      )}
    >
      {children}
    </span>
  );
}
