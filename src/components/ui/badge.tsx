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
        "inline-flex items-center border-l-2 border-accent pl-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
