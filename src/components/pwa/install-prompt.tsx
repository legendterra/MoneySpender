"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPrompt() {
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

  if (!promptEvent || hidden) {
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
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-[24px] border border-border bg-background p-4 shadow-[0_18px_45px_rgba(30,41,59,0.16)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-white">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Pasang MoneySpender</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Buka lebih cepat dari home screen dan tetap bisa dipakai saat sinyal drop.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void installApp()}>
              Pasang
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setHidden(true)}>
              Nanti
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Tutup prompt install"
          className="grid size-8 place-items-center rounded-full text-muted hover:bg-background-strong hover:text-foreground"
          onClick={() => setHidden(true)}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
