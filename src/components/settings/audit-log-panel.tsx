import { Panel } from "@/components/ui/panel";
import type { AuditLog } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function AuditLogPanel({ logs }: { logs: AuditLog[] }) {
  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Aktivitas</p>
        <h2 className="text-2xl font-bold text-foreground">Log penting akun</h2>
      </div>
      <div className="grid gap-3">
        {logs.length ? (
          logs.map((log) => (
            <div key={log.id} className="rounded-md border border-border bg-background-strong p-4">
              <p className="text-sm font-bold text-foreground">{log.action.replaceAll("_", " ")}</p>
              <p className="mt-1 text-xs text-muted">{formatDate(log.created_at)}</p>
              <p className="mt-2 text-xs leading-6 text-muted">{JSON.stringify(log.metadata)}</p>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
            Belum ada aktivitas penting.
          </div>
        )}
      </div>
    </Panel>
  );
}
