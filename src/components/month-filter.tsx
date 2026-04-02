import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export function MonthFilter({
  monthValue,
  actionPath,
}: {
  monthValue: string;
  actionPath: string;
}) {
  return (
    <form action={actionPath} className="glass-panel flex flex-wrap items-center gap-3 rounded-[24px] p-3">
      <label className="grid gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Filter Bulan
        </span>
        <input
          type="month"
          name="month"
          defaultValue={monthValue}
          className="min-h-12 rounded-2xl border border-border bg-background-strong px-4 py-3 text-sm text-foreground outline-none"
        />
      </label>
      <button type="submit" className={cn(buttonVariants({ variant: "primary", size: "md" }))}>
        Terapkan
      </button>
    </form>
  );
}
