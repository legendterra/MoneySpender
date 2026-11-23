"use client";

import {
  CatatBody,
  CatatFooter,
  CatatModeSwitch,
  useCatatForm,
  type CatatPreset,
} from "@/components/quick-add/catat-form";
import type { CatatData, CatatMode } from "@/components/quick-add/types";
import { Sheet } from "@/components/ui/sheet";

export function CatatSheet({
  open,
  onOpenChange,
  data,
  initialMode = "expense",
  demo = false,
  preset,
  inline = false,
  layoutId = "catat-mode",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CatatData;
  initialMode?: CatatMode;
  /** Gallery/demo: never talks to Supabase. */
  demo?: boolean;
  preset?: CatatPreset;
  /** Render in place (UI gallery). */
  inline?: boolean;
  layoutId?: string;
}) {
  const form = useCatatForm({
    data,
    initialMode,
    demo,
    preset,
    onSaved: () => onOpenChange(false),
  });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={form.t("title")}
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
