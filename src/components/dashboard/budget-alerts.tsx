import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import type { BudgetAlert } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function BudgetAlerts({
  alerts,
  currencyCode,
}: {
  alerts: BudgetAlert[];
  currencyCode: string;
}) {
  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Budget alert</p>
        <h2 className="text-2xl font-bold text-foreground">Kategori yang perlu dijaga</h2>
      </div>
      <div className="grid gap-3">
        {alerts.length ? (
          alerts.slice(0, 5).map((alert) => {
            const danger = alert.status === "over";
            const warning = alert.status === "warning";
            const Icon = danger || warning ? AlertTriangle : CheckCircle2;

            return (
              <div key={alert.categoryId ?? alert.categoryName} className="rounded-2xl border border-border bg-background-strong p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{alert.categoryName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatCurrency(alert.spent, currencyCode)} / {formatCurrency(alert.budget, currencyCode)}
                    </p>
                  </div>
                  <div className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold", danger ? "bg-danger/10 text-danger" : warning ? "bg-warning/15 text-warning" : "bg-success/10 text-success")}>
                    <Icon className="size-3.5" />
                    {alert.ratio}%
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-background">
                  <div
                    className={cn("h-2 rounded-full", danger ? "bg-danger" : warning ? "bg-warning" : "bg-success")}
                    style={{ width: `${Math.min(100, alert.ratio)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm leading-7 text-muted">
            Belum ada budget. Set di Settings supaya dashboard bisa kasih warning.
          </div>
        )}
      </div>
    </Panel>
  );
}
