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
        <span className="text-xs font-black uppercase text-muted">
          Filter Bulan
        </span>
        <input
          type="month"
          name="month"
          defaultValue={monthValue}
          className="min-h-12 rounded-2xl border border-[rgba(108,120,158,0.24)] bg-white/36 px-4 py-3 text-sm font-medium text-foreground outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:bg-white/8"
        />
      </label>
      <button type="submit" className={cn(buttonVariants({ variant: "primary", size: "md" }))}>
        Terapkan
      </button>
    </form>
  );
}
