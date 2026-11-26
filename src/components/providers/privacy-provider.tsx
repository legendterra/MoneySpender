"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { IconButton } from "@/components/ui/icon-button";
import { toUiLocale, type UiLocale } from "@/components/ui/format";

const STORAGE_KEY = "moneyspender.privacy.mask.v1";

type PrivacyContextValue = {
  masked: boolean;
  toggle: () => void;
  setMasked: (next: boolean) => void;
};

const PrivacyContext = React.createContext<PrivacyContextValue>({
  masked: false,
  toggle: () => {},
  setMasked: () => {},
});

export function maskMoney(locale: UiLocale = "id") {
  return locale === "en" ? "IDR ••••••" : "Rp••••••";
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [masked, setMaskedState] = React.useState(false);

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setMaskedState(true);
    } catch {
      // Ignore blocked storage.
    }
  }, []);

  const setMasked = React.useCallback((next: boolean) => {
    setMaskedState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore blocked storage.
    }
  }, []);

  const toggle = React.useCallback(() => {
    setMasked(!masked);
  }, [masked, setMasked]);

  const value = React.useMemo(() => ({ masked, toggle, setMasked }), [masked, toggle, setMasked]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacyMask() {
  return React.useContext(PrivacyContext);
}

/** Eye / EyeOff button to hide all balances and amounts on screen. */
export function PrivacyToggle({ className }: { className?: string }) {
  const { masked, toggle } = usePrivacyMask();
  const locale = toUiLocale(useLocale());
  const ui = useTranslations("ui");
  const label = masked
    ? ui.has("privacyShow")
      ? ui("privacyShow")
      : locale === "en"
        ? "Show amounts"
        : "Tampilkan nominal"
    : ui.has("privacyHide")
      ? ui("privacyHide")
      : locale === "en"
        ? "Hide amounts"
        : "Sembunyikan nominal";

  return (
    <IconButton label={label} aria-pressed={masked} onClick={toggle} className={className}>
      {masked ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </IconButton>
  );
}
