import { cn } from "@/lib/utils";

export type ProgressTone = "primary" | "income" | "expense" | "debt" | "transfer" | "auto";

const fills: Record<Exclude<ProgressTone, "auto">, string> = {
  primary: "bg-meter",
  income: "bg-income",
  expense: "bg-expense",
  debt: "bg-debt",
  transfer: "bg-transfer",
};

/** auto: primary below 80%, debt (amber) from 80%, expense (red) from 100%. */
export function progressToneFor(ratio: number): Exclude<ProgressTone, "auto"> {
  if (ratio >= 1) return "expense";
  if (ratio >= 0.8) return "debt";
  return "primary";
}

export function ProgressBar({
  value,
  max = 100,
  tone = "auto",
  label,
  size = "md",
  className,
}: {
  value: number;
  max?: number;
  tone?: ProgressTone;
  /** Accessible name, e.g. "Budget Makan terpakai". */
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const ratio = max > 0 ? value / max : 0;
  const pct = Math.max(0, Math.min(100, ratio * 100));
  const resolved = tone === "auto" ? progressToneFor(ratio) : tone;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, ratio * 100))}
      className={cn(
        "w-full overflow-hidden rounded-full bg-surface-2",
        size === "sm" ? "h-1.5" : "h-2",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fills[resolved])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
