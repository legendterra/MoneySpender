import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "primary" | "income" | "expense" | "debt" | "transfer";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary-ink",
  income: "bg-income-soft text-income",
  expense: "bg-expense-soft text-expense",
  debt: "bg-debt-soft text-debt",
  transfer: "bg-transfer-soft text-transfer",
};

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
