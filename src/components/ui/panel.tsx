import { cn } from "@/lib/utils";

type PanelProps = React.ComponentPropsWithoutRef<"section">;

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <section
      {...props}
      className={cn(
        "glass-panel min-w-0 rounded-lg p-5 md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
