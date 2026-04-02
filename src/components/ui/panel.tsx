import { cn } from "@/lib/utils";

type PanelProps = React.ComponentPropsWithoutRef<"section">;

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <section
      {...props}
      className={cn(
        "glass-panel rounded-[28px] border border-border/80 p-5 shadow-[var(--shadow-soft)] md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
