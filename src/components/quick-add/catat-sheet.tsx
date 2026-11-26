"use client";

import {
  CatatBody,
  CatatFooter,
  CatatModeSwitch,
  useCatatForm,
  type CatatPreset,
} from "@/components/quick-add/catat-form";
import type { CatatData, CatatEditing, CatatMode } from "@/components/quick-add/types";
import { Sheet } from "@/components/ui/sheet";
import type { HistoryEntry } from "@/lib/history";

export function CatatSheet({
  open,
  onOpenChange,
  data,
  initialMode = "expense",
  demo = false,
  preset,
  editing = null,
  inline = false,
  layoutId = "catat-mode",
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CatatData;
  initialMode?: CatatMode;
  /** Gallery/demo: never talks to Supabase. */
  demo?: boolean;
  preset?: CatatPreset;
  /** Edit an existing row (Riwayat, Hutang) instead of recording a new one. */
  editing?: CatatEditing | null;
  /** Render in place (UI gallery). */
  inline?: boolean;
  layoutId?: string;
  /** Called after a successful save with the saved row (null when it could not be read back). */
  onRecorded?: (entry: HistoryEntry | null, options: { isNew: boolean }) => void;
}) {
  const form = useCatatForm({
    data,
    initialMode,
    demo,
    preset,
    editing,
    onSaved: () => onOpenChange(false),
    onRecorded,
  });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? form.tr("edit.title") : form.t("title")}
      hideTitle
      inline={inline}
      headerAction={<CatatModeSwitch form={form} layoutId={layoutId} />}
      footer={<CatatFooter form={form} />}
      size="md"
    >
      <CatatBody form={form} layoutId={layoutId} captureKeyboard={!inline} />
    </Sheet>
  );
}
