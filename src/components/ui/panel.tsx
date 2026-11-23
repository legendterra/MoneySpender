import { cn } from "@/lib/utils";

type PanelProps = React.ComponentPropsWithoutRef<"section"> & {
  padding?: "none" | "sm" | "md";
};

const paddings = { none: "", sm: "p-4", md: "p-5 md:p-6" } as const;

/** The single card surface. Never nest a Panel inside another Panel. */
export function Panel({ className, children, padding = "md", ...props }: PanelProps) {
  return (
    <section
      {...props}
      className={cn(
        "min-w-0 rounded-sheet border border-line bg-surface",
        paddings[padding],
        className,
      )}
    >
      {children}
    </section>
  );
}
