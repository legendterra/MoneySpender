import { cn } from "@/lib/utils";

/** Label + control + hint/error. Wraps the control in a <label> so clicks focus it. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  /** Short text such as "opsional" shown after the label. */
  optional?: string;
}) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="flex items-baseline gap-2 text-[13px] font-semibold text-text">
        {label}
        {optional ? <span className="font-medium text-muted">{optional}</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-xs font-medium text-expense">
          {error}
        </span>
      ) : null}
      {!error && hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
