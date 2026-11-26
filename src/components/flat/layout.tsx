import { cn } from "@/lib/utils";

// Flat layout pieces (no cards): a titled block and divider rows.

/** Heading + optional description and action, content directly on the page background. */
export function FlatSection({
  id,
  title,
  description,
  action,
  children,
  className,
  as: Heading = "h2",
}: {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("grid min-w-0 content-start gap-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <Heading id={headingId} className="text-[17px] font-semibold tracking-tight text-text">
            {title}
          </Heading>
          {description ? <p className="text-[13px] leading-5 text-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Small uppercase label used above big numbers. */
export function Eyebrow({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <p id={id} className={cn("text-[11px] font-semibold tracking-[0.08em] text-muted uppercase", className)}>
      {children}
    </p>
  );
}

/** Plain rows separated by 1px dividers (top and bottom edge included). */
export function Rows({ children, className, ...props }: React.ComponentPropsWithoutRef<"ul">) {
  return (
    <ul {...props} className={cn("divide-y divide-line border-y border-line", className)}>
      {children}
    </ul>
  );
}
