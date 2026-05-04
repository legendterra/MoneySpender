import { Panel } from "@/components/ui/panel";
import type { DashboardInsight } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClass = {
  neutral: "border-border bg-background-strong",
  good: "border-success/25 bg-success/10",
  warning: "border-warning/30 bg-warning/15",
  danger: "border-danger/25 bg-danger/10",
};

export function InsightsPanel({ insights }: { insights: DashboardInsight[] }) {
  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Insight</p>
        <h2 className="text-2xl font-bold text-foreground">Yang perlu kamu notice</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <div key={insight.title} className={cn("rounded-2xl border p-4", toneClass[insight.tone])}>
            <p className="text-sm font-bold text-foreground">{insight.title}</p>
            <p className="mt-2 text-sm leading-7 text-muted">{insight.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
