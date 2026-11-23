"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const HIDDEN_PREFIXES = ["/auth", "/offline", "/reset-password", "/onboarding", "/dev"];

export function InstallPrompt() {
  const pathname = usePathname();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!promptEvent || hidden || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  async function installApp() {
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    if (choice.outcome === "accepted") {
      setPromptEvent(null);
    }
  }

  return (
    <div className="fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-sheet border border-line bg-surface p-4 shadow-pop lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-primary text-on-primary">
          <Download className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">Pasang MoneySpender</p>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Buka lebih cepat dari layar utama dan tetap bisa dipakai saat sinyal hilang.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void installApp()}>
              Pasang
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
              Nanti
            </Button>
          </div>
        </div>
        <IconButton label="Tutup" size="sm" className="-mr-1 -mt-1" onClick={() => setHidden(true)}>
          <X aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
