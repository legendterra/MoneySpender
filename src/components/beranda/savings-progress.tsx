import { useLocale, useTranslations } from "next-intl";

import { formatMoney, toUiLocale } from "@/components/ui/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";

/** Monthly savings target. Renders nothing when no target is set. */
export function SavingsProgress({ saved, goal }: { saved: number; goal: number }) {
  const t = useTranslations("beranda");
  const locale = toUiLocale(useLocale());
  if (!goal || goal <= 0) return null;
  const clamped = Math.max(0, saved);
  const pct = Math.min(100, Math.round((clamped / goal) * 100));

  return (
    <section aria-labelledby="savings-heading" className="grid gap-2">
      <SectionHeader id="savings-heading" title={t("savings")} meta={`${pct}%`} />
      <ProgressBar value={clamped} max={goal} tone="income" label={t("savingsProgress")} />
      <p className="text-[12px] text-muted tabular-nums">
        {t("savingsBody", {
          saved: formatMoney(clamped, { locale }),
          goal: formatMoney(goal, { locale }),
        })}
      </p>
    </section>
  );
}
