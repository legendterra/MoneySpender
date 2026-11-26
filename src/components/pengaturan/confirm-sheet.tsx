"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";

/**
 * Confirmation for destructive actions. With `typeToConfirm`, the confirm button
 * stays disabled until the user types that exact word (irreversible actions).
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  typeToConfirm,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  typeToConfirm?: string;
  busy?: boolean;
}) {
  const t = useTranslations("pengaturan");
  const [typed, setTyped] = React.useState("");
  const inputId = React.useId();
  const ready = !typeToConfirm || typed.trim().toUpperCase() === typeToConfirm.toUpperCase();

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={!ready || busy} isLoading={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 pt-1 text-[14px] leading-6 text-text">
        <div className="grid gap-2">{body}</div>
        {typeToConfirm ? (
          <label htmlFor={inputId} className="grid gap-1.5">
            <span className="text-[13px] font-semibold text-text">{t("typeToConfirm", { word: typeToConfirm })}</span>
            <Input
              id={inputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
        ) : null}
      </div>
    </Sheet>
  );
}
