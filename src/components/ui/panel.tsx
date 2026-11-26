import { cn } from "@/lib/utils";

type PanelProps = React.ComponentPropsWithoutRef<"section"> & {
  padding?: "none" | "sm" | "md";
  /** A thin divider above the section, to separate it from the previous one. */
  divided?: boolean;
};

const paddings = { none: "", sm: "py-2", md: "py-3" } as const;

/**
 * A page section. Flat by design (PLAN.md section 3, owner rule): no border,
 * no fill, no radius. Structure comes from typography, whitespace and thin
 * dividers; only sheets, inputs, buttons and the keypad have surfaces.
 */
export function Panel({ className, children, padding = "md", divided = false, ...props }: PanelProps) {
  return (
    <section
      {...props}
      className={cn("min-w-0", paddings[padding], divided && "border-t border-line pt-5", className)}
    >
      {children}
    </section>
  );
}
