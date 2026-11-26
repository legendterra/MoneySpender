import { cn } from "@/lib/utils";

/**
 * One Pengaturan section (its own route). Flat: heading, description and
 * content on the page background, rows separated by 1px dividers.
 */
export function SettingsSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("grid min-w-0 content-start gap-4", className)}>
      <header className="flex items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <h2 id={`${id}-title`} className="text-[22px] leading-tight font-bold tracking-tight text-text">
            {title}
          </h2>
          {description ? <p className="max-w-prose text-[14px] leading-6 text-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Label + hint on the left, control on the right. Use inside `divide-y divide-line`. */
export function SettingRow({
  label,
  hint,
  control,
  htmlFor,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  control?: React.ReactNode;
  /** Id of the control, so clicking the label focuses/toggles it. */
  htmlFor?: string;
  className?: string;
  /** Extra content under the row (e.g. a wide control on mobile). */
  children?: React.ReactNode;
}) {
  const LabelTag = htmlFor ? "label" : "span";
  return (
    <div className={cn("grid gap-3 py-4", className)}>
      <div className="flex min-h-11 items-center gap-4">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <LabelTag htmlFor={htmlFor} className="text-[15px] font-medium text-text">
            {label}
          </LabelTag>
          {hint ? <span className="text-[13px] leading-5 text-muted">{hint}</span> : null}
        </div>
        {control ? <div className="flex shrink-0 items-center">{control}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Formats a Supabase write error so it names the operation, table and column. */
export function writeError(operation: string, target: string, error: { message: string; code?: string | null }) {
  return `Supabase ${operation} on "${target}" failed${error.code ? ` [${error.code}]` : ""}: ${error.message}`;
}
