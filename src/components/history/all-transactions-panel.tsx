import type { HistoryRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function toneForType(type: HistoryRecord["type"]) {
  switch (type) {
    case "income":
      return "border-success/30 bg-success/10 text-success";
    case "expense":
      return "border-accent/20 bg-accent-soft text-accent-strong";
    case "debt":
      return "border-danger/30 bg-danger/10 text-danger";
    default:
      return "border-border bg-background text-foreground";
  }
}

export function AllTransactionsPanel({
  items,
  currencyCode,
  startIndex = 0,
}: {
  items: HistoryRecord[];
  currencyCode: string;
  startIndex?: number;
}) {
  return (
    <div className="grid gap-4">
      {items.length ? (
        items.map((item, index) => (
          <section
            key={`${item.source}-${item.id}`}
            className="rounded-[24px] border border-border bg-background-strong p-5"
          >
            <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-start">
              <div className="rounded-2xl bg-background px-4 py-3 text-sm font-bold text-foreground">
                {startIndex + index + 1}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneForType(item.type)}`}>
                    {item.statusLabel}
                  </span>
                  <span className="text-xs text-muted">{formatDate(item.date)}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted">{item.subtitle}</p>
                {item.detail ? (
                  <p className="text-xs leading-6 text-muted">{item.detail.replaceAll("â€¢", "|")}</p>
                ) : null}
              </div>
              <div className="text-left md:text-right">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Nominal</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(item.amount, currencyCode)}
                </p>
              </div>
            </div>
          </section>
        ))
      ) : (
        <section className="rounded-[24px] border border-dashed border-border bg-background-strong p-6 text-sm leading-7 text-muted">
          Tidak ada data yang cocok dengan filter ini.
        </section>
      )}
    </div>
  );
}
