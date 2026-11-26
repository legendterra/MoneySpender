"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  const t = useTranslations("offline");
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      <RotateCw aria-hidden="true" />
      {t("retry")}
    </Button>
  );
}
