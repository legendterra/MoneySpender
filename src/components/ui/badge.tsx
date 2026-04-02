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
        "inline-flex items-center rounded-full border border-border bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong",
        className,
      )}
    >
      {children}
    </span>
  );
}
